# Product Requirements Document: VitalOS — Human Performance Platform (iOS)

**Version:** 1.0
**Author:** Praveen
**Date:** February 13, 2026
**Status:** Draft
**Target Platform:** iOS 16+ (SwiftUI + Swift)
**Data Source:** Apple HealthKit (Apple Watch, Garmin, and any HealthKit-compatible wearable)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Vision and Product Overview](#2-vision-and-product-overview)
3. [Goals](#3-goals)
4. [Non-Goals](#4-non-goals)
5. [Target Users and Personas](#5-target-users-and-personas)
6. [System Architecture Overview](#6-system-architecture-overview)
7. [Data Source: Apple HealthKit Integration](#7-data-source-apple-healthkit-integration)
8. [Core Feature 1: Strain Engine](#8-core-feature-1-strain-engine)
9. [Core Feature 2: Recovery Engine](#9-core-feature-2-recovery-engine)
10. [Core Feature 3: Sleep Architecture](#10-core-feature-3-sleep-architecture)
11. [Core Feature 4: Stress Monitor](#11-core-feature-4-stress-monitor)
12. [Core Feature 5: Healthspan and Longevity](#12-core-feature-5-healthspan-and-longevity)
13. [Core Feature 6: AI Coach (RAG Pipeline)](#13-core-feature-6-ai-coach-rag-pipeline)
14. [Core Feature 7: Journal and Behavioral Correlation](#14-core-feature-7-journal-and-behavioral-correlation)
15. [Core Feature 8: Community, Teams, and Social](#15-core-feature-8-community-teams-and-social)
16. [Core Feature 9: WHOOP Live and HR Broadcasting](#16-core-feature-9-live-overlay-and-hr-broadcasting)
17. [UI/UX Design Specification](#17-uiux-design-specification)
18. [Backend Architecture](#18-backend-architecture)
19. [API and Developer Ecosystem](#19-api-and-developer-ecosystem)
20. [Data Privacy, Security, and Compliance](#20-data-privacy-security-and-compliance)
21. [User Stories (Complete)](#21-user-stories-complete)
22. [Requirements Summary (MoSCoW)](#22-requirements-summary-moscow)
23. [Acceptance Criteria](#23-acceptance-criteria)
24. [Success Metrics](#24-success-metrics)
25. [Technical Implementation Phases](#25-technical-implementation-phases)
26. [Open Questions](#26-open-questions)
27. [Appendix](#27-appendix)

---

## 1. Problem Statement

Most wearable users receive fragmented, surface-level health data — step counts, calories burned, hours slept — without understanding what that data means for their day-to-day performance or long-term health trajectory. Existing apps from Apple Watch, Garmin, and Fitbit present raw metrics in isolation without computing composite readiness scores, prescriptive recovery guidance, or correlating daily behaviors with physiological outcomes. Users are left to interpret their own data, leading to overtraining, poor recovery decisions, and no actionable feedback loop.

**Who experiences this problem:** Health-conscious individuals aged 22-55 who already own a wearable device (Apple Watch or Garmin) and actively want to optimize their training, sleep, and recovery — but lack a unified intelligence layer that transforms their existing biometric streams into prescriptive daily guidance.

**Cost of not solving it:** Users continue making uninformed training decisions (training hard on low-recovery days, sleeping inconsistently, ignoring stress accumulation). Competitively, the WHOOP platform charges $30/month for this intelligence layer tied to proprietary hardware. A software-only solution that leverages existing HealthKit data removes the hardware cost barrier entirely, opening a massive market of 100M+ Apple Watch users and 30M+ Garmin users globally.

---

## 2. Vision and Product Overview

**VitalOS** is a "Health Operating System" — a software-only iOS application that transforms raw biometric data from Apple HealthKit into a closed-loop performance optimization system. It computes three interconnected core metrics (Strain, Recovery, Sleep Performance) and layers an AI coaching engine on top to deliver personalized, conversational health guidance.

**Key Differentiator:** No proprietary hardware required. VitalOS reads data that Apple Watch, Garmin, and other wearables already write to Apple HealthKit, making it instantly accessible to tens of millions of users without purchasing a new device.

**Core Philosophy:** The previous day's strain and sleep quality determine today's recovery score. Today's recovery score sets the target for today's strain. This creates a continuous, self-adjusting feedback loop that adapts to the user's physiology over time.

---

## 3. Goals

| # | Goal | Metric | Target |
|---|------|--------|--------|
| G1 | Deliver a unified performance score from fragmented HealthKit data | Users who check their Recovery score daily | >60% DAU within 30 days of onboarding |
| G2 | Reduce user overtraining incidents through prescriptive strain targets | Self-reported overtraining reduction (via Journal) | 40% reduction in "overtrained" Journal entries within 90 days |
| G3 | Improve sleep consistency through the Sleep Planner | Standard deviation of bedtime across 28-day rolling window | <30 min variance for 50% of active users within 60 days |
| G4 | Enable behavioral self-experimentation via Journal correlation | Users who discover at least one statistically significant behavior-outcome correlation | 30% of users with 90+ days of Journal data |
| G5 | Achieve product-market fit as measured by retention | 30-day retention rate | >45% D30 retention |
| G6 | Build a monetizable AI coaching layer | Conversion rate from free tier to premium (Coach access) | >8% within 90 days |

---

## 4. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| NG1 | Building or integrating proprietary hardware sensors | The product is software-only; HealthKit provides all sensor data. Hardware is a separate initiative. |
| NG2 | Medical-grade diagnostics (ECG, AFib, blood pressure) | Requires FDA clearance and proprietary sensors. Apple Watch raw ECG data is not exposed via HealthKit in a usable format for third-party computation. |
| NG3 | Real-time continuous BLE streaming from wearables | HealthKit provides batched data, not real-time streams. The app works with periodic sync intervals, not sub-second telemetry. |
| NG4 | Android support in v1 | SwiftUI + HealthKit is iOS-only. Android via Health Connect is a future initiative. |
| NG5 | Custom workout video content or guided training programs | The app coaches on when and how hard to train, not what exercises to do. Content creation is out of scope. |
| NG6 | Social media integration or public profile pages | Community features are internal (Teams/Leaderboards). No public-facing social network in v1. |

---

## 5. Target Users and Personas

### Persona 1: "The Optimized Athlete" — Alex, 29
- **Device:** Apple Watch Ultra 2
- **Behavior:** Trains 5-6x/week (running, CrossFit, cycling). Already tracks workouts in Strava.
- **Pain Point:** Doesn't know when to push hard vs. rest. Has overtrained twice in the past year leading to injury.
- **Need:** A daily recovery score that tells him whether today is a "go hard" or "take it easy" day, plus strain targets calibrated to his current readiness.

### Persona 2: "The Health-Conscious Professional" — Sarah, 38
- **Device:** Apple Watch Series 9
- **Behavior:** Works 50+ hour weeks. Exercises 3x/week. Sleeps inconsistently due to work stress and a toddler.
- **Pain Point:** Feels exhausted but Apple Watch data doesn't explain why. Wants to understand the connection between her sleep, stress, and how she feels.
- **Need:** A sleep planner that accounts for her daily strain and sleep debt, plus a Journal that helps her correlate behaviors (alcohol, late meals, screen time) with her recovery.

### Persona 3: "The Longevity Seeker" — David, 52
- **Device:** Garmin Venu 3 (syncs to Apple Health via Garmin Connect)
- **Behavior:** Focused on long-term health. Tracks Zone 2 cardio, strength training, and VO2 Max trends.
- **Pain Point:** Wants to know if his current lifestyle is actually slowing or accelerating his biological aging, not just daily metrics.
- **Need:** A Healthspan dashboard showing his physiological age, pace of aging, and which specific behaviors (sleep consistency, step count, strength frequency) are moving the needle.

---

## 6. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        iOS Application                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ SwiftUI  │  │ Strain   │  │ Recovery │  │  Sleep       │   │
│  │ Views    │  │ Engine   │  │ Engine   │  │  Analyzer    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │              │               │           │
│  ┌────▼──────────────▼──────────────▼───────────────▼────────┐ │
│  │              Local Computation Layer (Swift)               │ │
│  │    Strain Calc · RMSSD · Sleep Staging · Stress Score     │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────────────┐ │
│  │              HealthKit Data Access Layer                   │ │
│  │   HKHealthStore · HKObserverQuery · HKAnchoredObjectQuery│ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────────────┐ │
│  │              Local Persistence (SwiftData / CoreData)      │ │
│  │   Computed Metrics · Journal Entries · User Preferences   │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                      Backend Services                            │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│  │  Auth        │  │  User Data  │  │  AI Coach Service      │  │
│  │  (Firebase / │  │  Sync API   │  │  (RAG Pipeline)        │  │
│  │   Supabase)  │  │  (REST/WS)  │  │  LangChain + GPT-4    │  │
│  └─────────────┘  └─────────────┘  └────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│  │  PostgreSQL  │  │  Vector DB  │  │  Webhook / Push        │  │
│  │  (User Data) │  │  (Pinecone/ │  │  Notification Engine   │  │
│  │              │  │   pgvector) │  │                        │  │
│  └─────────────┘  └─────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| UI Framework | SwiftUI (iOS 16+) | Declarative, native performance, excellent HealthKit integration |
| Local Persistence | SwiftData (iOS 17+) with CoreData fallback (iOS 16) | Native Apple ORM, automatic CloudKit sync capability |
| Data Source | Apple HealthKit (HKHealthStore) | Universal data aggregator for Apple Watch, Garmin (via Garmin Connect), Fitbit, Oura, etc. |
| Background Processing | BGTaskScheduler + HKObserverQuery | Ensures metric computation even when app is backgrounded |
| Networking | URLSession + async/await | Native Swift concurrency for API calls |
| Backend API | Node.js (Express) or Python (FastAPI) | REST API for user sync, community features, AI coach |
| Database | PostgreSQL + pgvector extension | Relational data + vector embeddings for RAG |
| Authentication | Firebase Auth or Supabase Auth | OAuth 2.0, Apple Sign-In, social logins |
| AI/ML | OpenAI GPT-4 API via LangChain | Conversational AI coach with RAG retrieval |
| Vector Store | Pinecone or pgvector | Semantic search over user data and health science corpus |
| Push Notifications | APNs (Apple Push Notification service) | Recovery alerts, sleep reminders, coaching nudges |
| Analytics | Mixpanel or PostHog | Event tracking, funnel analysis, retention metrics |
| Charts/Visualization | Swift Charts (iOS 16+) + custom SVG | Native charting with custom circular dial components |

---

## 7. Data Source: Apple HealthKit Integration

This is the foundational layer of the entire application. Instead of building custom BLE hardware integration, VitalOS reads all biometric data from Apple HealthKit, where Apple Watch, Garmin (via Garmin Connect IQ → Apple Health), and other wearables already write their data.

### 7.1 HealthKit Data Types Required

The app must request read authorization for the following HKObjectType identifiers:

#### Vital Signs (HKQuantityType)

| HealthKit Identifier | Description | Used For | Sample Rate |
|---------------------|-------------|----------|-------------|
| `HKQuantityTypeIdentifierHeartRate` | Heart rate in BPM | Strain calculation, Recovery, Stress | Continuous (Apple Watch writes ~every 5-10 min at rest, every 5s during workouts) |
| `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | HRV as SDNN in milliseconds | Recovery calculation | Nightly (Apple Watch measures during sleep) |
| `HKQuantityTypeIdentifierRestingHeartRate` | Resting heart rate in BPM | Recovery calculation | Daily |
| `HKQuantityTypeIdentifierRespiratoryRate` | Breaths per minute | Recovery, illness detection | Nightly (during sleep) |
| `HKQuantityTypeIdentifierOxygenSaturation` | SpO2 percentage | Recovery, altitude adaptation | Periodic (during sleep) |
| `HKQuantityTypeIdentifierBodyTemperature` | Skin/wrist temperature | Recovery, illness early warning | Nightly |
| `HKQuantityTypeIdentifierVO2Max` | Estimated VO2 Max in mL/kg/min | Healthspan, fitness level | Weekly estimate |
| `HKQuantityTypeIdentifierWalkingHeartRateAverage` | Average HR while walking | Cardiovascular baseline | Daily |

#### Activity and Motion (HKQuantityType)

| HealthKit Identifier | Description | Used For |
|---------------------|-------------|----------|
| `HKQuantityTypeIdentifierStepCount` | Steps per day | Healthspan, daily activity |
| `HKQuantityTypeIdentifierActiveEnergyBurned` | Active calories | Strain supplementary data |
| `HKQuantityTypeIdentifierBasalEnergyBurned` | Resting calories | Metabolic rate estimation |
| `HKQuantityTypeIdentifierAppleExerciseTime` | Minutes of exercise | Activity tracking |
| `HKQuantityTypeIdentifierDistanceWalkingRunning` | Distance in meters | Workout detail |
| `HKQuantityTypeIdentifierDistanceCycling` | Cycling distance | Workout detail |
| `HKQuantityTypeIdentifierDistanceSwimming` | Swimming distance | Workout detail |
| `HKQuantityTypeIdentifierSwimmingStrokeCount` | Stroke count | Workout detail |

#### Body Measurements (HKQuantityType)

| HealthKit Identifier | Description | Used For |
|---------------------|-------------|----------|
| `HKQuantityTypeIdentifierBodyMass` | Body weight in kg | Effective mass calculation for muscular load |
| `HKQuantityTypeIdentifierLeanBodyMass` | Lean body mass | Healthspan contributor |
| `HKQuantityTypeIdentifierBodyFatPercentage` | Body fat % | Healthspan contributor |
| `HKQuantityTypeIdentifierHeight` | Height in meters | BMI and metabolic calculations |

#### Sleep (HKCategoryType)

| HealthKit Identifier | Description | Used For |
|---------------------|-------------|----------|
| `HKCategoryTypeIdentifierSleepAnalysis` | Sleep stages: InBed, Asleep, Awake, Core, Deep, REM | Sleep architecture, Sleep Performance |

**Critical Note on Sleep Stages:** Starting iOS 16 and watchOS 9, Apple Watch writes granular sleep stages (Core/Light, Deep/SWS, REM, Awake) to HealthKit using `HKCategoryValueSleepAnalysis`. Garmin also writes sleep stage data via Garmin Connect → Apple Health sync. The app must handle both granular stage data and legacy asleep/awake-only data gracefully.

#### Workouts (HKWorkout)

| HealthKit Identifier | Description | Used For |
|---------------------|-------------|----------|
| `HKWorkoutType` | Workout sessions with type, duration, energy | Strain calculation, activity categorization |
| `HKWorkoutActivityType` | Enum of 80+ workout types | Classifying cardiovascular vs. strength activity |
| `HKSeriesType.heartRateSeries()` | High-frequency HR samples during workouts | HR zone time-in-zone calculation |

### 7.2 HealthKit Query Architecture

```swift
// Architectural pattern for HealthKit data access
class HealthKitManager: ObservableObject {

    let healthStore = HKHealthStore()

    // MARK: - Authorization
    // Request read access to all required data types on first launch.
    // Users MUST grant access for the app to function.
    func requestAuthorization() async throws { ... }

    // MARK: - Observer Queries (Background Delivery)
    // Register HKObserverQuery for each critical data type.
    // HealthKit wakes the app via BGTaskScheduler when new data is available.
    // This enables near-real-time metric updates without the app being in foreground.
    func setupBackgroundDelivery() { ... }

    // MARK: - Anchored Object Queries (Incremental Sync)
    // Use HKAnchoredObjectQuery with saved anchors to fetch only NEW samples
    // since the last query. This prevents re-processing historical data on every sync.
    func fetchNewSamples(for type: HKSampleType, since anchor: HKQueryAnchor?) async throws -> ([HKSample], HKQueryAnchor) { ... }

    // MARK: - Statistics Queries (Aggregated Data)
    // Use HKStatisticsQuery and HKStatisticsCollectionQuery for
    // daily/weekly/monthly aggregations (avg RHR, total steps, etc.)
    func fetchDailyStatistics(for type: HKQuantityType, over days: Int) async throws -> [DailyStat] { ... }

    // MARK: - Heart Rate Series (Workout Detail)
    // Use HKHeartbeatSeriesQuery to get beat-to-beat intervals during
    // sleep for RMSSD calculation. Falls back to HKQuantityType heartRate
    // samples if beat-to-beat data is unavailable.
    func fetchHeartbeatSeries(during sleepSample: HKSample) async throws -> [TimeInterval] { ... }
}
```

### 7.3 HRV Calculation: SDNN vs. RMSSD Mapping

**Critical Technical Requirement:** Apple HealthKit exposes HRV as SDNN (Standard Deviation of Normal-to-Normal intervals), stored under `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`. The WHOOP system internally uses RMSSD (Root Mean Square of Successive Differences), which is more sensitive to parasympathetic (vagal) tone.

**Solution — Dual Approach:**

1. **Primary (Preferred):** When `HKHeartbeatSeriesSample` data is available (Apple Watch Series 4+, watchOS 9+), compute RMSSD directly from raw beat-to-beat (RR) intervals:

```
RMSSD = sqrt( (1/N) * Σ(RR[i+1] - RR[i])² )
```

Where `RR[i]` is the i-th inter-beat interval in milliseconds.

2. **Fallback:** When only SDNN is available (older devices, Garmin via HealthKit), use SDNN directly as the HRV metric. Apply a user-specific normalization by computing the user's SDNN percentile against their own 28-day rolling baseline rather than attempting a mathematical SDNN→RMSSD conversion (which requires assumptions about heart rate stationarity that may not hold).

**Normalization requirement:** All HRV values (whether RMSSD or SDNN) must be evaluated against the user's personal 28-day rolling baseline, not population norms. This ensures the Recovery score is personalized regardless of which HRV metric is available.

### 7.4 Data Freshness and Background Sync

| Mechanism | Purpose | Implementation |
|-----------|---------|----------------|
| `HKObserverQuery` | Detect new HealthKit data in background | Register for each critical data type. HealthKit delivers background notifications. |
| `BGAppRefreshTask` | Periodic background computation | Schedule via BGTaskScheduler. Minimum interval: 15 minutes (iOS-enforced). |
| `BGProcessingTask` | Heavy computation (Recovery, Healthspan) | Schedule during overnight charging. Longer execution time allowed. |
| Foreground sync | Full data refresh on app open | Run anchored queries for all data types. Recompute all metrics. |

**Data Staleness Policy:**
- If HealthKit data is older than 4 hours for heart rate: Display "Data may be stale" indicator.
- If sleep data is missing for the previous night: Display "No sleep data recorded" and skip Recovery calculation. Show last known Recovery with a staleness badge.
- If HealthKit authorization is revoked for any required type: Show a prominent banner explaining which data is missing and linking to Settings.

### 7.5 Device Compatibility Matrix

| Device | HealthKit Data Quality | HR Zones | Sleep Stages | HRV (RMSSD possible) | SpO2 | VO2 Max |
|--------|----------------------|----------|--------------|----------------------|------|---------|
| Apple Watch Ultra 2 | Excellent | Yes | Yes (Core/Deep/REM) | Yes (beat-to-beat) | Yes | Yes |
| Apple Watch Series 9/10 | Excellent | Yes | Yes (Core/Deep/REM) | Yes (beat-to-beat) | Yes | Yes |
| Apple Watch Series 4-8 | Good | Yes | Yes (Core/Deep/REM in watchOS 9+) | Yes (beat-to-beat) | Series 6+ | Yes |
| Apple Watch Series 3 | Basic | Yes | No (Asleep/Awake only) | No (SDNN only) | No | No |
| Apple Watch SE | Good | Yes | Yes (watchOS 9+) | Partial | No | Yes |
| Garmin (via Garmin Connect) | Good | Yes | Yes (Light/Deep/REM) | No (SDNN only via HealthKit) | Yes (device only) | Yes |
| Garmin (native HealthKit) | Limited | Partial | Varies by model | No | No | Varies |
| Oura Ring (via Apple Health) | Good | No | Yes (Light/Deep/REM) | No (SDNN only) | Yes | No |

**Minimum Viable Device:** Apple Watch Series 4 or later with watchOS 9+. This provides heart rate, sleep stages, HRV (beat-to-beat), and VO2 Max — sufficient for all core features.

**Degraded Experience Devices:** Apple Watch Series 3, basic Garmin models. Core features (Strain, basic Recovery) still work but without sleep staging or precise HRV. The app must clearly communicate feature limitations based on detected data availability.

---

## 8. Core Feature 1: Strain Engine

### 8.1 Overview

Strain quantifies total physiological exertion on a **0-21 logarithmic scale**. It is the primary metric for answering "How hard did my body work today?" The logarithmic scale reflects biological reality: moving from strain 10→11 requires less effort than 18→19.

Strain accumulates throughout the day from all sources: structured workouts, daily movement (walking, stairs), and even elevated heart rate from stress or illness.

### 8.2 Cardiovascular Strain Calculation

#### Heart Rate Zone Definition

Zones are calculated relative to the user's **maximum heart rate** (Max HR). Max HR is determined by:
1. **User-input value** (if the user knows their tested Max HR)
2. **HealthKit-observed maximum** (highest HR recorded during a workout in the past 90 days)
3. **Age-estimated fallback:** `Max HR = 220 - age`

| Zone | Name | Range (% of Max HR) | Weight Multiplier | Description |
|------|------|---------------------|-------------------|-------------|
| Zone 1 | Warm-Up / Recovery | 50% - 60% | 1.0x | Light activity, walking |
| Zone 2 | Fat Burn / Easy Aerobic | 60% - 70% | 2.0x | Conversational pace |
| Zone 3 | Aerobic / Moderate | 70% - 80% | 3.0x | Tempo effort |
| Zone 4 | Threshold / Hard | 80% - 90% | 4.0x | Race pace, interval training |
| Zone 5 | Anaerobic / Max Effort | 90% - 100% | 5.0x | All-out sprints |

#### Strain Formula

```
Day Strain = k × log₁₀(Weighted HR Area + c)

Where:
- Weighted HR Area = Σ (HR_sample_duration_minutes × Zone_Multiplier) for all HR samples in the day
- k = scaling factor calibrated so that maximum achievable daily strain ≈ 21
- c = constant (prevents log(0), typically 1.0)
- log₁₀ = base-10 logarithm
```

**Detailed Calculation Steps:**

1. **Fetch all heart rate samples** for the current day from HealthKit (`HKQuantityTypeIdentifierHeartRate`)
2. **For each HR sample**, determine its zone based on the user's Max HR
3. **Calculate weighted duration**: `sample_duration_seconds × zone_multiplier`
4. **Sum all weighted durations** across the entire day = `Weighted HR Area`
5. **Apply logarithmic transformation**: `Strain = k × log₁₀(Weighted HR Area + c)`
6. **Clamp** result to [0.0, 21.0]

**Calibration Constants:**
- `k` should be calibrated such that a professional athlete's hardest training day (e.g., 3 hours in Zones 4-5) yields a strain of ~20.5
- `c = 1.0` (standard log-shift constant)
- A sedentary day with minimal Zone 1 activity should yield strain of 2-5
- A moderate workout day should yield strain of 10-14
- An intense training day should yield strain of 15-19

#### Activity Strain (Per-Workout)

Each workout logged in HealthKit (`HKWorkout`) receives its own strain score using the same formula but scoped to the workout's duration. The app must:
1. Query `HKWorkout` objects for the current day
2. For each workout, query the associated `heartRateSeries` or heart rate samples within the workout's `startDate` to `endDate`
3. Calculate per-workout strain using the same logarithmic formula
4. Display each workout as a card in the "My Day" activity feed with its individual strain contribution

### 8.3 Muscular Load (Strength Trainer)

Since the app reads from HealthKit (not raw IMU data from a wrist sensor), muscular load estimation is adapted:

#### Data Sources for Muscular Load
1. **HKWorkout with `activityType` in strength categories**: `.traditionalStrengthTraining`, `.functionalStrengthTraining`, `.highIntensityIntervalTraining`, `.crossTraining`
2. **Workout metadata**: Duration, total energy burned, average/max heart rate
3. **User-input body weight** (from HealthKit `HKQuantityTypeIdentifierBodyMass` or manual entry)

#### Simplified Muscular Load Formula

Since raw accelerometer data is not available via HealthKit, muscular load is estimated from:

```
Muscular Load = Volume Score × Intensity Score

Volume Score = workout_duration_minutes × effective_mass_factor
  where effective_mass_factor varies by workout type:
    - Traditional Strength Training: 0.7 (assumes ~70% body weight involvement)
    - Functional Strength Training: 0.8
    - HIIT: 0.6
    - CrossTraining: 0.75
    - Default: 0.5

Intensity Score = (avg_HR_during_workout / Max_HR) × (max_HR_during_workout / Max_HR)
  Normalized to [0, 1]

Muscular Load (0-100 scale) = Volume Score × Intensity Score × calibration_factor
```

#### User-Enhanced Muscular Load (Optional Input)

To improve accuracy, the app can optionally prompt users to log:
- **Total weight lifted** (sum of sets × reps × weight) — entered manually or via integration with apps like Strong, Hevy, or Apple Fitness+
- **Perceived exertion** (RPE 1-10 scale) — used as a correction factor

```
Enhanced Muscular Load = Base Muscular Load × (1 + RPE_adjustment)
  where RPE_adjustment = (user_RPE - 5) × 0.1
  (RPE of 5 = neutral, RPE of 8 = +30% load, RPE of 3 = -20% load)
```

### 8.4 Strain Target

Based on the user's current Recovery score, the app calculates a recommended strain target for the day:

| Recovery Zone | Strain Target Range | Guidance |
|---------------|-------------------|----------|
| Green (67-99%) | 14.0 - 18.0 | "Your body is primed. Push for a high-intensity day." |
| Yellow (34-66%) | 8.0 - 13.9 | "Moderate effort today. A solid workout without overdoing it." |
| Red (1-33%) | 2.0 - 7.9 | "Focus on rest and active recovery. Light movement only." |

The strain target should be visualized as a target zone on the Strain dial, so users can see in real-time how close they are to their recommended exertion level.

### 8.5 Strain User Stories

- As an athlete, I want to see my cumulative day strain update in near-real-time so that I can pace my training effort against my recovery-based target.
- As a strength trainee, I want my weightlifting sessions to contribute to my strain score beyond just heart rate so that my training load is accurately reflected.
- As a casual user, I want to understand why my strain is high on a rest day so that I can identify non-exercise stressors (illness, stress, poor sleep).
- As a runner, I want to see per-workout strain for each run so that I can compare training intensities across sessions.
- As a user, I want to see time-in-zone breakdowns for each workout so that I understand the quality of my effort, not just the quantity.

---

## 9. Core Feature 2: Recovery Engine

### 9.1 Overview

Recovery is a **0-99% score** that answers "How ready is my body to perform today?" It is calculated during the user's deepest sleep period (specifically during the longest contiguous block of Deep/SWS + REM sleep) to ensure measurements are taken during a hemodynamically stable state.

Recovery is the most critical metric in the system because it drives the Strain Target (how hard to train) and feeds into the Sleep Planner (how much sleep is needed tonight).

### 9.2 Recovery Score Calculation

#### Input Metrics

| Metric | Source | Weight in Recovery | Measurement Window |
|--------|--------|-------------------|-------------------|
| Heart Rate Variability (HRV) | Computed from RR intervals during sleep OR HealthKit SDNN | 30% | Previous night's sleep |
| Resting Heart Rate (RHR) | `HKQuantityTypeIdentifierRestingHeartRate` | 25% | Previous night's sleep |
| Sleep Performance | Computed (actual sleep ÷ sleep need) | 25% | Previous night |
| Respiratory Rate | `HKQuantityTypeIdentifierRespiratoryRate` | 10% | Previous night's sleep |
| SpO2 | `HKQuantityTypeIdentifierOxygenSaturation` | 10% | Previous night's sleep |

#### Personal Baseline (28-Day Rolling Window)

Each metric is evaluated against the user's **personal 28-day rolling baseline**, not population averages. This is essential for personalization.

```
For each metric M:
  baseline_mean = mean(M over past 28 days)
  baseline_std = stddev(M over past 28 days)

  z_score = (M_today - baseline_mean) / baseline_std

  metric_score = sigmoid(z_score) × 100
    where sigmoid maps z-scores to 0-100:
    - z = 0 (at baseline mean) → 50
    - z = +2 (2 SD above mean) → ~88
    - z = -2 (2 SD below mean) → ~12

  For HRV: higher is better (positive z = good)
  For RHR: lower is better (negative z = good, so invert)
  For Sleep Performance: higher is better
  For Respiratory Rate: lower is better at rest (invert)
  For SpO2: higher is better
```

#### Composite Recovery Score

```
Recovery = (HRV_score × 0.30) + (RHR_score × 0.25) + (Sleep_score × 0.25) + (RespRate_score × 0.10) + (SpO2_score × 0.10)

Clamped to [1, 99]
```

#### Recovery Zones

| Zone | Range | Color | Icon | User Guidance |
|------|-------|-------|------|---------------|
| Green (Prime) | 67% - 99% | `#16EC06` | ↑ | "Your body is recovered. Great day for peak performance." |
| Yellow (Moderate) | 34% - 66% | `#FFDE00` | → | "Adequate recovery. Train at moderate intensity." |
| Red (Rest) | 1% - 33% | `#FF0026` | ↓ | "Your body needs rest. Prioritize sleep and light movement." |

### 9.3 Recovery Calculation Timing

1. **Primary calculation:** Triggered when the user's sleep session ends (detected via HealthKit sleep data becoming available, typically 30-60 minutes after waking).
2. **Recalculation:** If additional sleep data arrives (HealthKit background delivery), recalculate and update. Display a "Updated" badge if the score changes by more than 3 points.
3. **No-sleep fallback:** If no sleep data is available for the previous night, do not calculate a Recovery score. Display "Recovery unavailable — no sleep data recorded" with the last known score grayed out.

### 9.4 Recovery Insights (AI-Generated)

For each Recovery score, the app should generate a brief natural-language explanation:

**Example outputs:**
- "Your Recovery is 82% (Green). Your HRV was 15% above your baseline, and you got 95% of your sleep need. Great night."
- "Your Recovery is 41% (Yellow). Your RHR was elevated by 6 BPM compared to your baseline, likely due to the 18.5 strain day yesterday. Consider a lighter workout today."
- "Your Recovery is 22% (Red). Your respiratory rate spiked to 18 breaths/min (baseline: 14). Combined with low HRV, this may indicate early signs of illness. Monitor how you feel."

### 9.5 Recovery User Stories

- As a user, I want to see my Recovery score as soon as I wake up so that I can plan my day's training intensity.
- As a user, I want to understand which specific factors drove my Recovery score up or down so that I can take corrective action.
- As a user, I want to see my Recovery trend over the past 7/30/90 days so that I can identify long-term patterns (overtraining, improving fitness).
- As a user, I want the app to alert me when my Recovery drops below my personal threshold (configurable) so that I don't miss warning signs.
- As a user on a rest day, I want to see my Recovery improving throughout the day (via updated HRV/HR readings) so that I know rest is working.

---

## 10. Core Feature 3: Sleep Architecture

### 10.1 Overview

The Sleep feature serves dual roles: (1) tracking and grading last night's sleep quality, and (2) predicting how much sleep is needed tonight based on today's strain, accumulated sleep debt, and the user's baseline need.

### 10.2 Sleep Stage Tracking

#### Data Source

Sleep stages are read from HealthKit's `HKCategoryTypeIdentifierSleepAnalysis`. Starting iOS 16 / watchOS 9, Apple Watch writes granular stages:

| HealthKit Value | Stage Name | App Display | Color |
|----------------|------------|-------------|-------|
| `asleepCore` | Core Sleep (Light) | Light | `#7B8CDE` |
| `asleepDeep` | Deep Sleep (SWS) | Deep (SWS) | `#4A3FB5` |
| `asleepREM` | REM Sleep | REM | `#00F19F` (Teal) |
| `awake` | Awake | Awake | `#FFFFFF` |
| `inBed` | In Bed (not asleep) | In Bed | `#3A3A3C` |

#### Sleep Session Detection

1. Query HealthKit for all `sleepAnalysis` samples in the past 24 hours
2. Group contiguous samples into a sleep session (gap tolerance: 30 minutes)
3. If multiple sessions exist (e.g., nap + main sleep), identify the longest session as "Main Sleep" and others as "Naps"
4. Calculate stage durations by summing sample durations per stage type

#### Sleep Metrics Computed

| Metric | Formula | Display |
|--------|---------|---------|
| Total Sleep Time (TST) | Sum of all asleep stages (Core + Deep + REM) | "7h 23m" |
| Time in Bed (TIB) | End time - Start time of sleep session | "8h 05m" |
| Sleep Efficiency | TST ÷ TIB × 100 | "91%" |
| SWS Duration | Sum of `asleepDeep` samples | "1h 42m" |
| SWS % | SWS Duration ÷ TST × 100 | "23%" |
| REM Duration | Sum of `asleepREM` samples | "1h 55m" |
| REM % | REM Duration ÷ TST × 100 | "26%" |
| Light Duration | Sum of `asleepCore` samples | "3h 46m" |
| Light % | Light Duration ÷ TST × 100 | "51%" |
| Awakenings | Count of `awake` samples within sleep session | "3 times" |
| Sleep Onset Latency | Time from first `inBed` to first `asleep*` sample | "12 min" |

### 10.3 Sleep Performance Score

Sleep Performance is the ratio of actual sleep achieved versus the body's calculated need:

```
Sleep Performance (%) = (Total Sleep Time ÷ Sleep Need) × 100
Clamped to [0, 100]
```

A score of 100% means the user met their full sleep need. Scores above 100% are possible but displayed as 100% (oversleeping is not penalized but not rewarded beyond the threshold).

### 10.4 Sleep Need Engine

Sleep Need is a dynamic value that changes daily. It is the sum of four components:

```
Sleep Need (hours) = Baseline Need + Strain Supplement + Sleep Debt Repayment - Nap Credit

Where:
  Baseline Need = user's physiological baseline (default: 7.5h, adjusted by user or inferred from historical optimal recovery correlation)

  Strain Supplement = f(today's strain)
    if strain < 8: supplement = 0
    if strain 8-14: supplement = 0.25h
    if strain 14-18: supplement = 0.5h
    if strain 18-21: supplement = 0.75h

  Sleep Debt = Σ max(0, Sleep_Need[day_i] - Actual_Sleep[day_i]) for past 7 days
  Sleep Debt Repayment = Sleep_Debt × 0.2 (attempt to recover 20% of debt per night)

  Nap Credit = total nap duration today (capped at 1.5 hours to prevent nap gaming)
```

### 10.5 Sleep Planner

The Sleep Planner is a forward-looking feature that recommends bedtime and wake time based on the user's Sleep Need and chosen performance goal.

#### Performance Goals

| Goal | Sleep Need Multiplier | Description |
|------|----------------------|-------------|
| Peak | 100% of Sleep Need | "Get the full sleep your body needs for maximum recovery" |
| Perform | 85% of Sleep Need | "Solid sleep for a good recovery day" |
| Get By | 70% of Sleep Need | "Minimum viable sleep — expect reduced recovery" |

#### Bedtime Recommendation

```
Required Sleep Duration = Sleep Need × Goal Multiplier
Recommended Bedtime = Desired Wake Time - Required Sleep Duration - Estimated Sleep Onset Latency

Where:
  Desired Wake Time = user-set alarm time OR inferred from 14-day wake time average
  Estimated Sleep Onset Latency = 14-day average of user's actual sleep onset latency (default: 15 min)
```

**Display:** A timeline visualization showing recommended bedtime, expected wake time, and how each component (baseline, strain supplement, debt repayment) contributes to the total need.

### 10.6 Sleep User Stories

- As a user, I want to see a detailed breakdown of my sleep stages (Light, Deep, REM, Awake) so that I understand the quality of my sleep beyond just duration.
- As a user, I want the Sleep Planner to tell me what time I should go to bed tonight so that I can optimize my recovery for tomorrow.
- As a user, I want to see my accumulated sleep debt over the past week so that I understand why I might feel fatigued despite getting "enough" hours last night.
- As a user, I want to compare my sleep metrics across weeks and months so that I can identify trends (improving consistency, declining deep sleep, etc.).
- As a user who naps, I want my nap duration credited toward my daily sleep need so that my Sleep Performance score accurately reflects total rest.

---

## 11. Core Feature 4: Stress Monitor

### 11.1 Overview

The Stress Monitor provides a continuous score on a **0-3 scale** that quantifies physiological stress during waking hours. Unlike Recovery (which is a once-daily overnight calculation), Stress is a real-time metric that updates throughout the day.

### 11.2 Stress Score Calculation

#### Data Sources
- **Heart Rate:** `HKQuantityTypeIdentifierHeartRate` — elevated HR relative to context indicates stress
- **HRV:** If available in real-time (Apple Watch provides some daytime HRV samples) — depressed HRV indicates stress
- **Activity context:** Step count and workout sessions — used for motion suppression

#### Algorithm

```
For each 5-minute window during waking hours:

1. Compute avg HR for the window
2. Compute expected HR based on activity level:
   - If steps > 50 in the window OR active workout: expected_HR = activity-adjusted baseline
   - If sedentary (steps < 10, no workout): expected_HR = resting baseline
3. HR_deviation = (actual_HR - expected_HR) / expected_HR
4. If HRV data available: HRV_deviation = (baseline_HRV - actual_HRV) / baseline_HRV

Stress Score for window:
  if actively exercising: stress = 0 (motion suppression — exercise is not stress)
  else: stress = clamp((HR_deviation × 2.0 + HRV_deviation × 1.5), 0, 3)

Current Stress Score = exponential moving average of recent 5-minute windows (alpha = 0.3)
```

#### Stress Levels

| Score Range | Level | Color | Description |
|-------------|-------|-------|-------------|
| 0.0 - 0.5 | Low | Blue `#4A90D9` | Calm, relaxed state |
| 0.5 - 1.5 | Moderate | Yellow `#FFDE00` | Mild stress, normal workday levels |
| 1.5 - 2.5 | High | Orange `#FF8C00` | Elevated stress, consider a break |
| 2.5 - 3.0 | Very High | Red `#FF0026` | Acute stress event, intervention recommended |

### 11.3 Motion Suppression Logic

**Critical Requirement:** The stress algorithm must differentiate between physical exertion and psychological stress. Without motion suppression, every workout would register as a high-stress event.

```
Motion Suppression Rules:
1. If an HKWorkout session is active: stress = 0 (explicitly suppress)
2. If step_count in 5-min window > 100: reduce stress score by 50%
3. If step_count in 5-min window > 200: reduce stress score by 80%
4. Transition buffer: After a workout ends, apply a 15-minute cool-down window
   where elevated HR is expected and stress scoring is gradually re-enabled
```

### 11.4 Breathwork Interventions

When stress is elevated (≥1.5), the app offers guided breathwork sessions as a functional tool to reduce stress.

#### Breathwork Modality 1: Cyclic Sighing (Reduce Stress)
- **Purpose:** Activate parasympathetic nervous system, lower heart rate
- **Pattern:** Inhale (4s) → Inhale again (2s "top-off" sip) → Long exhale (8s)
- **Duration:** 5 minutes (default), adjustable 1-10 minutes
- **Guided UI:** Animated expanding/contracting circle with haptic feedback at transition points
- **Post-session analytics:** Before/after stress score, HR change, HRV change (if measurable)

#### Breathwork Modality 2: Cyclic Hyperventilation (Increase Alertness)
- **Purpose:** Activate sympathetic nervous system, increase alertness
- **Pattern:** Deep inhale (2s) → Sharp exhale (1s) → Repeat 30 cycles → Breath hold (15-30s) → Recovery breath
- **Duration:** 3-5 minutes
- **Post-session analytics:** Before/after stress score, HR change

#### Breathwork Session Data Model

```swift
struct BreathworkSession: Identifiable {
    let id: UUID
    let type: BreathworkType // .cyclicSighing, .cyclicHyperventilation
    let startDate: Date
    let endDate: Date
    let duration: TimeInterval
    let preStressScore: Double
    let postStressScore: Double
    let preHeartRate: Double
    let postHeartRate: Double
    let preHRV: Double? // if measurable
    let postHRV: Double?
    let breathCycles: Int
    let inhaleRate: Double // avg seconds
    let exhaleRate: Double // avg seconds
    let holdDuration: Double? // for hyperventilation holds
}
```

### 11.5 Stress User Stories

- As a user, I want to see my real-time stress level throughout the day so that I can identify high-stress periods and take action.
- As a user exercising, I want my workout to not be counted as stress so that my stress score accurately reflects psychological, not physical, load.
- As a stressed user, I want the app to suggest a breathwork session when my stress is elevated so that I have an immediate, actionable intervention.
- As a user who completed a breathwork session, I want to see my before/after stress score so that I can see the tangible impact of the exercise.
- As a user, I want to see my daily stress pattern (timeline view) so that I can identify recurring stressors (e.g., every day at 2pm during meetings).

---

## 12. Core Feature 5: Healthspan and Longevity

### 12.1 Overview

The Healthspan suite focuses on long-term biological aging rather than daily performance. It requires **6 months of accumulated data** before generating its first "VitalOS Age" estimate.

### 12.2 VitalOS Age (Physiological Age)

VitalOS Age is a single number representing the user's effective biological age, which can be higher or lower than their chronological age.

#### Nine Contributors

| # | Contributor | Data Source | Target for Age Reduction | Weight |
|---|------------|-------------|--------------------------|--------|
| 1 | Sleep Duration | Sleep tracking (HealthKit) | Consistent 7-9 hours nightly | 12% |
| 2 | Sleep Consistency | Bedtime/wake time variance | <30 min variance in bed/wake times | 10% |
| 3 | Daily Steps | `HKQuantityTypeIdentifierStepCount` | 10,000+ daily average | 10% |
| 4 | Heart Rate Zone Balance | Time in HR zones from workouts | Balanced time across zones, emphasis on Zone 2 | 12% |
| 5 | Strength Activity | Frequency of strength workouts | 3+ sessions per week | 10% |
| 6 | VO2 Max | `HKQuantityTypeIdentifierVO2Max` | Progressive improvement or maintenance | 15% |
| 7 | Resting Heart Rate | `HKQuantityTypeIdentifierRestingHeartRate` | Longitudinal decline or stability | 12% |
| 8 | Lean Body Mass | `HKQuantityTypeIdentifierLeanBodyMass` or derived | Maintenance or improvement | 9% |
| 9 | Behavioral Consistency | Journal entries (positive behaviors logged consistently) | Consistent positive habit logging | 10% |

#### Calculation

```
For each contributor C[i]:
  1. Compute 6-month average of the metric
  2. Compare to age-stratified population norms (from published health research)
  3. Generate a contributor_score[i] from -5 to +5 years
     where -5 = significantly better than age peers (younger)
           0 = average for age
           +5 = significantly worse than age peers (older)

VitalOS Age = Chronological Age + Σ(contributor_score[i] × weight[i])
```

### 12.3 Pace of Aging

A **weekly "speedometer"** showing whether current behaviors are accelerating or decelerating aging:

```
Pace of Aging = (Recent 4-week contributor performance) vs. (6-month average contributor performance)

Displayed as:
  "Slowing" (🟢) — recent performance better than 6-month average
  "Stable" (🟡) — within 5% of 6-month average
  "Accelerating" (🔴) — recent performance worse than 6-month average
```

### 12.4 Healthspan Dashboard UI

The dashboard shows:
1. **VitalOS Age** — large prominent number with delta from chronological age (e.g., "34" with "-3 years" badge)
2. **Pace of Aging** — speedometer visualization
3. **9 Contributor Cards** — each showing current status, trend arrow, and actionable recommendation
4. **Historical Graph** — VitalOS Age over time (monthly data points)

### 12.5 Healthspan User Stories

- As a longevity-focused user, I want to see my biological age compared to my chronological age so that I know if my lifestyle is aging me faster or slower than expected.
- As a user, I want to see which specific behaviors are contributing most to my biological age so that I can prioritize improvements.
- As a user, I want a weekly "pace of aging" indicator so that I get timely feedback on whether my recent behavior changes are working.
- As a new user, I want to understand why Healthspan requires 6 months of data so that I don't feel the app is broken or withholding information.

---

## 13. Core Feature 6: AI Coach (RAG Pipeline)

### 13.1 Overview

The AI Coach is a conversational interface that transforms raw biometric data into personalized, actionable health guidance. It uses a Retrieval-Augmented Generation (RAG) architecture to ground its responses in the user's actual data and peer-reviewed health science.

### 13.2 Technical Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    User Query                             │
│            "Why was my recovery low today?"               │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│              Question Enrichment Agent                    │
│  - Detect user intent (data query, advice, plan)         │
│  - Identify relevant time window (today, this week)      │
│  - Detect current screen context (Sleep, Recovery, etc.) │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│              Data Retrieval Layer                         │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ User Data Store  │  │ Health Science Corpus         │  │
│  │ (PostgreSQL)     │  │ (Vector DB - pgvector/       │  │
│  │                  │  │  Pinecone)                   │  │
│  │ - Recovery scores│  │ - Peer-reviewed papers       │  │
│  │ - Strain history │  │ - Sleep science              │  │
│  │ - Sleep data     │  │ - Exercise physiology        │  │
│  │ - Journal entries│  │ - Nutrition research         │  │
│  │ - Workout logs   │  │ - Stress/HRV literature     │  │
│  └────────┬────────┘  └──────────────┬───────────────┘  │
│           └─────────────┬────────────┘                   │
└─────────────────────────┼────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│              LLM Response Generation                      │
│  Model: GPT-4 (or Claude API) via LangChain              │
│                                                           │
│  System Prompt includes:                                  │
│  - User profile (age, sex, fitness level, goals)         │
│  - Retrieved biometric context                            │
│  - Retrieved science context                              │
│  - Conversation history (last 10 messages)               │
│  - Current screen context                                 │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│              Response + Follow-up Suggestions             │
│  "Your recovery was 38% because your HRV dropped 22%    │
│   below your baseline. Your Journal shows you had 3      │
│   alcoholic drinks last night, which historically        │
│   reduces your recovery by 12%. Consider skipping        │
│   alcohol tonight to bounce back."                       │
│                                                           │
│  Suggested follow-ups:                                    │
│  - "How does alcohol affect my sleep stages?"            │
│  - "What should my strain target be today?"              │
│  - "Show me my recovery trend this month"                │
└──────────────────────────────────────────────────────────┘
```

### 13.3 Coach Capabilities

| Capability | Example Query | Data Required |
|-----------|---------------|---------------|
| **Recovery Explanation** | "Why is my recovery low?" | Last night's HRV, RHR, sleep, respiratory rate + previous day's strain + Journal entries |
| **Strain Guidance** | "How hard should I train today?" | Today's Recovery score → Strain Target mapping |
| **Sleep Advice** | "What time should I go to bed?" | Today's strain, accumulated sleep debt, user's baseline need |
| **Trend Analysis** | "How has my HRV changed this month?" | 30-day HRV time series |
| **Historical Query** | "What was my best recovery week?" | All-time recovery data, aggregated by week |
| **Behavioral Correlation** | "Does caffeine affect my sleep?" | Journal entries for caffeine + sleep quality metrics |
| **Training Plan** | "Build me a 5K training plan" | Current VO2 Max, recovery trends, weekly strain capacity |
| **Health Insight** | "Is my resting heart rate healthy?" | User's RHR + age/sex-stratified population norms |
| **Context-Aware** | (On Sleep screen) "Why was this bad?" | Automatically scope to last night's sleep data |
| **Memory/Goals** | "Remember I'm training for a marathon in June" | Stored in user profile, referenced in future responses |

### 13.4 Coach Memory and Personalization

The AI Coach must maintain a persistent memory store per user:

```swift
struct CoachMemory {
    let userId: UUID
    var longTermGoals: [String]        // "Training for Boston Marathon April 2027"
    var lifeContext: [String]          // "Has a 6-month-old baby", "Works night shifts"
    var preferences: [String]          // "Prefers metric units", "Vegetarian"
    var previousInsights: [Insight]    // Past coaching interactions the user found helpful
    var dislikedSuggestions: [String]  // Things the user has dismissed or disliked
}
```

This memory is included in the LLM system prompt so that all responses are contextually appropriate.

### 13.5 Backend API for Coach

```
POST /api/v1/coach/message
Headers:
  Authorization: Bearer <jwt_token>

Request Body:
{
  "message": "Why was my recovery low today?",
  "screen_context": "recovery",       // current app screen
  "conversation_id": "uuid",          // for multi-turn conversations
  "include_data_window": "7d"         // how much historical data to include
}

Response:
{
  "response": "Your recovery was 38% today because...",
  "data_citations": [
    {"metric": "HRV", "value": 42, "baseline": 58, "delta": "-27.6%"},
    {"metric": "Alcohol", "source": "journal", "value": "3 drinks"}
  ],
  "follow_up_suggestions": [
    "How does alcohol affect my sleep stages?",
    "What should my strain target be today?"
  ],
  "confidence": 0.89
}
```

### 13.6 AI Coach User Stories

- As a user, I want to ask the AI Coach natural-language questions about my health data so that I don't need to interpret charts and numbers myself.
- As a user on the Recovery screen, I want the Coach to automatically know I'm asking about recovery so that I don't need to provide redundant context.
- As a user training for a specific event, I want the Coach to remember my goal and factor it into all future recommendations.
- As a user, I want the Coach to correlate my Journal entries with my biometric data so that I can discover which behaviors impact my performance.
- As a user, I want the Coach to suggest follow-up questions after each response so that I can explore topics deeper without knowing what to ask.

---

## 14. Core Feature 7: Journal and Behavioral Correlation

### 14.1 Overview

The Journal is a daily morning survey that captures qualitative behavioral data from the previous day. When combined with biometric data, it enables the app's most powerful feature: statistically significant correlations between behaviors and physiological outcomes.

### 14.2 Journal Categories and Behaviors

The Journal supports 140+ trackable behaviors across these categories:

#### Lifestyle
| Behavior | Input Type | Options/Range |
|----------|-----------|---------------|
| Alcohol | Numeric | 0-10+ servings |
| Caffeine | Numeric | 0-5+ cups |
| Caffeine cutoff time | Time | Last caffeinated drink time |
| Cannabis | Toggle | Yes/No |
| Air travel | Toggle | Yes/No |
| Time zone change | Numeric | Hours of offset |
| Sexual activity | Toggle | Yes/No |
| Parenting (newborn care) | Toggle | Yes/No |
| Screen time before bed | Duration | 0, <30m, 30-60m, >60m |

#### Nutrition
| Behavior | Input Type | Options/Range |
|----------|-----------|---------------|
| Hydration level | Scale | Low / Moderate / High |
| Late meal (within 2h of bed) | Toggle | Yes/No |
| Intermittent fasting | Toggle | Yes/No |
| Specific diet (Keto, Vegan, etc.) | Multi-select | Diet types |
| Supplement intake | Multi-select | Magnesium, Melatonin, Vitamin D, Creatine, etc. |
| Processed food | Scale | None / Some / Significant |

#### Sleep Hygiene
| Behavior | Input Type | Options/Range |
|----------|-----------|---------------|
| Sleep mask | Toggle | Yes/No |
| Blue-light glasses | Toggle | Yes/No |
| Mouth tape | Toggle | Yes/No |
| Ear plugs | Toggle | Yes/No |
| Room temperature | Scale | Cold / Cool / Warm / Hot |
| Dog/cat in bedroom | Toggle | Yes/No |
| Phone in bedroom | Toggle | Yes/No |
| White noise / sound machine | Toggle | Yes/No |

#### Recovery Practices
| Behavior | Input Type | Options/Range |
|----------|-----------|---------------|
| Ice bath / cold plunge | Toggle + Duration | Yes/No, minutes |
| Sauna | Toggle + Duration | Yes/No, minutes |
| Stretching / Mobility | Toggle + Duration | Yes/No, minutes |
| Massage | Toggle | Yes/No |
| Compression boots | Toggle | Yes/No |
| Foam rolling | Toggle + Duration | Yes/No, minutes |

#### Mental Health
| Behavior | Input Type | Options/Range |
|----------|-----------|---------------|
| Meditation | Toggle + Duration | Yes/No, minutes |
| Gratitude practice | Toggle | Yes/No |
| Therapy session | Toggle | Yes/No |
| Perceived stress level | Scale | 1 (Low) - 5 (Very High) |
| Social interaction quality | Scale | 1 (Isolated) - 5 (Deeply Connected) |
| Journaling (written) | Toggle | Yes/No |

#### Medical
| Behavior | Input Type | Options/Range |
|----------|-----------|---------------|
| Medications taken | Multi-select | Common categories (NSAIDs, GLP-1, SSRIs, etc.) |
| Menstrual cycle phase | Select | Menstrual / Follicular / Ovulatory / Luteal |
| Feeling sick | Toggle | Yes/No |
| Allergy symptoms | Toggle | Yes/No |
| Pain level | Scale | 1-5 |

### 14.3 Statistical Requirements for Impact Reports

To generate a statistically meaningful "Impact" report for any behavior:

```
Minimum data requirements:
  - At least 5 days where the behavior was logged as "Yes" (or above median for scales)
  - At least 5 days where the behavior was logged as "No" (or below median for scales)
  - All within a 90-day rolling window

Impact Calculation:
  For each outcome metric (Recovery, HRV, Sleep Performance, Deep Sleep %):
    mean_yes = mean(metric on days where behavior = Yes)
    mean_no = mean(metric on days where behavior = No)
    delta = mean_yes - mean_no
    p_value = t_test(yes_days, no_days)
    effect_size = cohen_d(yes_days, no_days)

  Display threshold: only show impact if p_value < 0.05 AND |delta| > 2% of baseline

Display format:
  "Magnesium → Recovery: +4.2% (p=0.02)"
  "Alcohol (2+ drinks) → Deep Sleep: -18.3% (p<0.01)"
  "Ice Bath → HRV: +8.1% (p=0.04)"
```

### 14.4 Journal Behavioral Impact Dashboard

A dedicated dashboard view showing all behaviors that have reached statistical significance:

- **Sorted by effect size** (largest impact first)
- **Color-coded:** Green for positive impacts, Red for negative impacts
- **Tap to expand:** Shows the full statistical breakdown, day-by-day comparison chart, and a natural-language explanation from the AI Coach
- **"Experiment" mode:** The app suggests behaviors to test (e.g., "Try logging magnesium for the next 2 weeks to see if it reaches significance")

### 14.5 Journal User Stories

- As a user, I want to log my daily behaviors in under 60 seconds so that journaling doesn't feel burdensome.
- As a user, I want to see which behaviors statistically improve or worsen my recovery so that I can make evidence-based lifestyle changes.
- As a user, I want the Journal to only show behaviors I've selected as relevant so that I'm not overwhelmed by 140+ options.
- As a user, I want the app to suggest new behaviors to track based on my goals so that I can discover impactful habits I haven't considered.
- As a user, I want to see my Journal streak (consecutive days logged) so that I'm motivated to maintain the habit.

---

## 15. Core Feature 8: Community, Teams, and Social

### 15.1 Teams

Users can create or join **Teams** (public or private) to compare performance:

#### Team Structure
```swift
struct Team {
    let id: UUID
    let name: String
    let ownerUserId: UUID
    let isPublic: Bool
    let members: [TeamMember]
    let sharedMetrics: Set<SharedMetric>  // owner configures which metrics are visible
    let createdAt: Date
    let maxMembers: Int  // default 50
}

struct TeamMember {
    let userId: UUID
    let displayName: String
    let joinedAt: Date
    let role: TeamRole  // .owner, .admin, .member
}

enum SharedMetric: String, CaseIterable {
    case strain, recovery, sleepPerformance, sleepDuration, steps
}
```

#### Leaderboards
- **Views:** Daily, Weekly, Monthly
- **Metrics:** Strain (total), Recovery (average), Sleep Performance (average)
- **Ranking:** Sorted by selected metric, with user's position highlighted
- **Privacy:** Team owner configures which metrics are shared. Members cannot see unshared metrics.

#### Team Chat
- Simple messaging within the team (text only in v1)
- Reactions (emoji) on messages
- Automated "achievement" messages (e.g., "Alex hit a 20.1 strain today!")

### 15.2 Community User Stories

- As a user, I want to create a private team and invite friends so that we can hold each other accountable.
- As a team member, I want to see a leaderboard of strain scores so that friendly competition motivates me to stay active.
- As a team owner, I want to control which metrics my team can see so that members' privacy is respected.

---

## 16. Core Feature 9: Live Overlay and HR Broadcasting

### 16.1 Live Data Overlay

A feature allowing users to capture photos/videos with real-time biometric data overlaid as a graphical sticker:

- **Overlaid Metrics:** Live Heart Rate, Day Strain, Recovery %, Sleep Performance
- **Style:** Semi-transparent overlay with the app's brand colors
- **Sharing:** Direct share to Instagram Stories, iMessage, etc.
- **Implementation:** Camera overlay using AVCaptureSession with custom CALayer for metric display. Metrics pulled from the most recent HealthKit data.

### 16.2 Heart Rate Broadcasting (BLE)

The app can broadcast the user's heart rate via Bluetooth Low Energy, allowing third-party apps (Peloton, Zwift, Strava) to use it as a standard HR monitor:

- **Protocol:** Bluetooth Heart Rate Profile (standard BLE HR service UUID: `0x180D`)
- **Source:** Most recent heart rate from HealthKit
- **Implementation:** CoreBluetooth `CBPeripheralManager` advertising HR service
- **Limitation:** Data is relayed from HealthKit, not real-time sensor streaming. Latency of 5-60 seconds depending on Apple Watch sample rate.

---

## 17. UI/UX Design Specification

### 17.1 Design Principles

1. **Glanceable:** The most important information (Recovery, Strain, Sleep) must be visible within 1 second of opening the app
2. **Progressive Disclosure:** Summary → Detail → Deep Dive. Never overwhelm with data upfront.
3. **Dark-First:** Dark background (`#000000` or `#1C1C1E`) to reduce eye strain and improve contrast for colored metrics
4. **Accessibility:** Dynamic Type support, VoiceOver labels for all interactive elements, minimum tap targets of 44pt

### 17.2 Color System

| Purpose | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Recovery Green | Bright Green | `#16EC06` | High recovery, positive trends |
| Recovery Yellow | Amber | `#FFDE00` | Moderate recovery, caution |
| Recovery Red | Red | `#FF0026` | Low recovery, rest needed |
| Sleep Teal | Teal | `#00F19F` | Sleep metrics, REM stage |
| Strain Blue | Electric Blue | `#0A84FF` | Strain gauge, workout intensity |
| Deep Sleep | Deep Purple | `#4A3FB5` | SWS/Deep sleep stage |
| Light Sleep | Lavender | `#7B8CDE` | Core/Light sleep stage |
| Background Primary | True Black | `#000000` | Main background |
| Background Secondary | Dark Gray | `#1C1C1E` | Card backgrounds |
| Text Primary | White | `#FFFFFF` | Primary text |
| Text Secondary | Gray | `#8E8E93` | Secondary/muted text |
| Accent | Brand Teal | `#00F19F` | CTAs, interactive elements |

### 17.3 Navigation Architecture

**Five-tab bottom navigation bar:**

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  Home   │  Coach  │ My Plan │Community│ Health  │
│   🏠    │   🤖    │   📊    │   👥    │   💚    │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

| Tab | Primary Content | Secondary Content |
|-----|----------------|-------------------|
| **Home** | Triple-dial summary (Recovery, Strain, Sleep), "My Day" activity feed, Health Monitor alerts | Quick-access tiles for each metric |
| **Coach** | AI Coach chat interface, Strain Target widget, Sleep Planner, Weekly Performance Report | Suggested questions, conversation history |
| **My Plan** | Goal tracking, Weekly trends, Habit challenges, Training calendar | Progress toward user-defined goals |
| **Community** | Teams list, Leaderboards, Team chat, Team discovery | Friend activity feed |
| **Health** | Healthspan dashboard, Stress Monitor, Journal, Detailed metric history | VitalOS Age, Pace of Aging, Behavioral Impact reports |

### 17.4 Home Screen — Triple Dial Layout

The home screen features three circular gauge dials arranged in a triangular layout:

```
         ┌─────────────┐
         │   RECOVERY   │
         │    ╭───╮     │
         │   │ 78%│     │
         │    ╰───╯     │
         │   Green      │
         └──────┬───────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───▼───────┐       ┌──────▼────┐
│  STRAIN   │       │   SLEEP   │
│  ╭───╮    │       │   ╭───╮   │
│ │12.4│    │       │  │ 85%│   │
│  ╰───╯    │       │   ╰───╯   │
│ Target:14 │       │  7h 23m   │
└───────────┘       └───────────┘
```

**Dial Component Specification:**

```swift
struct CircularGaugeView: View {
    let value: Double          // 0-1 (percentage of max)
    let maxValue: Double       // e.g., 21 for strain, 99 for recovery
    let currentValue: Double   // actual numeric value to display
    let color: Color           // zone-based color
    let label: String          // "Recovery", "Strain", "Sleep"
    let subtitle: String       // "Green", "Target: 14", "7h 23m"

    // Implementation: ZStack with Circle()
    // Background track: Circle().stroke(gray, lineWidth: 8)
    // Progress arc: Circle().trim(from: 0, to: value)
    //   .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
    //   .rotationEffect(.degrees(-90))
    //   .animation(.easeInOut(duration: 1.0), value: value)
    // Center text: VStack { Text(currentValue), Text(subtitle) }
}
```

### 17.5 Tilt Mode (Landscape Heart Rate Graph)

When the device rotates to landscape orientation, the UI transitions to a full-width continuous heart rate graph for the current day:

- **X-axis:** Time (midnight to current time)
- **Y-axis:** Heart rate (BPM)
- **Colored zones:** Background bands for HR zones (Zone 1-5)
- **Workout highlights:** Shaded regions during active workouts
- **Touch interaction:** Drag to scrub through time, showing exact BPM and timestamp
- **Implementation:** Swift Charts `LineMark` with `AreaMark` for zone backgrounds

### 17.6 Trend Graphs

All metric tiles support a **tap-to-expand** interaction revealing trend graphs:

- **Toggle:** W (7 days) | M (30 days) | 6M (180 days)
- **Sparkline:** Mini trend line within the tile for at-a-glance direction
- **Expanded view:** Full-width chart with daily data points, 7-day rolling average overlay, and baseline reference line
- **Metric-specific:** Recovery shows zone-colored dots, Strain shows bar chart, Sleep shows stacked stage breakdown

---

## 18. Backend Architecture

### 18.1 Service Overview

| Service | Technology | Purpose |
|---------|-----------|---------|
| **API Gateway** | nginx or AWS API Gateway | Rate limiting, routing, SSL termination |
| **Auth Service** | Firebase Auth / Supabase Auth | User registration, Apple Sign-In, JWT issuance |
| **User Data Service** | FastAPI (Python) or Express (Node.js) | CRUD for user profiles, preferences, computed metrics |
| **Sync Service** | FastAPI (Python) | Receives computed metrics from iOS app, stores in PostgreSQL |
| **AI Coach Service** | Python (LangChain + FastAPI) | RAG pipeline, LLM orchestration, conversation management |
| **Community Service** | Express (Node.js) | Teams, leaderboards, chat, social features |
| **Notification Service** | Node.js + APNs | Push notification delivery, scheduling |
| **Analytics Pipeline** | PostHog / Mixpanel | Event ingestion, funnel analysis |

### 18.2 Database Schema (PostgreSQL)

```sql
-- Core user table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    date_of_birth DATE,
    sex VARCHAR(10),
    height_cm DECIMAL(5,1),
    weight_kg DECIMAL(5,1),
    max_heart_rate INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily computed metrics (one row per user per day)
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    date DATE NOT NULL,
    recovery_score DECIMAL(4,1),        -- 0-99
    recovery_zone VARCHAR(10),           -- green/yellow/red
    strain_score DECIMAL(4,1),           -- 0-21
    sleep_performance DECIMAL(4,1),      -- 0-100
    sleep_duration_minutes INT,
    sleep_need_minutes INT,
    sleep_debt_minutes INT,
    hrv_rmssd DECIMAL(6,2),
    hrv_sdnn DECIMAL(6,2),
    resting_hr DECIMAL(4,1),
    respiratory_rate DECIMAL(4,1),
    spo2 DECIMAL(4,1),
    avg_stress_score DECIMAL(3,1),       -- 0-3
    steps INT,
    active_calories INT,
    vo2_max DECIMAL(4,1),
    deep_sleep_minutes INT,
    rem_sleep_minutes INT,
    light_sleep_minutes INT,
    awake_minutes INT,
    sleep_efficiency DECIMAL(4,1),
    sleep_onset_latency_minutes INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Individual workout records
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    date DATE NOT NULL,
    workout_type VARCHAR(50),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INT,
    strain_score DECIMAL(4,1),
    avg_hr INT,
    max_hr INT,
    calories INT,
    zone1_minutes INT,
    zone2_minutes INT,
    zone3_minutes INT,
    zone4_minutes INT,
    zone5_minutes INT,
    muscular_load DECIMAL(5,1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entries
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    date DATE NOT NULL,
    behavior_key VARCHAR(100) NOT NULL,     -- e.g., "alcohol", "magnesium", "ice_bath"
    behavior_value JSONB NOT NULL,           -- {"type": "numeric", "value": 3} or {"type": "toggle", "value": true}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date, behavior_key)
);

-- Coach conversation history
CREATE TABLE coach_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);

CREATE TABLE coach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES coach_conversations(id),
    role VARCHAR(10) NOT NULL,               -- 'user' or 'assistant'
    content TEXT NOT NULL,
    data_citations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach memory (persistent user context)
CREATE TABLE coach_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    memory_type VARCHAR(50),                 -- 'goal', 'life_context', 'preference', 'insight'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ                   -- NULL = never expires
);

-- Teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    owner_id UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    shared_metrics JSONB DEFAULT '["strain", "recovery"]',
    max_members INT DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(team_id, user_id)
);

-- Healthspan (computed monthly)
CREATE TABLE healthspan_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    vital_age DECIMAL(4,1),
    chronological_age DECIMAL(4,1),
    pace_of_aging VARCHAR(20),              -- 'slowing', 'stable', 'accelerating'
    contributors JSONB,                      -- Array of {name, score, trend, weight}
    UNIQUE(user_id, computed_at)
);

-- Breathwork sessions
CREATE TABLE breathwork_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_type VARCHAR(30),               -- 'cyclic_sighing', 'cyclic_hyperventilation'
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    pre_stress_score DECIMAL(3,1),
    post_stress_score DECIMAL(3,1),
    pre_heart_rate DECIMAL(4,1),
    post_heart_rate DECIMAL(4,1),
    breath_cycles INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector embeddings for RAG (using pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE health_science_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(255),                     -- paper title, article URL
    chunk_text TEXT NOT NULL,
    embedding vector(1536),                  -- OpenAI ada-002 dimension
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON health_science_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 18.3 Webhook Architecture

For clients subscribed to real-time updates (e.g., team leaderboards, coaching):

```
Event Types:
  - recovery.computed       → new recovery score available
  - strain.updated          → strain score changed (new workout or HR data)
  - sleep.computed          → sleep analysis complete
  - workout.created         → new workout detected
  - workout.deleted         → workout removed
  - journal.submitted       → daily journal entry saved
  - healthspan.updated      → monthly healthspan recalculation

Delivery:
  - Message queue: Redis Pub/Sub (v1) or Apache Kafka (v2)
  - Retry policy: Exponential backoff with jitter
    Attempt 1: immediate
    Attempt 2: 30 seconds
    Attempt 3: 2 minutes
    Attempt 4: 10 minutes
    Attempt 5: 1 hour
  - Dead letter queue after 5 failed attempts
```

---

## 19. API and Developer Ecosystem

### 19.1 REST API v1

**Base URL:** `https://api.vitalos.app/v1`
**Authentication:** OAuth 2.0 Bearer tokens (JWT)
**Resource IDs:** UUID format

#### Endpoints

```
Authentication:
  POST   /auth/register              → Create account
  POST   /auth/login                 → Login (returns JWT)
  POST   /auth/apple-signin          → Apple Sign-In flow
  POST   /auth/refresh               → Refresh JWT token

User Profile:
  GET    /users/me                   → Get current user profile
  PATCH  /users/me                   → Update profile
  DELETE /users/me                   → Delete account and all data

Daily Metrics:
  GET    /metrics/daily              → List daily metrics (paginated, filterable by date range)
  GET    /metrics/daily/:date        → Get specific day's metrics
  GET    /metrics/daily/latest       → Get most recent day's metrics
  POST   /metrics/daily              → Sync computed metrics from iOS app

Recovery:
  GET    /recovery/latest            → Get today's recovery
  GET    /recovery/history           → Recovery history (date range, aggregation)
  GET    /recovery/trends            → 7d/30d/90d trend analysis

Strain:
  GET    /strain/today               → Get current day strain
  GET    /strain/target              → Get recommended strain target based on recovery
  GET    /strain/history             → Strain history

Sleep:
  GET    /sleep/latest               → Last night's sleep data
  GET    /sleep/history              → Sleep history with stage breakdowns
  GET    /sleep/planner              → Tonight's sleep recommendation
  GET    /sleep/debt                 → Current sleep debt calculation

Workouts:
  GET    /workouts                   → List workouts (paginated)
  GET    /workouts/:id               → Get workout detail with HR zones
  POST   /workouts                   → Create/sync workout

Journal:
  GET    /journal/today              → Get today's journal entry
  POST   /journal                    → Submit journal entry
  GET    /journal/impacts            → Get behavioral impact correlations
  GET    /journal/behaviors          → List available behaviors

Stress:
  GET    /stress/current             → Current stress score
  GET    /stress/timeline/:date      → Stress timeline for a day

Breathwork:
  POST   /breathwork/sessions        → Log a breathwork session
  GET    /breathwork/sessions        → List past sessions

Healthspan:
  GET    /healthspan/latest          → Current VitalOS Age and Pace of Aging
  GET    /healthspan/contributors    → Detailed contributor breakdown
  GET    /healthspan/history         → Monthly healthspan history

Coach:
  POST   /coach/message              → Send message to AI coach
  GET    /coach/conversations        → List conversations
  GET    /coach/conversations/:id    → Get conversation history

Teams:
  POST   /teams                      → Create team
  GET    /teams                      → List user's teams
  GET    /teams/:id                  → Get team details
  POST   /teams/:id/join             → Join a team
  DELETE /teams/:id/leave            → Leave a team
  GET    /teams/:id/leaderboard      → Get leaderboard (daily/weekly/monthly)
  POST   /teams/:id/messages         → Send team chat message
  GET    /teams/:id/messages         → Get team chat messages

Webhooks:
  POST   /webhooks                   → Register webhook endpoint
  GET    /webhooks                   → List registered webhooks
  DELETE /webhooks/:id               → Delete webhook
```

### 19.2 Third-Party Data Sync

| Health Platform | Data Read FROM Platform | Data Written TO Platform | Sync Method |
|----------------|------------------------|--------------------------|-------------|
| Apple Health | All biometric data (HR, HRV, Sleep, Steps, Workouts, VO2 Max, SpO2, RHR, Resp Rate, Body Comp) | Recovery score, Strain score, Sleep Performance (as custom HealthKit samples using `HKQuantityTypeIdentifierAppleExerciseTime` or custom types) | HealthKit API (on-device) |
| Garmin | Via Garmin Connect → Apple Health sync | N/A (read-only via HealthKit) | Indirect via HealthKit |
| Strava | N/A | Workout HR and strain data (via Strava API) | OAuth + REST API |
| TrainingPeaks | N/A | Sleep stages, HRV, RHR (via TrainingPeaks API) | OAuth + REST API |

---

## 20. Data Privacy, Security, and Compliance

### 20.1 Data Handling Principles

1. **On-Device First:** All biometric computation (Strain, Recovery, Sleep) runs locally on the device. Raw HealthKit data never leaves the device unless the user explicitly enables cloud sync.
2. **Minimal Backend Data:** The backend stores computed metrics (scores, not raw HR samples) for cloud sync, AI coaching, and community features.
3. **Encryption:** All data at rest (PostgreSQL, SwiftData) encrypted via AES-256. All data in transit via TLS 1.3.
4. **User Consent:** Explicit opt-in for each data sharing scope (HealthKit, cloud sync, community metrics, AI coaching data).
5. **Right to Delete:** Users can delete all data via account deletion. Cascading delete across all tables within 30 days.

### 20.2 HealthKit Compliance

Apple's HealthKit guidelines require:
- **Privacy Policy:** Must clearly describe all HealthKit data usage
- **No Advertising:** HealthKit data must never be used for advertising or sold to third parties
- **No iCloud Backup:** HealthKit data must not be stored in iCloud backup (SwiftData/CoreData stores for HealthKit-derived data should set `NSPersistentHistoryTrackingKey`)
- **Purpose String:** `NSHealthShareUsageDescription` must clearly explain why each data type is needed

### 20.3 Compliance Requirements

| Regulation | Requirement | Implementation |
|-----------|-------------|----------------|
| HIPAA | If health data is stored on backend | BAA with cloud provider, encrypted storage, access logging |
| GDPR | EU user data rights | Data export, deletion, consent management |
| CCPA | California user data rights | Opt-out of data sale (N/A as we don't sell data), data access requests |
| App Store | HealthKit usage guidelines | Privacy nutrition labels, no advertising use of health data |

---

## 21. User Stories (Complete)

### Onboarding

- As a new user, I want to sign up with Apple Sign-In so that I can start quickly without creating a separate account.
- As a new user, I want the app to clearly explain which HealthKit permissions it needs and why so that I feel comfortable granting access.
- As a new user, I want to enter my age, sex, height, and weight during onboarding so that the app can calibrate its algorithms to my physiology.
- As a new user, I want to see a meaningful dashboard within 24 hours (after one night of sleep data) so that I experience immediate value.
- As a new user, I want to select which Journal behaviors are relevant to me so that my daily survey is personalized and concise.

### Daily Usage

- As a user waking up, I want to see my Recovery score, last night's sleep breakdown, and today's strain target within 1 second of opening the app.
- As a user during a workout, I want my strain to update in near-real-time (within 5 minutes of new HealthKit data) so that I can pace my effort.
- As a user after a workout, I want to see a per-workout summary (strain, zones, duration, calories) automatically detected from HealthKit.
- As a user before bed, I want the Sleep Planner to tell me my recommended bedtime based on today's strain and my sleep debt.
- As a user every morning, I want to complete my Journal in under 60 seconds so that logging behaviors becomes a sustainable habit.

### Data Exploration

- As a power user, I want to toggle between weekly, monthly, and 6-month trend views for any metric.
- As a user, I want to rotate my phone to landscape to see a full-day heart rate timeline.
- As a user, I want to tap any metric tile to see its historical trend and personal baseline.

### Notifications

- As a user, I want a morning push notification with my Recovery score so that I see it before opening the app.
- As a user, I want a bedtime reminder notification at my recommended bedtime so that I maintain sleep consistency.
- As a user, I want an alert when my respiratory rate or RHR spikes abnormally so that I can watch for early signs of illness.
- As a user, I want to control which notifications I receive so that I'm not overwhelmed.

### Settings and Personalization

- As a user, I want to set my max heart rate manually so that my HR zones are accurate.
- As a user, I want to choose between metric and imperial units.
- As a user, I want to set my default performance goal (Peak, Perform, Get By) for the Sleep Planner.
- As a user, I want to export my data as CSV or JSON for personal analysis.
- As a user, I want to delete my account and all associated data.

---

## 22. Requirements Summary (MoSCoW)

### Must Have (P0) — MVP Launch

| ID | Requirement |
|----|-------------|
| P0-01 | HealthKit integration: read HR, HRV, RHR, sleep stages, steps, workouts, VO2 Max, respiratory rate |
| P0-02 | Recovery score computation (HRV, RHR, sleep performance, respiratory rate) with 28-day rolling baseline |
| P0-03 | Strain score computation (logarithmic, HR zone-weighted) with real-time accumulation |
| P0-04 | Sleep tracking: stage breakdown, duration, efficiency, performance score |
| P0-05 | Sleep Need engine: baseline + strain supplement + debt + nap credit |
| P0-06 | Home screen: Triple-dial (Recovery, Strain, Sleep) with color-coded zones |
| P0-07 | "My Day" activity feed showing detected workouts with individual strain |
| P0-08 | Per-workout HR zone breakdown (time-in-zone) |
| P0-09 | Strain Target based on Recovery zone |
| P0-10 | Sleep Planner with bedtime recommendation |
| P0-11 | Journal: daily survey with 50+ configurable behaviors |
| P0-12 | Trend graphs: 7-day, 30-day, 6-month views for all core metrics |
| P0-13 | User onboarding: Apple Sign-In, HealthKit permissions, profile setup |
| P0-14 | Background data sync via HKObserverQuery and BGTaskScheduler |
| P0-15 | Push notifications: morning Recovery, bedtime reminder, health alerts |
| P0-16 | Local data persistence (SwiftData/CoreData) for computed metrics |
| P0-17 | Settings: units, max HR, Sleep Planner goal, notification preferences |
| P0-18 | Data staleness handling: indicators when HealthKit data is outdated |
| P0-19 | Device compatibility detection: inform users of limited features on older devices |
| P0-20 | Privacy policy and HealthKit compliance |

### Should Have (P1) — Fast Follow

| ID | Requirement |
|----|-------------|
| P1-01 | AI Coach: conversational interface with context-aware responses |
| P1-02 | AI Coach: RAG pipeline with user data retrieval |
| P1-03 | AI Coach: memory and personalization (goals, life context) |
| P1-04 | Journal behavioral impact dashboard (statistical correlations) |
| P1-05 | Stress Monitor: real-time 0-3 score with motion suppression |
| P1-06 | Breathwork sessions (Cyclic Sighing, Cyclic Hyperventilation) with before/after analytics |
| P1-07 | Backend cloud sync for cross-device access |
| P1-08 | Teams: create, join, leaderboards |
| P1-09 | Muscular Load estimation for strength workouts |
| P1-10 | Tilt mode: landscape heart rate timeline |
| P1-11 | Weekly Performance Report (AI-generated summary) |
| P1-12 | Recovery insights: natural-language explanation of score drivers |

### Could Have (P2) — Future

| ID | Requirement |
|----|-------------|
| P2-01 | Healthspan suite: VitalOS Age, Pace of Aging, 9 contributors |
| P2-02 | Live data overlay for photos/videos |
| P2-03 | HR broadcasting via BLE |
| P2-04 | Strava and TrainingPeaks data export |
| P2-05 | Team chat |
| P2-06 | Training plan generation (marathon, 5K, etc.) |
| P2-07 | Apple Watch companion app (complication showing Recovery) |
| P2-08 | Widget (iOS home screen / lock screen) showing Recovery and Strain |
| P2-09 | Siri Shortcuts integration ("Hey Siri, what's my recovery?") |
| P2-10 | Data export (CSV/JSON) |

### Won't Have (This Version)

| ID | Requirement | Reason |
|----|-------------|--------|
| W-01 | Android app | iOS-first strategy; Android via Health Connect is a separate project |
| W-02 | Proprietary hardware integration | Software-only product; HealthKit provides all data |
| W-03 | Medical-grade diagnostics (ECG, AFib, BP) | Regulatory requirements; Apple doesn't expose raw ECG via HealthKit |
| W-04 | Custom workout video content | Content creation is out of scope; app focuses on data intelligence |
| W-05 | In-app purchases for physical products | No e-commerce in v1 |

---

## 23. Acceptance Criteria

### Recovery Score (P0-02)

- [ ] Given a user with 28+ days of HRV data, when sleep ends and HealthKit data is available, then a Recovery score between 1-99 is computed and displayed.
- [ ] Given HRV is 2+ standard deviations above the user's 28-day mean, then Recovery is in the Green zone (67-99%).
- [ ] Given HRV is 2+ standard deviations below the user's 28-day mean AND RHR is elevated, then Recovery is in the Red zone (1-33%).
- [ ] Given no sleep data is available for the previous night, then Recovery displays "Unavailable" with last known score grayed out.
- [ ] Given a user with fewer than 28 days of data, then the baseline is computed from available data with a minimum of 3 days required.
- [ ] Given respiratory rate spikes >3 breaths/min above baseline, then Recovery is penalized by at least 15 percentage points.

### Strain Calculation (P0-03)

- [ ] Given a sedentary day with no workouts, then day strain is between 2-5.
- [ ] Given a moderate 45-minute run with average HR in Zone 3, then workout strain is between 10-14.
- [ ] Given an intense 90-minute session with significant Zone 4-5 time, then workout strain is between 16-19.
- [ ] Given multiple workouts in a day, then day strain reflects the cumulative load (not additive — logarithmic compression).
- [ ] Given heart rate data arrives in HealthKit background delivery, then strain updates within 5 minutes.

### Sleep Tracking (P0-04)

- [ ] Given Apple Watch recorded sleep with stages, then the app displays Light, Deep, REM, and Awake durations and percentages.
- [ ] Given only legacy sleep data (asleep/awake), then the app displays total sleep time and efficiency without stage breakdown.
- [ ] Given a nap detected (sleep session <3 hours not during primary sleep window), then it is categorized as a nap and credited toward sleep need.
- [ ] Given Sleep Performance is computed, then it equals (Total Sleep Time / Sleep Need) × 100, clamped to 0-100.

### Journal (P0-11)

- [ ] Given a user has selected 15 behaviors to track, then the morning survey displays only those 15 behaviors.
- [ ] Given the user completes the Journal, then submission takes fewer than 60 seconds (measured by analytics event).
- [ ] Given 5 "Yes" and 5 "No" entries for a behavior within 90 days, then a behavioral impact report is generated.
- [ ] Given a behavior shows p<0.05 and delta >2%, then it appears on the Impact dashboard with effect size and direction.

---

## 24. Success Metrics

### Leading Indicators (Days to Weeks)

| Metric | Target | Measurement |
|--------|--------|-------------|
| HealthKit permission grant rate | >85% of users grant all required permissions | Analytics event on onboarding completion |
| Daily active users checking Recovery | >60% DAU view Recovery within 1 hour of waking | Analytics event timestamp analysis |
| Journal completion rate | >40% of DAU complete Journal daily | Journal submission events / DAU |
| AI Coach engagement (P1) | >25% of DAU send at least 1 Coach message per week | Coach message events |
| Sleep Planner usage | >30% of DAU view Sleep Planner at least 3x/week | Screen view events |
| Session duration | >3 minutes average per session | Analytics session duration |
| Crash-free rate | >99.5% | Crashlytics / Sentry |

### Lagging Indicators (Weeks to Months)

| Metric | Target | Measurement |
|--------|--------|-------------|
| D1 retention | >65% | Cohort analysis |
| D7 retention | >50% | Cohort analysis |
| D30 retention | >45% | Cohort analysis |
| Premium conversion (Coach access) | >8% within 90 days of install | Subscription events |
| NPS score | >50 | In-app survey at day 30 |
| Journal insight discovery | >30% of 90-day users find 1+ significant correlation | Impact report generation events |
| App Store rating | >4.5 stars | App Store Connect |

---

## 25. Technical Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
**Goal:** HealthKit data pipeline + local persistence + basic UI shell

- Set up Xcode project with SwiftUI, SwiftData, HealthKit entitlements
- Implement `HealthKitManager`: authorization, observer queries, anchored object queries
- Build data models for daily metrics, workouts, sleep sessions
- Implement background delivery (`HKObserverQuery` + `BGTaskScheduler`)
- Create basic tab navigation shell (5 tabs)
- Build Home screen layout with placeholder dials
- User onboarding flow: Apple Sign-In, HealthKit permissions, profile input

### Phase 2: Core Algorithms (Weeks 4-6)
**Goal:** Strain, Recovery, and Sleep engines fully functional

- Implement HR zone calculation (Max HR determination, zone classification)
- Implement Strain formula (logarithmic, zone-weighted, per-workout and daily)
- Implement RMSSD computation from heartbeat series (with SDNN fallback)
- Implement 28-day rolling baseline for all metrics
- Implement Recovery score computation (weighted composite, zone classification)
- Implement Sleep stage parsing from HealthKit
- Implement Sleep Need engine (baseline + strain + debt + nap)
- Implement Sleep Performance calculation
- Wire algorithms to SwiftData models

### Phase 3: UI Polish and Data Visualization (Weeks 7-9)
**Goal:** Production-quality UI with all P0 screens

- Build `CircularGaugeView` component with animations
- Build Home screen triple-dial layout with real data
- Build "My Day" activity feed with workout cards
- Build per-workout detail screen (HR zones, strain, timeline)
- Build Recovery detail screen (contributing factors, trend graph)
- Build Sleep detail screen (stage breakdown, hypnogram, Sleep Planner)
- Build trend graphs (W/M/6M toggle) using Swift Charts
- Build Journal survey UI (behavior selection, quick-toggle interface)
- Build Settings screen
- Implement dark theme and color system
- Implement tilt mode (landscape HR graph)
- Push notifications (morning Recovery, bedtime reminder, health alerts)

### Phase 4: Backend and Cloud Sync (Weeks 10-12)
**Goal:** User data synced to cloud for persistence and community features

- Set up PostgreSQL database with schema
- Build REST API (FastAPI or Express)
- Implement authentication (Firebase/Supabase + Apple Sign-In)
- Build sync service: iOS app pushes computed metrics to backend
- Implement webhook infrastructure (Redis Pub/Sub)
- Build data export endpoints (CSV/JSON)

### Phase 5: AI Coach (Weeks 13-16)
**Goal:** Conversational AI coach with RAG pipeline

- Set up vector database (pgvector)
- Ingest health science corpus (sleep research, exercise physiology, nutrition studies) into vector store
- Build LangChain RAG pipeline: question enrichment → data retrieval → LLM response
- Build Coach UI: chat interface, suggested questions, conversation history
- Implement Coach memory: goals, life context, preferences
- Implement context-awareness: screen-specific responses
- Build Recovery insights (natural-language score explanations)
- Build Weekly Performance Report generation

### Phase 6: Advanced Features (Weeks 17-20)
**Goal:** Stress Monitor, Breathwork, Journal Analytics, Community

- Implement Stress Monitor algorithm (HR deviation, motion suppression)
- Build Stress Monitor UI (real-time gauge, daily timeline)
- Build Breathwork sessions (Cyclic Sighing, Cyclic Hyperventilation)
- Build Breathwork UI (guided animation, before/after analytics)
- Implement Journal behavioral impact engine (t-tests, effect sizes, significance filtering)
- Build Impact Dashboard UI
- Build Teams: creation, joining, leaderboards
- Build Team chat (basic text messaging)

### Phase 7: Healthspan and Polish (Weeks 21-24)
**Goal:** Longevity features, Apple Watch widget, final polish

- Implement Healthspan calculation engine (9 contributors, VitalOS Age)
- Implement Pace of Aging weekly computation
- Build Healthspan Dashboard UI
- Build iOS Widget (Recovery + Strain on home/lock screen)
- Build Apple Watch complication (Recovery score)
- Performance optimization (HealthKit query batching, SwiftData indexing)
- Accessibility audit (Dynamic Type, VoiceOver, contrast ratios)
- Beta testing and crash resolution

---

## 26. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| OQ-1 | What is the optimal calibration constant `k` for the strain logarithm? Requires real-world data calibration. | Engineering | Non-blocking (start with estimated value, tune with user data) |
| OQ-2 | Should we use GPT-4 or Claude API for the AI Coach? Trade-offs: cost, latency, quality, fine-tuning support. | Engineering | Non-blocking (abstract behind LangChain, swap later) |
| OQ-3 | How do we handle Garmin users whose devices sync to Apple Health with a delay (sometimes 1-2 hours)? | Engineering | Non-blocking (staleness indicator covers this) |
| OQ-4 | Should the app write computed metrics (Recovery, Strain) back to Apple Health? If so, using which HKQuantityType? | Engineering + Apple Review | Blocking for HealthKit write-back feature |
| OQ-5 | What is the minimum HealthKit data required to show ANY value? Can we show Strain with just HR data and no sleep? | Product | Blocking (determines onboarding flow) |
| OQ-6 | Subscription pricing: what tier structure? Free (limited) + Premium (Coach + Healthspan)? | Business | Non-blocking for v1 development |
| OQ-7 | HIPAA compliance: is it required if we store health data on a backend server? | Legal | Blocking for backend launch (Phase 4) |
| OQ-8 | How do we handle users who wear their Apple Watch inconsistently (e.g., not during sleep)? | Product + Engineering | Non-blocking (graceful degradation) |
| OQ-9 | Should Journal behaviors be pre-populated or fully customizable? Trade-off between guided experience and flexibility. | Product | Non-blocking (start with curated list + custom option) |
| OQ-10 | How frequently should VitalOS Age update? Monthly seems right for stability, but users may want more frequent feedback. | Product | Non-blocking (start monthly, evaluate) |

---

## 27. Appendix

### A. Glossary

| Term | Definition |
|------|-----------|
| **Strain** | Quantified physiological exertion on a 0-21 logarithmic scale |
| **Recovery** | 0-99% score indicating physiological readiness for exertion |
| **Sleep Performance** | Ratio of actual sleep to calculated sleep need |
| **Sleep Need** | Dynamic daily sleep requirement based on baseline + strain + debt |
| **HRV (RMSSD)** | Root Mean Square of Successive Differences between heartbeats; measures parasympathetic nervous system activity |
| **HRV (SDNN)** | Standard Deviation of Normal-to-Normal intervals; general HRV measure |
| **RHR** | Resting Heart Rate; measured during sleep or prolonged rest |
| **HR Zone** | Heart rate intensity band defined as a percentage of maximum heart rate |
| **Muscular Load** | Estimated mechanical stress on muscles during strength training |
| **VitalOS Age** | Computed biological age based on 6 months of lifestyle and biometric data |
| **Pace of Aging** | Weekly indicator of whether current behaviors are accelerating or decelerating aging |
| **RAG** | Retrieval-Augmented Generation; AI architecture that grounds LLM responses in retrieved data |
| **HealthKit** | Apple's on-device health data framework that aggregates data from Apple Watch, Garmin, and other wearables |
| **BGTaskScheduler** | iOS framework for scheduling background processing tasks |

### B. Reference Heart Rate Zone Example

For a 30-year-old user with Max HR = 190 BPM:

| Zone | BPM Range | Example Activities |
|------|-----------|-------------------|
| Zone 1 | 95-114 | Walking, light stretching |
| Zone 2 | 114-133 | Easy jog, yoga flow |
| Zone 3 | 133-152 | Tempo run, moderate cycling |
| Zone 4 | 152-171 | Interval training, hill repeats |
| Zone 5 | 171-190 | All-out sprint, race finish |

### C. Recovery Score Example Calculation

```
User baseline (28-day rolling):
  HRV mean = 55ms, std = 12ms
  RHR mean = 58bpm, std = 3bpm
  Sleep Performance mean = 85%, std = 10%
  Respiratory Rate mean = 14 br/min, std = 1.5 br/min
  SpO2 mean = 97%, std = 1%

Last night's values:
  HRV = 62ms → z = (62-55)/12 = +0.58 → sigmoid(0.58) = 64.1 → score = 64.1
  RHR = 55bpm → z = (55-58)/3 = -1.0 → inverted: +1.0 → sigmoid(1.0) = 73.1 → score = 73.1
  Sleep Performance = 92% → z = (92-85)/10 = +0.7 → sigmoid(0.7) = 66.8 → score = 66.8
  Resp Rate = 13.5 → z = (13.5-14)/1.5 = -0.33 → inverted: +0.33 → sigmoid(0.33) = 58.2 → score = 58.2
  SpO2 = 98% → z = (98-97)/1 = +1.0 → sigmoid(1.0) = 73.1 → score = 73.1

Recovery = (64.1 × 0.30) + (73.1 × 0.25) + (66.8 × 0.25) + (58.2 × 0.10) + (73.1 × 0.10)
         = 19.23 + 18.28 + 16.70 + 5.82 + 7.31
         = 67.3%

Zone: Green (67-99%) ✅
```

### D. Sleep Need Example Calculation

```
User profile:
  Baseline need = 7.5 hours
  Today's strain = 16.2 (high)
  Past 7 days sleep debt:
    Day 1: needed 7.75h, got 7.0h → debt 0.75h
    Day 2: needed 7.5h, got 8.0h → debt 0h
    Day 3: needed 8.0h, got 6.5h → debt 1.5h
    Day 4: needed 7.5h, got 7.5h → debt 0h
    Day 5: needed 7.75h, got 7.25h → debt 0.5h
    Day 6: needed 7.5h, got 7.0h → debt 0.5h
    Day 7: needed 8.0h, got 7.5h → debt 0.5h
    Total debt = 3.75h

  Nap today = 25 minutes (0.42h)

Sleep Need = 7.5 + 0.5 + (3.75 × 0.2) - 0.42
           = 7.5 + 0.5 + 0.75 - 0.42
           = 8.33 hours (8h 20m)

For "Peak" goal (100%): need 8h 20m of sleep
For "Perform" goal (85%): need 7h 5m of sleep
For "Get By" goal (70%): need 5h 50m of sleep

If desired wake time = 6:30 AM and sleep onset latency = 12 min:
  Peak bedtime = 6:30 AM - 8h 20m - 12m = 9:58 PM
```

---

*End of Product Requirements Document*

*This PRD is designed to be used as a comprehensive reference for generating Claude Code prompts. Each section (especially Sections 7-16) can be extracted as a standalone prompt for implementing that specific feature module.*
