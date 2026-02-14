import Foundation

struct RecoveryInput {
    let hrv: Double?
    let restingHeartRate: Double?
    let sleepPerformance: Double?
    let respiratoryRate: Double?
    let spo2: Double?
}

struct RecoveryBaselines {
    let hrv: BaselineResult?
    let restingHeartRate: BaselineResult?
    let sleepPerformance: BaselineResult?
    let respiratoryRate: BaselineResult?
    let spo2: BaselineResult?
}

struct RecoveryResult {
    let score: Double
    let zone: RecoveryZone
    let hrvScore: Double?
    let rhrScore: Double?
    let sleepScore: Double?
    let respRateScore: Double?
    let spo2Score: Double?
    let contributorCount: Int
}

struct RecoveryEngine {
    /// Sigmoid function mapping z-score to 0-100.
    /// z=0 → 50, z=+2 → ~88, z=-2 → ~12
    static func sigmoid(_ z: Double, steepness: Double = 1.5) -> Double {
        return 100.0 / (1.0 + exp(-steepness * z))
    }

    /// Compute recovery score from current metrics and personal baselines.
    static func computeRecovery(input: RecoveryInput, baselines: RecoveryBaselines) -> RecoveryResult {
        var totalWeight: Double = 0
        var weightedSum: Double = 0
        var contributorCount = 0

        // HRV: higher is better
        let hrvScore: Double? = computeContributor(
            value: input.hrv,
            baseline: baselines.hrv,
            invert: false,
            weight: HealthKitConstants.recoveryHRVWeight,
            totalWeight: &totalWeight,
            weightedSum: &weightedSum,
            contributorCount: &contributorCount
        )

        // RHR: lower is better (invert z-score)
        let rhrScore: Double? = computeContributor(
            value: input.restingHeartRate,
            baseline: baselines.restingHeartRate,
            invert: true,
            weight: HealthKitConstants.recoveryRHRWeight,
            totalWeight: &totalWeight,
            weightedSum: &weightedSum,
            contributorCount: &contributorCount
        )

        // Sleep Performance: higher is better
        let sleepScore: Double? = computeContributor(
            value: input.sleepPerformance,
            baseline: baselines.sleepPerformance,
            invert: false,
            weight: HealthKitConstants.recoverySleepWeight,
            totalWeight: &totalWeight,
            weightedSum: &weightedSum,
            contributorCount: &contributorCount
        )

        // Respiratory Rate: lower is better at rest (invert)
        let respRateScore: Double? = computeContributor(
            value: input.respiratoryRate,
            baseline: baselines.respiratoryRate,
            invert: true,
            weight: HealthKitConstants.recoveryRespRateWeight,
            totalWeight: &totalWeight,
            weightedSum: &weightedSum,
            contributorCount: &contributorCount
        )

        // SpO2: higher is better
        let spo2Score: Double? = computeContributor(
            value: input.spo2,
            baseline: baselines.spo2,
            invert: false,
            weight: HealthKitConstants.recoverySpO2Weight,
            totalWeight: &totalWeight,
            weightedSum: &weightedSum,
            contributorCount: &contributorCount
        )

        // Normalize by actual weights used
        let rawScore: Double
        if totalWeight > 0 {
            rawScore = weightedSum / totalWeight
        } else {
            rawScore = 50.0 // Default when no data available
        }

        let finalScore = rawScore.clamped(to: 1...99)
        let zone = RecoveryZone.from(score: finalScore)

        return RecoveryResult(
            score: finalScore,
            zone: zone,
            hrvScore: hrvScore,
            rhrScore: rhrScore,
            sleepScore: sleepScore,
            respRateScore: respRateScore,
            spo2Score: spo2Score,
            contributorCount: contributorCount
        )
    }

    private static func computeContributor(
        value: Double?,
        baseline: BaselineResult?,
        invert: Bool,
        weight: Double,
        totalWeight: inout Double,
        weightedSum: inout Double,
        contributorCount: inout Int
    ) -> Double? {
        guard let value, let baseline, baseline.isValid else { return nil }

        var z = BaselineEngine.zScore(value: value, baseline: baseline)
        if invert { z = -z }

        let score = sigmoid(z)
        totalWeight += weight
        weightedSum += score * weight
        contributorCount += 1

        return score
    }

    /// Generate strain target based on recovery zone
    static func strainTarget(for zone: RecoveryZone) -> ClosedRange<Double> {
        switch zone {
        case .green: return 14.0...18.0
        case .yellow: return 8.0...13.9
        case .red: return 2.0...7.9
        }
    }

    /// Generate recovery insight text
    static func generateInsight(result: RecoveryResult, input: RecoveryInput, baselines: RecoveryBaselines) -> String {
        var insights: [String] = []

        if let hrv = input.hrv, let baseline = baselines.hrv {
            let pctChange = ((hrv - baseline.mean) / baseline.mean) * 100
            if abs(pctChange) > 10 {
                let direction = pctChange > 0 ? "above" : "below"
                insights.append("HRV was \(abs(Int(pctChange)))% \(direction) your baseline")
            }
        }

        if let rhr = input.restingHeartRate, let baseline = baselines.restingHeartRate {
            let delta = rhr - baseline.mean
            if abs(delta) > 3 {
                let direction = delta > 0 ? "elevated by" : "lower by"
                insights.append("RHR was \(direction) \(abs(Int(delta))) BPM")
            }
        }

        if let sleepPerf = input.sleepPerformance {
            if sleepPerf >= 95 {
                insights.append("you got \(Int(sleepPerf))% of your sleep need")
            } else if sleepPerf < 70 {
                insights.append("you only got \(Int(sleepPerf))% of your sleep need")
            }
        }

        let prefix = "Your Recovery is \(Int(result.score))% (\(result.zone.label)). "
        if insights.isEmpty {
            return prefix + "Your metrics are within normal range."
        }
        return prefix + insights.joined(separator: ", and ") + "."
    }
}

extension BaselineResult {
    var isValid: Bool {
        sampleCount >= HealthKitConstants.minimumBaselineSamples && standardDeviation > 0
    }
}
