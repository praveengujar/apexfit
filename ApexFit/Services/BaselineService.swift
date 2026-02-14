import Foundation
import SwiftData

actor BaselineService {
    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    /// Recompute all baselines from the past 28 days of daily metrics.
    func recomputeBaselines() async throws {
        let cutoffDate = Date().daysAgo(HealthKitConstants.baselineWindowDays)
        let descriptor = FetchDescriptor<DailyMetric>(
            predicate: #Predicate { $0.date >= cutoffDate },
            sortBy: [SortDescriptor(\.date, order: .forward)]
        )
        let metrics = try modelContext.fetch(descriptor)

        // HRV baseline
        let hrvValues = metrics.compactMap { $0.hrvRMSSD ?? $0.hrvSDNN }
        if let baseline = BaselineEngine.computeBaseline(values: hrvValues) {
            try await saveBaseline(type: .hrv, result: baseline)
        }

        // RHR baseline
        let rhrValues = metrics.compactMap { $0.restingHeartRate }
        if let baseline = BaselineEngine.computeBaseline(values: rhrValues) {
            try await saveBaseline(type: .restingHeartRate, result: baseline)
        }

        // Respiratory Rate baseline
        let respValues = metrics.compactMap { $0.respiratoryRate }
        if let baseline = BaselineEngine.computeBaseline(values: respValues) {
            try await saveBaseline(type: .respiratoryRate, result: baseline)
        }

        // SpO2 baseline
        let spo2Values = metrics.compactMap { $0.spo2 }
        if let baseline = BaselineEngine.computeBaseline(values: spo2Values) {
            try await saveBaseline(type: .spo2, result: baseline)
        }

        // Sleep Performance baseline
        let sleepPerfValues = metrics.compactMap { $0.sleepPerformance }
        if let baseline = BaselineEngine.computeBaseline(values: sleepPerfValues) {
            try await saveBaseline(type: .sleepPerformance, result: baseline)
        }

        try modelContext.save()
    }

    func getBaseline(for type: BaselineMetricType) throws -> BaselineResult? {
        let descriptor = FetchDescriptor<BaselineMetric>(
            predicate: #Predicate { $0.metricType == type },
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        guard let stored = try modelContext.fetch(descriptor).first else { return nil }
        return BaselineResult(
            mean: stored.mean,
            standardDeviation: stored.standardDeviation,
            sampleCount: stored.sampleCount,
            windowDays: HealthKitConstants.baselineWindowDays
        )
    }

    private func saveBaseline(type: BaselineMetricType, result: BaselineResult) async throws {
        // Find existing or create new
        let descriptor = FetchDescriptor<BaselineMetric>(
            predicate: #Predicate { $0.metricType == type }
        )
        let existing = try modelContext.fetch(descriptor).first

        if let existing {
            existing.mean = result.mean
            existing.standardDeviation = result.standardDeviation
            existing.sampleCount = result.sampleCount
            existing.updatedAt = Date()
        } else {
            let baseline = BaselineMetric(
                metricType: type,
                mean: result.mean,
                standardDeviation: result.standardDeviation,
                sampleCount: result.sampleCount,
                windowStartDate: Date().daysAgo(result.windowDays),
                windowEndDate: Date()
            )
            modelContext.insert(baseline)
        }
    }
}
