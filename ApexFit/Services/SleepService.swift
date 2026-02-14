import Foundation
import SwiftData
import HealthKit

actor SleepService {
    private let modelContext: ModelContext
    private let queryService: HealthKitQueryService

    init(modelContext: ModelContext, queryService: HealthKitQueryService = HealthKitQueryService()) {
        self.modelContext = modelContext
        self.queryService = queryService
    }

    /// Process sleep data for a given date and update the daily metric.
    func processSleep(for date: Date, dailyMetric: DailyMetric, baselineSleepHours: Double) async throws {
        // Fetch sleep samples from yesterday evening through this morning
        let sleepWindowStart = date.yesterday.startOfDay.addingTimeInterval(18 * 3600) // 6 PM yesterday
        let sleepWindowEnd = date.startOfDay.addingTimeInterval(14 * 3600) // 2 PM today
        let samples = try await queryService.fetchSleepSamples(from: sleepWindowStart, to: sleepWindowEnd)

        guard !samples.isEmpty else {
            dailyMetric.sleepDurationHours = nil
            dailyMetric.sleepPerformance = nil
            return
        }

        // Get past week's sleep for debt calculation
        let pastWeekSleep = try fetchPastWeekSleep(before: date)

        // Analyze
        let result = SleepEngine.analyze(
            samples: samples,
            baselineSleepHours: baselineSleepHours,
            todayStrain: dailyMetric.strainScore,
            pastWeekSleepHours: pastWeekSleep.hours,
            pastWeekSleepNeeds: pastWeekSleep.needs
        )

        // Update daily metric
        dailyMetric.sleepDurationHours = result.totalSleepHours
        dailyMetric.sleepPerformance = result.sleepPerformance
        dailyMetric.sleepNeedHours = result.sleepNeedHours
        dailyMetric.sleepDebtHours = result.sleepDebtHours

        // Save sleep sessions
        if let mainSleep = result.mainSleep {
            let session = createSleepSession(from: mainSleep, isMain: true)
            session.sleepPerformance = result.sleepPerformance
            session.sleepNeedHours = result.sleepNeedHours
            dailyMetric.sleepSessions.append(session)
        }

        for napData in result.naps {
            let session = createSleepSession(from: napData, isMain: false)
            dailyMetric.sleepSessions.append(session)
        }
    }

    private func createSleepSession(from data: SleepSessionData, isMain: Bool) -> SleepSession {
        let session = SleepSession(startDate: data.startDate, endDate: data.endDate, isMainSleep: isMain)
        session.totalSleepMinutes = data.totalSleepMinutes
        session.timeInBedMinutes = data.timeInBedMinutes
        session.lightSleepMinutes = data.lightMinutes
        session.deepSleepMinutes = data.deepMinutes
        session.remSleepMinutes = data.remMinutes
        session.awakeMinutes = data.awakeMinutes
        session.awakenings = data.awakenings
        session.sleepOnsetLatencyMinutes = data.sleepOnsetLatencyMinutes
        session.sleepEfficiency = data.sleepEfficiency

        for stageData in data.stages {
            let stage = SleepStage(stageType: stageData.type, startDate: stageData.startDate, endDate: stageData.endDate)
            session.stages.append(stage)
        }

        return session
    }

    private func fetchPastWeekSleep(before date: Date) throws -> (hours: [Double], needs: [Double]) {
        var hours: [Double] = []
        var needs: [Double] = []

        for daysAgo in 1...7 {
            let pastDate = date.daysAgo(daysAgo)
            let descriptor = FetchDescriptor<DailyMetric>(
                predicate: #Predicate { metric in
                    metric.date == pastDate
                }
            )
            if let metric = try modelContext.fetch(descriptor).first {
                hours.append(metric.sleepDurationHours ?? 0)
                needs.append(metric.sleepNeedHours ?? HealthKitConstants.defaultSleepBaselineHours)
            }
        }

        return (hours, needs)
    }
}
