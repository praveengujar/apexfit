import SwiftUI
import SwiftData

struct HomeView: View {
    @Query(sort: \DailyMetric.date, order: .reverse)
    private var metrics: [DailyMetric]

    private var todayMetric: DailyMetric? {
        metrics.first { $0.date.isToday }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppTheme.spacingMD) {
                    headerSection
                    performanceSection
                    strainTargetBanner
                    workoutFeed
                    dailySummary
                }
                .padding(.horizontal, AppTheme.spacingMD)
                .padding(.top, AppTheme.spacingSM)
            }
            .background(AppColors.backgroundPrimary)
            .navigationTitle("ApexFit")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    // MARK: - Header
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(Date().formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))
                    .font(AppTypography.bodySmall)
                    .foregroundStyle(AppColors.textSecondary)
                Text("My Day")
                    .font(AppTypography.heading2)
                    .foregroundStyle(AppColors.textPrimary)
            }
            Spacer()
            NavigationLink(destination: Text("Settings")) {
                Image(systemName: "gearshape.fill")
                    .font(.title3)
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
    }

    // MARK: - Triple Dial Performance
    private var performanceSection: some View {
        HStack(spacing: AppTheme.spacingMD) {
            CircularGaugeView(
                value: todayMetric?.recoveryScore ?? 0,
                maxValue: 99,
                label: "Recovery",
                unit: "%",
                color: AppColors.recoveryColor(for: todayMetric?.recoveryZone ?? .yellow),
                size: .large
            )

            VStack(spacing: AppTheme.spacingMD) {
                CircularGaugeView(
                    value: todayMetric?.strainScore ?? 0,
                    maxValue: 21,
                    label: "Strain",
                    unit: "",
                    color: AppColors.primaryBlue,
                    size: .small
                )

                CircularGaugeView(
                    value: todayMetric?.sleepPerformance ?? 0,
                    maxValue: 100,
                    label: "Sleep",
                    unit: "%",
                    color: AppColors.sleepDeep,
                    size: .small
                )
            }
        }
        .padding(.vertical, AppTheme.spacingSM)
    }

    // MARK: - Strain Target
    private var strainTargetBanner: some View {
        Group {
            if let recovery = todayMetric?.recoveryScore,
               let zone = todayMetric?.recoveryZone {
                let target = strainTarget(for: zone)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Strain Target")
                            .font(AppTypography.labelMedium)
                            .foregroundStyle(AppColors.textSecondary)
                        Text("\(target.lowerBound.formattedOneDecimal) - \(target.upperBound.formattedOneDecimal)")
                            .font(AppTypography.heading3)
                            .foregroundStyle(AppColors.recoveryColor(for: zone))
                    }
                    Spacer()
                    Text(strainGuidance(for: zone))
                        .font(AppTypography.bodySmall)
                        .foregroundStyle(AppColors.textSecondary)
                        .multilineTextAlignment(.trailing)
                }
                .cardStyle()
            }
        }
    }

    // MARK: - Workout Feed
    private var workoutFeed: some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingSM) {
            if let workouts = todayMetric?.workouts, !workouts.isEmpty {
                Text("Activities")
                    .font(AppTypography.heading3)
                    .foregroundStyle(AppColors.textPrimary)

                ForEach(workouts, id: \.id) { workout in
                    WorkoutCard(workout: workout)
                }
            }
        }
    }

    // MARK: - Daily Summary
    private var dailySummary: some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingSM) {
            Text("Daily Summary")
                .font(AppTypography.heading3)
                .foregroundStyle(AppColors.textPrimary)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppTheme.spacingSM) {
                MetricTile(
                    title: "Steps",
                    value: (todayMetric?.steps ?? 0).formattedWithComma,
                    icon: "figure.walk",
                    color: AppColors.teal
                )
                MetricTile(
                    title: "Calories",
                    value: "\(Int(todayMetric?.activeCalories ?? 0))",
                    icon: "flame.fill",
                    color: AppColors.recoveryRed
                )
                MetricTile(
                    title: "Resting HR",
                    value: todayMetric?.restingHeartRate?.bpmFormatted ?? "--",
                    icon: "heart.fill",
                    color: AppColors.recoveryRed
                )
                MetricTile(
                    title: "HRV",
                    value: todayMetric?.hrvRMSSD?.msFormatted ?? "--",
                    icon: "waveform.path.ecg",
                    color: AppColors.recoveryGreen
                )
            }
        }
        .cardStyle()
    }

    // MARK: - Helpers
    private func strainTarget(for zone: RecoveryZone) -> ClosedRange<Double> {
        switch zone {
        case .green: return 14.0...18.0
        case .yellow: return 8.0...13.9
        case .red: return 2.0...7.9
        }
    }

    private func strainGuidance(for zone: RecoveryZone) -> String {
        switch zone {
        case .green: return "Push for high intensity"
        case .yellow: return "Moderate effort today"
        case .red: return "Focus on rest"
        }
    }
}
