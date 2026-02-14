import Foundation
import HealthKit

struct SleepAnalysisResult {
    let mainSleep: SleepSessionData?
    let naps: [SleepSessionData]
    let totalSleepHours: Double
    let sleepNeedHours: Double
    let sleepPerformance: Double
    let sleepDebtHours: Double
}

struct SleepSessionData {
    let startDate: Date
    let endDate: Date
    let totalSleepMinutes: Double
    let timeInBedMinutes: Double
    let lightMinutes: Double
    let deepMinutes: Double
    let remMinutes: Double
    let awakeMinutes: Double
    let awakenings: Int
    let sleepOnsetLatencyMinutes: Double?
    let sleepEfficiency: Double
    let stages: [SleepStageData]
}

struct SleepStageData {
    let type: SleepStageType
    let startDate: Date
    let endDate: Date
    let durationMinutes: Double
}

struct SleepEngine {
    /// Parse HealthKit sleep category samples into structured sleep sessions.
    static func parseSleepSamples(_ samples: [HKCategorySample]) -> [SleepSessionData] {
        guard !samples.isEmpty else { return [] }

        // Sort by start date
        let sorted = samples.sorted { $0.startDate < $1.startDate }

        // Group into sessions using gap tolerance
        var sessions: [[HKCategorySample]] = []
        var currentSession: [HKCategorySample] = [sorted[0]]

        for i in 1..<sorted.count {
            let gap = sorted[i].startDate.timeIntervalSince(sorted[i - 1].endDate)
            if gap < HealthKitConstants.sleepSessionGapToleranceMinutes * 60 {
                currentSession.append(sorted[i])
            } else {
                sessions.append(currentSession)
                currentSession = [sorted[i]]
            }
        }
        sessions.append(currentSession)

        return sessions.compactMap { buildSessionData(from: $0) }
    }

    /// Identify main sleep and naps from parsed sessions.
    static func classifySessions(_ sessions: [SleepSessionData]) -> (main: SleepSessionData?, naps: [SleepSessionData]) {
        guard !sessions.isEmpty else { return (nil, []) }

        // Main sleep is the longest session
        let sorted = sessions.sorted { $0.totalSleepMinutes > $1.totalSleepMinutes }
        let main = sorted.first
        let naps = Array(sorted.dropFirst()).filter {
            $0.totalSleepMinutes >= HealthKitConstants.minimumSleepDurationMinutes &&
            $0.totalSleepMinutes <= HealthKitConstants.maximumNapDurationHours * 60
        }

        return (main, naps)
    }

    /// Compute Sleep Need for tonight.
    static func computeSleepNeed(
        baselineHours: Double,
        todayStrain: Double,
        sleepDebtHours: Double,
        napHoursToday: Double
    ) -> Double {
        let strainSupplement: Double
        switch todayStrain {
        case ..<8: strainSupplement = 0
        case 8..<14: strainSupplement = 0.25
        case 14..<18: strainSupplement = 0.5
        default: strainSupplement = 0.75
        }

        let debtRepayment = sleepDebtHours * 0.2
        let napCredit = Swift.min(napHoursToday, HealthKitConstants.napCreditCapHours)

        return baselineHours + strainSupplement + debtRepayment - napCredit
    }

    /// Compute Sleep Performance.
    static func computeSleepPerformance(actualSleepHours: Double, sleepNeedHours: Double) -> Double {
        guard sleepNeedHours > 0 else { return 0 }
        return ((actualSleepHours / sleepNeedHours) * 100).clamped(to: 0...100)
    }

    /// Compute accumulated sleep debt over past 7 days.
    static func computeSleepDebt(pastWeekSleepHours: [Double], pastWeekSleepNeeds: [Double]) -> Double {
        var debt: Double = 0
        for i in 0..<Swift.min(pastWeekSleepHours.count, pastWeekSleepNeeds.count) {
            let deficit = pastWeekSleepNeeds[i] - pastWeekSleepHours[i]
            debt += Swift.max(0, deficit)
        }
        return debt
    }

