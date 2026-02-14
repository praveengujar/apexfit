import Foundation
import HealthKit

actor HealthKitQueryService {
    private let healthStore: HKHealthStore

    init(healthStore: HKHealthStore = HealthKitManager.shared.healthStore) {
        self.healthStore = healthStore
    }

    // MARK: - Heart Rate Samples

    func fetchHeartRateSamples(from start: Date, to end: Date) async throws -> [(date: Date, bpm: Double)] {
        let type = HKQuantityType(.heartRate)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let samples = try await querySamples(type: type, predicate: predicate)

        return samples.compactMap { sample -> (Date, Double)? in
            guard let quantitySample = sample as? HKQuantitySample else { return nil }
            let bpm = quantitySample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
            return (quantitySample.startDate, bpm)
        }
    }

    func fetchHeartRateSamples(during workout: HKWorkout) async throws -> [(date: Date, bpm: Double)] {
        return try await fetchHeartRateSamples(from: workout.startDate, to: workout.endDate)
    }

    // MARK: - HRV

    func fetchHRVSamples(from start: Date, to end: Date) async throws -> [(date: Date, sdnn: Double)] {
        let type = HKQuantityType(.heartRateVariabilitySDNN)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let samples = try await querySamples(type: type, predicate: predicate)

        return samples.compactMap { sample -> (Date, Double)? in
            guard let quantitySample = sample as? HKQuantitySample else { return nil }
            let sdnn = quantitySample.quantity.doubleValue(for: .secondUnit(with: .milli))
            return (quantitySample.startDate, sdnn)
        }
    }

    // MARK: - Heartbeat Series (RR Intervals)

    func fetchRRIntervals(from start: Date, to end: Date) async throws -> [TimeInterval] {
        let type = HKSeriesType.heartbeat()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let seriesSamples = try await querySamples(type: type, predicate: predicate)

        var allIntervals: [TimeInterval] = []
        for sample in seriesSamples {
            guard let seriesSample = sample as? HKHeartbeatSeriesSample else { continue }
            let intervals = try await fetchIntervalsFromSeries(seriesSample)
            allIntervals.append(contentsOf: intervals)
        }
        return allIntervals
    }

    private func fetchIntervalsFromSeries(_ seriesSample: HKHeartbeatSeriesSample) async throws -> [TimeInterval] {
        try await withCheckedThrowingContinuation { continuation in
            var intervals: [TimeInterval] = []
            let query = HKHeartbeatSeriesQuery(heartbeatSeries: seriesSample) { _, timeSinceStart, precededByGap, done, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                intervals.append(timeSinceStart)
                if done {
                    continuation.resume(returning: intervals)
                }
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Resting Heart Rate

    func fetchRestingHeartRate(for date: Date) async throws -> Double? {
        let type = HKQuantityType(.restingHeartRate)
        let start = date.startOfDay
        let end = date.endOfDay
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let samples = try await querySamples(type: type, predicate: predicate)

        guard let sample = samples.last as? HKQuantitySample else { return nil }
        return sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
    }

    // MARK: - Respiratory Rate

    func fetchRespiratoryRate(for date: Date) async throws -> Double? {
        let type = HKQuantityType(.respiratoryRate)
        let start = date.startOfDay
        let end = date.endOfDay
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let samples = try await querySamples(type: type, predicate: predicate)

        guard let sample = samples.last as? HKQuantitySample else { return nil }
        return sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
    }

    // MARK: - SpO2

    func fetchSpO2(for date: Date) async throws -> Double? {
        let type = HKQuantityType(.oxygenSaturation)
        let start = date.startOfDay
        let end = date.endOfDay
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let samples = try await querySamples(type: type, predicate: predicate)

        guard let sample = samples.last as? HKQuantitySample else { return nil }
        return sample.quantity.doubleValue(for: .percent()) * 100.0
    }

    // MARK: - Sleep Analysis

    func fetchSleepSamples(from start: Date, to end: Date) async throws -> [HKCategorySample] {
        let type = HKCategoryType(.sleepAnalysis)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let samples = try await querySamples(type: type, predicate: predicate)
        return samples.compactMap { $0 as? HKCategorySample }
    }

    // MARK: - Workouts

    func fetchWorkouts(from start: Date, to end: Date) async throws -> [HKWorkout] {
        let type = HKWorkoutType.workoutType()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let samples = try await querySamples(type: type, predicate: predicate)
        return samples.compactMap { $0 as? HKWorkout }
    }

    // MARK: - Statistics

    func fetchDailySum(for identifier: HKQuantityTypeIdentifier, date: Date, unit: HKUnit) async throws -> Double? {
        let type = HKQuantityType(identifier)
        let start = date.startOfDay
        let end = date.endOfDay
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
                if let error {
                    continuation.resume(throwing: HealthKitError.queryFailed(error.localizedDescription))
                    return
                }
                let value = result?.sumQuantity()?.doubleValue(for: unit)
                continuation.resume(returning: value)
            }
            healthStore.execute(query)
        }
    }

    func fetchSteps(for date: Date) async throws -> Int {
        let value = try await fetchDailySum(for: .stepCount, date: date, unit: .count())
        return Int(value ?? 0)
    }

    func fetchActiveCalories(for date: Date) async throws -> Double {
        try await fetchDailySum(for: .activeEnergyBurned, date: date, unit: .kilocalorie()) ?? 0
    }

    func fetchVO2Max(for date: Date) async throws -> Double? {
        let type = HKQuantityType(.vo2Max)
        let start = date.daysAgo(30).startOfDay
        let end = date.endOfDay
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 1, sortDescriptors: [sortDescriptor]) { _, samples, error in
                if let error {
                    continuation.resume(throwing: HealthKitError.queryFailed(error.localizedDescription))
                    return
                }
                guard let sample = samples?.first as? HKQuantitySample else {
                    continuation.resume(returning: nil)
                    return
                }
                let value = sample.quantity.doubleValue(for: HKUnit(from: "ml/kg*min"))
                continuation.resume(returning: value)
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Anchored Queries

    func fetchNewSamples(for type: HKSampleType, anchor: HKQueryAnchor?) async throws -> (samples: [HKSample], newAnchor: HKQueryAnchor?) {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKAnchoredObjectQuery(
                type: type,
                predicate: nil,
                anchor: anchor,
                limit: HKObjectQueryNoLimit
            ) { _, added, deleted, newAnchor, error in
                if let error {
                    continuation.resume(throwing: HealthKitError.queryFailed(error.localizedDescription))
                    return
                }
                continuation.resume(returning: (added ?? [], newAnchor))
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Generic Query Helper

    private func querySamples(type: HKSampleType, predicate: NSPredicate, limit: Int = HKObjectQueryNoLimit) async throws -> [HKSample] {
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: limit,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: HealthKitError.queryFailed(error.localizedDescription))
                    return
                }
                continuation.resume(returning: samples ?? [])
            }
            healthStore.execute(query)
        }
    }
}
