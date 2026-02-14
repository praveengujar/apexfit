import Foundation

enum HealthKitConstants {
    // MARK: - Data Staleness Thresholds
    static let heartRateStalenessHours = 4
    static let sleepDataStalenessHours = 18
    static let workoutStalenessHours = 24
    static let restingHRStalenessHours = 24
    static let hrvStalenessHours = 24
    static let spo2StalenessHours = 24

    // MARK: - Background Task Identifiers
    static let backgroundRefreshTaskID = "com.apexfit.background.refresh"
    static let backgroundProcessingTaskID = "com.apexfit.background.processing"

    // MARK: - Baseline Computation
    static let baselineWindowDays = 28
    static let minimumBaselineSamples = 3
    static let baselineFallbackDays = 7

    // MARK: - Sleep Session Detection
    static let sleepSessionGapToleranceMinutes = 30.0
    static let minimumSleepDurationMinutes = 30.0
    static let maximumNapDurationHours = 3.0
    static let napCreditCapHours = 1.5

    // MARK: - Recovery Timing
    static let recoveryRecalculationThresholdPoints = 3.0

    // MARK: - Strain Computation
    static let strainScalingFactor = 6.0
    static let strainMaxValue = 21.0
    static let strainMinValue = 0.0

    // MARK: - Heart Rate Zones (% of Max HR)
    static let zone1LowerBound = 0.50
    static let zone1UpperBound = 0.60
    static let zone2UpperBound = 0.70
    static let zone3UpperBound = 0.80
    static let zone4UpperBound = 0.90
    static let zone5UpperBound = 1.00

    // MARK: - Zone Multipliers
    static let zone1Multiplier = 1.0
    static let zone2Multiplier = 2.0
    static let zone3Multiplier = 3.0
    static let zone4Multiplier = 4.0
    static let zone5Multiplier = 5.0

    // MARK: - Recovery Weights
    static let recoveryHRVWeight = 0.30
    static let recoveryRHRWeight = 0.25
    static let recoverySleepWeight = 0.25
    static let recoveryRespRateWeight = 0.10
    static let recoverySpO2Weight = 0.10

    // MARK: - Sleep Need Defaults
    static let defaultSleepBaselineHours = 7.5
    static let defaultSleepOnsetLatencyMinutes = 15.0
}