    /// Full analysis for a date range.
    static func analyze(
        samples: [HKCategorySample],
        baselineSleepHours: Double,
        todayStrain: Double,
        pastWeekSleepHours: [Double],
        pastWeekSleepNeeds: [Double]
    ) -> SleepAnalysisResult {
        let sessions = parseSleepSamples(samples)
        let (main, naps) = classifySessions(sessions)

        let totalMainSleep = main?.totalSleepMinutes ?? 0
        let napHours = naps.reduce(0) { $0 + $1.totalSleepMinutes } / 60.0
        let totalSleepHours = (totalMainSleep / 60.0) + napHours

        let sleepDebt = computeSleepDebt(pastWeekSleepHours: pastWeekSleepHours, pastWeekSleepNeeds: pastWeekSleepNeeds)
        let sleepNeed = computeSleepNeed(
            baselineHours: baselineSleepHours,
            todayStrain: todayStrain,
            sleepDebtHours: sleepDebt,
            napHoursToday: napHours
        )
        let performance = computeSleepPerformance(actualSleepHours: totalSleepHours, sleepNeedHours: sleepNeed)

        return SleepAnalysisResult(
            mainSleep: main,
            naps: naps,
            totalSleepHours: totalSleepHours,
            sleepNeedHours: sleepNeed,
            sleepPerformance: performance,
            sleepDebtHours: sleepDebt
        )
    }

    // MARK: - Private

    private static func buildSessionData(from samples: [HKCategorySample]) -> SleepSessionData? {
        guard let first = samples.first, let last = samples.last else { return nil }

        let startDate = first.startDate
        let endDate = last.endDate
        let timeInBed = endDate.timeIntervalSince(startDate) / 60.0

        var lightMinutes = 0.0
        var deepMinutes = 0.0
        var remMinutes = 0.0
        var awakeMinutes = 0.0
        var awakenings = 0
        var stages: [SleepStageData] = []
        var firstSleepDate: Date?

        for sample in samples {
            let duration = sample.endDate.timeIntervalSince(sample.startDate) / 60.0
            let stageType: SleepStageType

            switch sample.value {
            case HKCategoryValueSleepAnalysis.asleepCore.rawValue:
                lightMinutes += duration
                stageType = .light
                if firstSleepDate == nil { firstSleepDate = sample.startDate }
            case HKCategoryValueSleepAnalysis.asleepDeep.rawValue:
                deepMinutes += duration
                stageType = .deep
                if firstSleepDate == nil { firstSleepDate = sample.startDate }
            case HKCategoryValueSleepAnalysis.asleepREM.rawValue:
                remMinutes += duration
                stageType = .rem
                if firstSleepDate == nil { firstSleepDate = sample.startDate }
            case HKCategoryValueSleepAnalysis.awake.rawValue:
                awakeMinutes += duration
                awakenings += 1
                stageType = .awake
            case HKCategoryValueSleepAnalysis.inBed.rawValue:
                stageType = .inBed
            default:
                // Legacy asleep value
                lightMinutes += duration
                stageType = .light
                if firstSleepDate == nil { firstSleepDate = sample.startDate }
            }

            stages.append(SleepStageData(
                type: stageType,
                startDate: sample.startDate,
                endDate: sample.endDate,
                durationMinutes: duration
            ))
        }

        let totalSleep = lightMinutes + deepMinutes + remMinutes
        guard totalSleep >= HealthKitConstants.minimumSleepDurationMinutes else { return nil }

        let onsetLatency: Double?
        if let inBedSample = samples.first(where: { $0.value == HKCategoryValueSleepAnalysis.inBed.rawValue }),
           let firstSleep = firstSleepDate {
            onsetLatency = firstSleep.timeIntervalSince(inBedSample.startDate) / 60.0
        } else {
            onsetLatency = nil
        }

        let efficiency = timeInBed > 0 ? (totalSleep / timeInBed) * 100 : 0

        return SleepSessionData(
            startDate: startDate,
            endDate: endDate,
            totalSleepMinutes: totalSleep,
            timeInBedMinutes: timeInBed,
            lightMinutes: lightMinutes,
            deepMinutes: deepMinutes,
            remMinutes: remMinutes,
            awakeMinutes: awakeMinutes,
            awakenings: awakenings,
            sleepOnsetLatencyMinutes: onsetLatency,
            sleepEfficiency: efficiency,
            stages: stages
        )
    }
}
