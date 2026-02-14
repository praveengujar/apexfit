# Product Requirements Document: ApexFit Watch — Apple Watch Companion App

**Version:** 1.0
**Author:** Praveen
**Date:** February 13, 2026
**Status:** Draft
**Target Platform:** watchOS 10+ (SwiftUI + WatchKit)
**Companion App:** ApexFit iOS (see `WHOOP_Clone_PRD.md`)
**Relationship:** This is the Apple Watch companion app to the ApexFit iOS app. It shares the same backend services, API layer, data models, authentication system, and algorithmic engines. This PRD defines only the watch-specific UI, interactions, complications, and on-wrist computation. All backend, mid-tier, and algorithmic specifications in the iOS PRD apply here and must not be duplicated.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Vision and Product Overview](#2-vision-and-product-overview)
3. [Goals](#3-goals)
4. [Non-Goals](#4-non-goals)
5. [Shared Architecture: What the Watch App Reuses](#5-shared-architecture-what-the-watch-app-reuses)
6. [Watch-Specific Architecture](#6-watch-specific-architecture)
7. [iOS ↔ watchOS Communication Layer](#7-ios--watchos-communication-layer)
8. [HealthKit on watchOS: Direct Sensor Access](#8-healthkit-on-watchos-direct-sensor-access)
9. [Feature 1: Watch Face Complications](#9-feature-1-watch-face-complications)
10. [Feature 2: Glance Dashboard (Main App View)](#10-feature-2-glance-dashboard-main-app-view)
11. [Feature 3: Live Workout Tracking](#11-feature-3-live-workout-tracking)
12. [Feature 4: Recovery and Sleep Summary](#12-feature-4-recovery-and-sleep-summary)
13. [Feature 5: Strain Monitor](#13-feature-5-strain-monitor)
14. [Feature 6: Stress and Breathwork](#14-feature-6-stress-and-breathwork)
15. [Feature 7: Quick Journal](#15-feature-7-quick-journal)
16. [Feature 8: Haptic Coaching and Smart Notifications](#16-feature-8-haptic-coaching-and-smart-notifications)
17. [Feature 9: Always-On Display](#17-feature-9-always-on-display)
18. [Feature 10: Digital Crown and Gesture Interactions](#18-feature-10-digital-crown-and-gesture-interactions)
19. [UI/UX Design Specification](#19-uiux-design-specification)
20. [Performance, Battery, and Thermal Constraints](#20-performance-battery-and-thermal-constraints)
21. [User Stories (Complete)](#21-user-stories-complete)
22. [Requirements Summary (MoSCoW)](#22-requirements-summary-moscow)
23. [Acceptance Criteria](#23-acceptance-criteria)
24. [Success Metrics](#24-success-metrics)
25. [Implementation Phases](#25-implementation-phases)
26. [Open Questions](#26-open-questions)
27. [Appendix: Complication Slot Reference](#27-appendix-complication-slot-reference)

---

## Important Note for Claude Code

**This Apple Watch app is the companion to the ApexFit iOS app. You must reference and reuse the following from the iOS PRD (`WHOOP_Clone_PRD.md`) without re-implementing them:**

- **Backend services** (Auth, User Data Sync, AI Coach, Community, Notification Engine) — identical endpoints, identical schema
- **Database schema** (PostgreSQL + pgvector) — the Watch app reads/writes to the same tables via the same API
- **Authentication** (Firebase/Supabase Auth, Apple Sign-In) — the Watch app inherits the iOS app's authenticated session via WatchConnectivity
- **Algorithmic engines** — Strain formula, Recovery calculation, Sleep Need engine, Stress scoring, Healthspan computation — all defined in the iOS PRD. The Watch app either (a) runs lightweight versions on-wrist for real-time display, or (b) receives pre-computed results from the iOS app via WatchConnectivity
- **API contract** — all REST endpoints defined in iOS PRD Section 19 are used by the Watch app through the iOS app as a proxy (Watch → WatchConnectivity → iOS → API) or directly when the Watch has independent connectivity (Wi-Fi/Cellular)
- **Data models** — the Swift structs and SwiftData models are shared via a Swift Package that both the iOS and watchOS targets import

**What is NEW in this PRD:** Watch-specific UI (complications, glances, compact layouts), on-wrist sensor access, WatchConnectivity transport, HKWorkoutSession/HKLiveWorkoutBuilder for live workout tracking, haptic coaching, Always-On Display states, Digital Crown interactions, and watchOS-specific background task scheduling.

---

## 1. Problem Statement

Apple Watch users who install the ApexFit iOS app currently have no way to view their Recovery, Strain, or Sleep scores on their wrist without pulling out their phone. This creates three friction points: (1) during workouts, users cannot see live strain accumulation or HR zone status without their phone nearby, (2) upon waking, users must open their phone to check Recovery before deciding their day's training intensity, and (3) throughout the day, users have no ambient awareness of their strain progress or stress levels on the device that is actually collecting the biometric data.

The Apple Watch is both the primary data source (it writes HR, HRV, sleep stages to HealthKit) and the most natural display surface for real-time biometric intelligence. Not having a Watch app means the data travels from wrist → HealthKit → phone → computation → phone screen, when it should be wrist → computation → wrist display.

**Who experiences this:** Every ApexFit user who owns an Apple Watch (estimated 85%+ of the user base given the HealthKit-first architecture).

**Cost of not solving it:** Users must unlock their phone dozens of times per day to check metrics that originate from their wrist. During workouts, this is disruptive and sometimes impossible (swimming, running). Competing apps (WHOOP, Oura, Garmin Connect) all offer native watch experiences.

---

## 2. Vision and Product Overview

**ApexFit Watch** transforms the Apple Watch from a passive data collector into an active performance coach on the wrist. It surfaces the three core metrics (Recovery, Strain, Sleep) as watch face complications, provides live workout tracking with real-time strain and HR zone feedback, and delivers haptic coaching nudges (bedtime reminders, strain target alerts, stress interventions) without requiring the phone.

**Design philosophy:** The Watch app is a **companion**, not a standalone replica. It prioritizes:
- **Glanceability** — see your Recovery in under 1 second via a complication
- **Live feedback** — real-time strain, HR zone, and stress during activity
- **Minimal interaction** — most value delivered passively through complications and notifications
- **Phone offload** — heavy computation (Recovery calculation, AI Coach, Journal analytics) happens on the iPhone or backend; the Watch receives and displays results

---

## 3. Goals

| # | Goal | Metric | Target |
|---|------|--------|--------|
| WG1 | Make Recovery visible without opening the phone | % of Watch users with an ApexFit complication active | >50% within 14 days of Watch app install |
| WG2 | Enable live workout strain tracking on-wrist | % of tracked workouts that use the Watch app | >70% of all HKWorkout sessions |
| WG3 | Improve strain target adherence through haptic coaching | % of users who end their day within ±2 of strain target | >40% of daily active Watch users |
| WG4 | Increase iOS app engagement via Watch as an entry point | Lift in iOS app DAU after Watch app launch | >15% DAU increase |
| WG5 | Deliver a sub-2-second launch experience | Time from tap to first meaningful content | <2 seconds cold launch, <0.5s complication tap |

---

## 4. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| WNG1 | Full AI Coach conversation on the Watch | Screen too small for conversational AI. Quick Coach summaries only; full conversations happen on iPhone. |
| WNG2 | Full Journal survey on the Watch | 140+ behaviors on a 45mm screen is unusable. Watch offers a Quick Journal (top 5 behaviors only); full Journal is iPhone-only. |
| WNG3 | Healthspan dashboard on the Watch | Too data-dense for the Watch. A single "ApexFit Age" complication is sufficient; full dashboard is iPhone-only. |
| WNG4 | Team leaderboards or social features | Social browsing requires a phone-sized screen. Watch only shows your own rank via notification. |
| WNG5 | Independent standalone operation without an iPhone ever being paired | watchOS apps require initial setup via iPhone. The Watch can operate independently for short periods (cellular/Wi-Fi) but initial auth and configuration require the iPhone. |
| WNG6 | Streaming music or audio content | Out of scope. ApexFit is data intelligence, not media. |

---

## 5. Shared Architecture: What the Watch App Reuses

This section explicitly maps every shared component to prevent Claude Code from re-implementing existing iOS infrastructure.

| Component | Defined In | How Watch Uses It |
|-----------|-----------|-------------------|
| **Backend API** (all REST endpoints) | iOS PRD Section 19 | Watch calls same endpoints via WatchConnectivity proxy or direct URLSession when iPhone is unavailable |
| **PostgreSQL schema** | iOS PRD Section 18.2 | Same tables — Watch-originating data (workouts, quick journal) written via same API |
| **Authentication** (Firebase/Supabase) | iOS PRD Section 18.1 | Watch inherits auth token from iPhone via WatchConnectivity `transferUserInfo`. No separate login flow on Watch. |
| **Strain formula** | iOS PRD Section 8.2 | Watch runs a lightweight Swift implementation of the same formula for real-time strain during workouts. Shares constants (k, c, zone multipliers). |
| **Recovery algorithm** | iOS PRD Section 9.2 | Watch does NOT compute Recovery. Receives pre-computed score from iPhone via WatchConnectivity. |
| **Sleep Need engine** | iOS PRD Section 10.4 | Watch does NOT compute Sleep Need. Receives pre-computed value from iPhone. |
| **Sleep stage parsing** | iOS PRD Section 10.2 | Watch does NOT analyze sleep stages. Receives sleep summary from iPhone. |
| **Stress algorithm** | iOS PRD Section 11.2 | Watch runs a lightweight version for on-wrist stress display. Simplified: HR deviation only (no HRV in real-time on watchOS). |
| **HRV (RMSSD) calculation** | iOS PRD Section 7.3 | Shared Swift function in a common Swift Package. Watch can compute RMSSD from `HKHeartbeatSeriesSample` during background processing. |
| **Webhook system** | iOS PRD Section 18.3 | Watch does not consume webhooks directly. iPhone receives webhooks and forwards relevant updates to Watch via WatchConnectivity. |
| **Push notifications** | iOS PRD Section 18.1 | Push notifications delivered to Watch via standard iOS → watchOS notification mirroring, plus Watch-specific local notifications for haptic coaching. |
| **Data models** (Swift structs) | iOS PRD Section 6 | Shared via a **Swift Package** (`ApexFitCore`) imported by both iOS and watchOS targets. Contains: `DailyMetrics`, `Workout`, `SleepSession`, `JournalEntry`, `RecoveryScore`, `StrainScore`, etc. |
| **Color system** | iOS PRD Section 17.2 | Identical hex codes. Watch uses same color mapping for zones (Green/Yellow/Red for Recovery, etc.). |
| **AI Coach backend** | iOS PRD Section 13 | Watch sends quick queries to the same `/api/v1/coach/message` endpoint. Responses are truncated for Watch display (max 150 words). |

### Shared Swift Package: `ApexFitCore`

Both the iOS app target and watchOS app target must depend on a shared Swift Package that contains:

```
ApexFitCore/
├── Models/
│   ├── DailyMetrics.swift         // SwiftData model for daily computed metrics
│   ├── Workout.swift              // Workout data model
│   ├── SleepSession.swift         // Sleep session with stage breakdowns
│   ├── JournalEntry.swift         // Journal behavior entry
│   ├── RecoveryScore.swift        // Recovery score + zone + contributing factors
│   ├── StrainScore.swift          // Strain score + breakdown
│   ├── StressReading.swift        // Stress score data point
│   ├── BreathworkSession.swift    // Breathwork session record
│   ├── HealthspanScore.swift      // Healthspan/ApexFit Age data
│   └── UserProfile.swift          // User profile (age, sex, max HR, etc.)
├── Algorithms/
│   ├── StrainCalculator.swift     // Logarithmic strain formula
│   ├── RecoveryCalculator.swift   // Composite recovery with baseline normalization
│   ├── SleepAnalyzer.swift        // Sleep need, performance, stage analysis
│   ├── StressCalculator.swift     // Stress score with motion suppression
│   ├── HRVCalculator.swift        // RMSSD computation from RR intervals
│   ├── HRZoneClassifier.swift     // Zone determination from Max HR
│   └── BaselineEngine.swift       // 28-day rolling baseline computation
├── Networking/
│   ├── APIClient.swift            // URLSession-based REST client
│   ├── APIEndpoints.swift         // All endpoint definitions
│   └── AuthManager.swift          // Token management (shared between platforms)
├── HealthKit/
│   ├── HealthKitManager.swift     // HKHealthStore queries (read)
│   └── HealthKitTypes.swift       // All HKObjectType identifiers used
└── Utilities/
    ├── ColorSystem.swift          // Brand colors (hex → SwiftUI Color)
    ├── Formatters.swift           // Number/date formatters
    └── Constants.swift            // Strain calibration constants, zone thresholds
```

**Claude Code instruction:** When building the Watch app, create this shared package FIRST. Refactor any existing iOS-only code into this package. Both the iOS target (`ApexFit`) and watchOS target (`ApexFit Watch`) must import `ApexFitCore`. Never duplicate algorithm implementations across targets.

---

## 6. Watch-Specific Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Apple Watch App                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SwiftUI Watch Views                      │   │
│  │  Complications · Glance · Workout · Breathwork       │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │        Watch View Models (watchOS-specific)           │   │
│  │  ComplicationDataSource · WorkoutManager              │   │
│  │  GlanceViewModel · HapticCoachingEngine               │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │     ApexFitCore (Shared Swift Package)                │   │
│  │  Models · Algorithms · Networking · HealthKit         │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │     Watch-Specific Services                           │   │
│  │                                                       │   │
│  │  ┌─────────────────┐  ┌──────────────────────────┐   │   │
│  │  │ WCSession       │  │ HKWorkoutSession         │   │   │
│  │  │ Manager         │  │ + HKLiveWorkoutBuilder   │   │   │
│  │  │ (Phone Comms)   │  │ (Live Workout Tracking)  │   │   │
│  │  └────────┬────────┘  └──────────┬───────────────┘   │   │
│  │           │                      │                    │   │
│  │  ┌────────▼────────┐  ┌──────────▼───────────────┐   │   │
│  │  │ ExtendedRuntime │  │ CLKComplicationServer     │   │   │
│  │  │ Session         │  │ (Complication Updates)    │   │   │
│  │  │ (Background)    │  │                           │   │   │
│  │  └─────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Local Persistence                        │   │
│  │  SwiftData (subset of iOS schema)                    │   │
│  │  Cached: today's metrics, active workout, last sleep │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
              ▼            ▼                ▼
     WatchConnectivity  HealthKit     Direct Network
     (↔ iPhone App)    (on-wrist)   (Wi-Fi/Cellular
                                     when phone absent)
```

### watchOS Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI | SwiftUI (watchOS 10+) | All Watch views, complications via `WidgetKit` |
| Complications | WidgetKit (watchOS 10+) | Watch face complications using `TimelineProvider` |
| Live Workout | `HKWorkoutSession` + `HKLiveWorkoutBuilder` | Real-time HR, calorie, and distance during workouts |
| Phone Communication | `WCSession` (WatchConnectivity) | Bidirectional data transfer with iPhone |
| Background Tasks | `WKApplicationRefreshBackgroundTask` + `WKSnapshotRefreshBackgroundTask` | Periodic metric updates |
| Extended Runtime | `WKExtendedRuntimeSession` | Breathwork sessions, extended stress monitoring |
| Local Storage | SwiftData (shared models from `ApexFitCore`) | Cached metrics for offline display |
| Haptics | `WKInterfaceDevice.current().play(_:)` | Zone transitions, coaching nudges, breathing guides |
| Networking | URLSession (when iPhone unavailable) | Direct API calls via Wi-Fi/Cellular |
| Sensors | HealthKit real-time queries + CoreMotion | HR streaming during workouts, accelerometer for motion suppression |

---

## 7. iOS ↔ watchOS Communication Layer

### 7.1 WatchConnectivity Architecture

The iPhone and Apple Watch communicate via Apple's `WatchConnectivity` framework. The communication is bidirectional and uses multiple transport mechanisms depending on data urgency.

```swift
// Shared protocol for Watch ↔ Phone messaging
class WatchConnectivityManager: NSObject, WCSessionDelegate {
    static let shared = WatchConnectivityManager()
    private let session = WCSession.default

    func activate() {
        session.delegate = self
        session.activate()
    }
}
```

### 7.2 Data Transfer Mechanisms

| Mechanism | API | Latency | Use Case | Direction |
|-----------|-----|---------|----------|-----------|
| **Application Context** | `updateApplicationContext(_:)` | Seconds to minutes | Latest Recovery, Strain, Sleep scores. Watch reads most recent context on launch. | iPhone → Watch |
| **User Info Transfer** | `transferUserInfo(_:)` | Minutes (queued, guaranteed) | Auth tokens, user profile updates, full daily metrics payload. Queued and delivered even if Watch app is not running. | Bidirectional |
| **Message (Interactive)** | `sendMessage(_:replyHandler:)` | Sub-second (if reachable) | Real-time requests: "What's my current strain?" Quick Coach queries. Only works when both apps are active and connected. | Bidirectional |
| **File Transfer** | `transferFile(_:metadata:)` | Minutes (queued) | Bulk historical data sync (e.g., past 7 days of metrics for trend display). Large payloads. | iPhone → Watch |
| **Complication Transfer** | `transferCurrentComplicationUserInfo(_:)` | Near-immediate (high priority) | Complication-specific data updates. Budget: 50 transfers/day. | iPhone → Watch |

### 7.3 Data Flow Patterns

#### Pattern 1: Morning Recovery Delivery (iPhone → Watch)

```
1. iPhone detects new sleep data in HealthKit (via HKObserverQuery)
2. iPhone computes Recovery score using RecoveryCalculator (from ApexFitCore)
3. iPhone calls WCSession.default.transferCurrentComplicationUserInfo([
     "recovery_score": 78,
     "recovery_zone": "green",
     "strain_target_low": 14.0,
     "strain_target_high": 18.0,
     "sleep_performance": 91,
     "sleep_duration_minutes": 443,
     "timestamp": Date().timeIntervalSince1970
   ])
4. watchOS receives payload → updates complication data source → complication refreshes
5. User glances at watch face → sees "78%" in green on the ApexFit complication
```

#### Pattern 2: Live Workout Strain (Watch → iPhone)

```
1. User starts workout on Watch (or auto-detected via HKWorkoutSession)
2. Watch receives real-time HR via HKLiveWorkoutBuilder
3. Watch computes incremental strain locally using StrainCalculator (from ApexFitCore)
4. Every 30 seconds, Watch sends live metrics to iPhone:
   WCSession.default.sendMessage([
     "type": "workout_live",
     "current_strain": 8.4,
     "current_hr": 156,
     "current_zone": 4,
     "elapsed_seconds": 1200,
     "calories": 320
   ], replyHandler: nil)
5. iPhone updates its UI if the app is in foreground
6. When workout ends, Watch sends final summary via transferUserInfo (guaranteed delivery)
```

#### Pattern 3: Quick Coach Query (Watch → iPhone → Backend → Watch)

```
1. User raises wrist, opens ApexFit, taps "Ask Coach"
2. Watch sends message to iPhone:
   WCSession.default.sendMessage([
     "type": "coach_query",
     "message": "Should I work out today?",
     "screen_context": "recovery"
   ], replyHandler: { reply in
     // Display truncated coach response on Watch
   })
3. iPhone receives message → calls POST /api/v1/coach/message
4. iPhone receives API response → sends reply back to Watch
5. Watch displays truncated response (max 150 words) with "Open on iPhone" button for full conversation
```

#### Pattern 4: Offline Mode (Watch Only, No iPhone)

```
When iPhone is unreachable (out of Bluetooth range, powered off):
1. Watch uses cached data from last ApplicationContext update
2. Watch can compute live strain during workouts independently (all algorithms in ApexFitCore)
3. Watch queues any new data (workout results, quick journal entries) in local SwiftData
4. When iPhone becomes reachable, queued data is flushed via transferUserInfo
5. If Watch has Wi-Fi or Cellular: Watch can call the backend API directly using cached auth token
   - Fetches latest Recovery, Strain from /api/v1/metrics/daily/latest
   - Sends workout data to POST /api/v1/workouts
   - This is a fallback; WatchConnectivity via iPhone is preferred
```

### 7.4 Application Context Payload Schema

The iPhone maintains a single `applicationContext` dictionary that represents the latest snapshot of all Watch-relevant data:

```swift
struct WatchApplicationContext: Codable {
    // Recovery
    let recoveryScore: Double           // 0-99
    let recoveryZone: String            // "green", "yellow", "red"
    let recoveryTimestamp: Date

    // Strain
    let currentDayStrain: Double        // 0-21
    let strainTargetLow: Double         // e.g., 14.0
    let strainTargetHigh: Double        // e.g., 18.0
    let strainTimestamp: Date

    // Sleep
    let sleepPerformance: Double        // 0-100
    let sleepDurationMinutes: Int
    let sleepNeedMinutes: Int
    let deepSleepMinutes: Int
    let remSleepMinutes: Int
    let lightSleepMinutes: Int

    // Stress
    let currentStressScore: Double      // 0-3
    let stressTimestamp: Date

    // Healthspan (if available)
    let apexFitAge: Double?
    let paceOfAging: String?            // "slowing", "stable", "accelerating"

    // Sleep Planner
    let recommendedBedtime: Date?
    let sleepDebtMinutes: Int

    // User Profile (for on-wrist calculations)
    let maxHeartRate: Int
    let restingHeartRateBaseline: Double
    let hrvBaseline: Double
    let baselineSleepNeedMinutes: Int

    // Auth
    let authToken: String               // JWT for direct API calls
    let tokenExpiry: Date
}
```

The iPhone updates this context whenever a core metric changes. The Watch reads this on launch, on complication refresh, and on `WCSessionDelegate.session(_:didReceiveApplicationContext:)`.

---

## 8. HealthKit on watchOS: Direct Sensor Access

### 8.1 Advantage Over iOS-Only Architecture

The Apple Watch has a critical advantage: it has **direct, real-time access to sensors** via HealthKit and CoreMotion. While the iOS app reads HealthKit data after Apple Watch writes it (with a delay), the watchOS app can:

1. **Stream live heart rate** during workouts via `HKLiveWorkoutBuilder`
2. **Access accelerometer/gyroscope** via CoreMotion for motion suppression
3. **Read heart rate variability** during background sessions
4. **Detect workout start/end** automatically via `HKWorkoutSession`

### 8.2 HealthKit Workout Session (Live Tracking)

```swift
class WatchWorkoutManager: NSObject, ObservableObject, HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {

    let healthStore = HKHealthStore()
    var workoutSession: HKWorkoutSession?
    var liveBuilder: HKLiveWorkoutBuilder?

    @Published var currentHeartRate: Double = 0
    @Published var currentCalories: Double = 0
    @Published var currentDistance: Double = 0
    @Published var elapsedTime: TimeInterval = 0
    @Published var currentStrain: Double = 0
    @Published var currentZone: Int = 1

    // Configuration to collect during workout
    let workoutConfiguration: HKWorkoutConfiguration = {
        let config = HKWorkoutConfiguration()
        config.activityType = .running  // set dynamically
        config.locationType = .outdoor  // set dynamically
        return config
    }()

    // Data types collected during live workout
    let liveDataTypes: Set<HKQuantityType> = [
        HKQuantityType(.heartRate),
        HKQuantityType(.activeEnergyBurned),
        HKQuantityType(.distanceWalkingRunning),
        HKQuantityType(.runningSpeed),
        HKQuantityType(.runningPower),
        HKQuantityType(.stepCount)
    ]

    func startWorkout(type: HKWorkoutActivityType) async throws {
        let config = HKWorkoutConfiguration()
        config.activityType = type
        config.locationType = .outdoor

        workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: config)
        liveBuilder = workoutSession?.associatedWorkoutBuilder()
        liveBuilder?.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)

        workoutSession?.delegate = self
        liveBuilder?.delegate = self

        let startDate = Date()
        workoutSession?.startActivity(with: startDate)
        try await liveBuilder?.beginCollection(at: startDate)
    }

    // Called by HKLiveWorkoutBuilderDelegate when new data arrives
    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }

            switch quantityType {
            case HKQuantityType(.heartRate):
                let stats = workoutBuilder.statistics(for: quantityType)
                let hr = stats?.mostRecentQuantity()?.doubleValue(for: .count().unitDivided(by: .minute())) ?? 0
                DispatchQueue.main.async {
                    self.currentHeartRate = hr
                    self.currentZone = HRZoneClassifier.zone(for: hr, maxHR: self.maxHeartRate)
                    self.recalculateStrain()
                }
            case HKQuantityType(.activeEnergyBurned):
                let stats = workoutBuilder.statistics(for: quantityType)
                let cal = stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
                DispatchQueue.main.async { self.currentCalories = cal }
            default:
                break
            }
        }
    }

    // Real-time strain calculation using shared ApexFitCore algorithm
    private func recalculateStrain() {
        // Uses StrainCalculator from ApexFitCore
        // Accumulates weighted HR zone time since workout start
        // Returns current workout strain on 0-21 scale
    }
}
```

### 8.3 watchOS-Specific HealthKit Capabilities

| Capability | API | iOS Equivalent | Watch Advantage |
|-----------|-----|---------------|-----------------|
| Live HR streaming | `HKLiveWorkoutBuilder` | Not available (post-hoc only) | Real-time HR during workouts with ~1s latency |
| Background HR | `HKObserverQuery` (watchOS) | Same, but data arrives from Watch with delay | Watch has first access to its own HR data |
| Workout auto-detection | `HKWorkoutSession` auto-start | Not available | Watch can detect workout start and prompt user |
| Water lock | `WKInterfaceDevice.current().enableWaterLock()` | N/A | Prevent accidental taps during swim workouts |
| Haptic feedback | `WKInterfaceDevice.current().play(_:)` | `UIImpactFeedbackGenerator` | Wrist taps for zone transitions, breathing guides |
| Extended runtime | `WKExtendedRuntimeSession` | `BGProcessingTask` | Keep app active for breathwork, long workouts |
| Always-On Display | `TimelineView` + `.isLuminanceReduced` | N/A | Show metrics while wrist is lowered |

---

## 9. Feature 1: Watch Face Complications

### 9.1 Overview

Complications are the single most important Watch feature. They provide glanceable data on the watch face without launching the app. ApexFit must provide complications for every standard slot type.

### 9.2 Complication Families (WidgetKit)

Starting watchOS 10, complications are built using WidgetKit (same framework as iOS widgets). The app must provide `TimelineProvider` implementations for each family.

| Widget Family | Size | Content | Visual |
|--------------|------|---------|--------|
| `accessoryCircular` | Small circle | Recovery % with colored ring | Circular gauge matching the iOS dial. Green/Yellow/Red ring, percentage number in center. |
| `accessoryCorner` | Watch corner (curved) | Day Strain with arc progress | Curved arc showing strain progress toward target. Number at inner edge. |
| `accessoryRectangular` | Medium rectangle | Recovery + Strain + Sleep triple summary | Three-column layout: Recovery (colored), Strain (with target), Sleep (duration + performance). |
| `accessoryInline` | Single text line | "Recovery: 78% · Strain: 12.4" | Plain text, most compatible, works on all watch faces. |
| `graphicCircular` (legacy) | Circular graphic | Recovery gauge | For watchOS 9 compatibility if needed. |

### 9.3 Complication Data Source

```swift
struct ApexFitComplicationProvider: TimelineProvider {

    typealias Entry = ApexFitComplicationEntry

    // Placeholder shown during loading
    func placeholder(in context: Context) -> ApexFitComplicationEntry {
        ApexFitComplicationEntry(
            date: Date(),
            recoveryScore: 75,
            recoveryZone: .green,
            strainScore: 10.0,
            strainTarget: 14.0,
            sleepPerformance: 85,
            sleepDuration: "7h 23m"
        )
    }

    // Snapshot for Watch face gallery preview
    func getSnapshot(in context: Context, completion: @escaping (ApexFitComplicationEntry) -> Void) {
        let entry = currentEntryFromCache()
        completion(entry)
    }

    // Timeline: provide current data + schedule next update
    func getTimeline(in context: Context, completion: @escaping (Timeline<ApexFitComplicationEntry>) -> Void) {
        let currentEntry = currentEntryFromCache()

        // Schedule next update in 15 minutes (budget-conscious)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [currentEntry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func currentEntryFromCache() -> ApexFitComplicationEntry {
        // Read from WatchConnectivity applicationContext (cached locally)
        // If no data available, return last cached values from SwiftData
    }
}

struct ApexFitComplicationEntry: TimelineEntry {
    let date: Date
    let recoveryScore: Double
    let recoveryZone: RecoveryZone
    let strainScore: Double
    let strainTarget: Double
    let sleepPerformance: Double
    let sleepDuration: String
}
```

### 9.4 Complication Update Strategy

| Trigger | Method | Budget |
|---------|--------|--------|
| iPhone computes new Recovery (morning) | `transferCurrentComplicationUserInfo` | 50/day (sufficient — Recovery changes once/day) |
| Strain updates during workout | Local computation on Watch → `WidgetCenter.shared.reloadAllTimelines()` | Unlimited (on-device) |
| Periodic refresh (every 15 min) | `TimelineProvider` policy `.after(date)` | System-managed |
| User launches app | `WidgetCenter.shared.reloadAllTimelines()` | Unlimited (triggered by user action) |

### 9.5 Complication Visual Specifications

#### Accessory Circular (Recovery)

```
     ╭─────╮
    │       │      ← Colored arc (green/yellow/red)
    │  78%  │      ← Recovery percentage, bold
    │       │
     ╰─────╯

Ring thickness: 4pt
Ring color: Recovery zone color (from ColorSystem in ApexFitCore)
Background: Semi-transparent dark
Font: .system(size: 20, weight: .bold, design: .rounded)
```

#### Accessory Corner (Strain)

```
    12.4 ─────────╮
                   │      ← Curved arc showing progress toward strain target (e.g., 12.4 of 18.0)
                   │
    Target: 18  ──╯

Arc color: Strain Blue (#0A84FF)
Arc fill: currentStrain / strainTarget
Text: .system(size: 14, weight: .semibold)
```

#### Accessory Rectangular (Triple Summary)

```
┌──────────────────────────────┐
│ 🟢 78%    12.4/18   💤 91%  │
│ Recovery   Strain    Sleep   │
└──────────────────────────────┘

Row 1: Values with zone color dot for Recovery
Row 2: Labels in secondary gray
Font: .system(size: 13, weight: .medium)
```

---

## 10. Feature 2: Glance Dashboard (Main App View)

### 10.1 Overview

When the user opens the ApexFit Watch app, they see a single-screen "Glance Dashboard" that presents all critical metrics in a vertically scrollable layout optimized for the small screen.

### 10.2 Screen Layout

```
┌─────────────────────────────┐
│      ╭─────────────╮        │
│     │   RECOVERY    │       │
│     │    ╭───╮      │       │
│     │   │ 78%│      │       │  ← Circular gauge, colored by zone
│     │    ╰───╯      │       │
│     │   Green       │       │
│      ╰─────────────╯        │
│                              │
│  ┌──────────┬──────────┐    │
│  │ STRAIN   │  SLEEP   │    │  ← Side-by-side mini dials
│  │  12.4    │   91%    │    │
│  │ /18 tgt  │  7h 23m  │    │
│  └──────────┴──────────┘    │
│                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━    │  ← Divider
│                              │
│  Stress: 0.8  ■■□□  Low    │  ← Stress bar
│                              │
│  ┌──────────────────────┐   │
│  │ 🏃 Run · 45m · 12.1  │   │  ← Latest workout card
│  │    Z3: 18m  Z4: 12m  │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │ Sleep Planner         │   │
│  │ Bed by 10:15 PM      │   │  ← Tonight's bedtime
│  │ Need: 8h 20m         │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │ 💬 Ask Coach          │   │  ← Quick Coach entry point
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │ 📝 Quick Journal      │   │  ← Quick journal (top 5 behaviors)
│  └──────────────────────┘   │
│                              │
└─────────────────────────────┘
        (scrollable)
```

### 10.3 Data Source Priority

The Glance Dashboard pulls data from these sources in priority order:

1. **WatchConnectivity Application Context** (most recent iPhone-computed data)
2. **Local SwiftData cache** (if Application Context is stale or unavailable)
3. **Direct API call** (if iPhone unreachable and Watch has network access)
4. **Stale data with badge** (if all sources fail, show last known values with "Last updated X hours ago")

### 10.4 Tap Interactions

| Element | Tap Action |
|---------|-----------|
| Recovery dial | Navigate to Recovery Detail view (simplified: score, 4 contributing factors with arrows, 7-day sparkline) |
| Strain dial | Navigate to Strain Detail view (today's strain timeline, per-workout list, zone breakdown) |
| Sleep dial | Navigate to Sleep Detail view (stage breakdown bar, sleep/wake times, performance) |
| Stress bar | Navigate to Stress Detail view (day timeline, current score, "Start Breathwork" button) |
| Workout card | Navigate to Workout Detail view (HR chart, zone time, strain) |
| Sleep Planner | Navigate to Sleep Planner view (bedtime, need breakdown, performance goal picker) |
| Ask Coach | Navigate to Quick Coach view (preset questions + free text via voice dictation) |
| Quick Journal | Navigate to Quick Journal view (top 5 behavior toggles) |

---

## 11. Feature 3: Live Workout Tracking

### 11.1 Overview

The Watch app's most performance-critical feature. When a workout begins (user-initiated or auto-detected), the Watch enters a live tracking mode showing real-time heart rate, HR zone, elapsed time, calories, and live strain accumulation.

### 11.2 Workout Start Flow

```
User taps "Start Workout" on Watch
  │
  ├── Select workout type (list of 12 most common types)
  │   ├── 🏃 Run (Outdoor/Indoor)
  │   ├── 🚴 Cycle (Outdoor/Indoor)
  │   ├── 🏊 Swim (Pool/Open Water)
  │   ├── 🏋️ Strength Training
  │   ├── ⚡ HIIT
  │   ├── 🧘 Yoga
  │   ├── 🚶 Walk
  │   ├── 🥊 Boxing / Martial Arts
  │   ├── 🏔 Hiking
  │   ├── 🎾 Tennis / Racquet
  │   ├── ⛳ Golf
  │   └── ❓ Other
  │
  ├── 3-2-1 countdown with haptic ticks
  │
  └── HKWorkoutSession starts → HKLiveWorkoutBuilder begins collecting
```

### 11.3 Live Workout Screen Layout

The workout screen uses a **paginated** layout with Digital Crown scrolling or horizontal swipe between pages:

#### Page 1: Heart Rate + Zone (Primary)

```
┌─────────────────────────────┐
│          ZONE 4              │  ← Current zone name, zone-colored background
│     ╭──────────────╮        │
│    │                │       │
│    │     156        │       │  ← Current HR, large font, pulsing animation
│    │     BPM        │       │
│    │                │       │
│     ╰──────────────╯        │
│                              │
│  ■■■■■■■■■□□□  Zone 4       │  ← Zone progress bar (how deep into the zone)
│  152 ──────────── 171 bpm   │  ← Zone boundaries
│                              │
│        45:12                 │  ← Elapsed time
└─────────────────────────────┘

Background color: Subtle gradient matching current zone color
Zone transitions: Haptic tap (WKHapticType.notification) when zone changes
```

#### Page 2: Strain + Metrics

```
┌─────────────────────────────┐
│      WORKOUT STRAIN          │
│         ╭───╮               │
│        │12.1│               │  ← Current workout strain, animated dial
│         ╰───╯               │
│      Target: 14-18          │  ← Based on Recovery
│                              │
│  ┌──────────┬──────────┐    │
│  │ Calories │ Distance │    │
│  │   320    │  5.2 km  │    │
│  └──────────┴──────────┘    │
│                              │
│        45:12                 │  ← Elapsed time
└─────────────────────────────┘
```

#### Page 3: Zone Time Breakdown

```
┌─────────────────────────────┐
│      ZONE BREAKDOWN          │
│                              │
│  Z5  ■■        3m  (7%)    │
│  Z4  ■■■■■■   12m (27%)    │
│  Z3  ■■■■■■■■ 18m (40%)    │
│  Z2  ■■■■      8m (18%)    │
│  Z1  ■■        4m  (9%)    │
│                              │
│  Avg HR: 148  Max HR: 172   │
│        45:12                 │
└─────────────────────────────┘
```

### 11.4 Workout Controls

| Action | Gesture | Effect |
|--------|---------|--------|
| Pause | Long press on screen → "Pause" button | Pauses HKWorkoutSession. Shows Pause screen with Resume / End options. |
| Resume | Tap "Resume" on Pause screen | Resumes HKWorkoutSession |
| End | Tap "End" on Pause screen → Confirm | Ends HKWorkoutSession, saves HKWorkout to HealthKit, shows workout summary |
| Water Lock | Swipe right on Page 1 → tap water lock icon | Locks screen for swimming. Digital Crown rotation to unlock. |
| Segment/Lap | Double-tap screen during workout | Marks a lap/segment. Haptic confirmation. |

### 11.5 Workout Summary Screen

Shown after ending a workout:

```
┌─────────────────────────────┐
│      WORKOUT COMPLETE ✓     │
│                              │
│  🏃 Outdoor Run              │
│  Duration: 45:12             │
│  Strain: 12.1                │
│                              │
│  Avg HR: 148  Max HR: 172   │
│  Calories: 420               │
│  Distance: 5.2 km           │
│  Pace: 8:41 /km             │
│                              │
│  Zone Time:                  │
│  Z5: 3m  Z4: 12m  Z3: 18m  │
│  Z2: 8m  Z1: 4m             │
│                              │
│  Day Strain: 15.3           │
│  (was 6.2 before workout)   │
│                              │
│         [Done]               │
└─────────────────────────────┘
```

### 11.6 Workout Auto-Detection

When HealthKit detects elevated heart rate consistent with exercise and the user has NOT manually started a workout:

1. Watch displays a notification: "Looks like you started a workout. Start tracking?"
2. Options: "Running", "Walking", "Cycling", "Other", "Dismiss"
3. If user confirms, `HKWorkoutSession` starts retroactively from the detected start time
4. If user dismisses, suppress auto-detection for 30 minutes

### 11.7 Live Workout User Stories

- As a runner, I want to see my current HR zone and zone boundaries on my wrist so that I can maintain my target training intensity without checking my phone.
- As a user, I want to feel a haptic buzz when I transition between HR zones so that I know I'm entering a higher or lower intensity without looking at the screen.
- As a weightlifter, I want to see my workout strain accumulating in real-time so that I know when I've achieved sufficient training stimulus.
- As a swimmer, I want to enable water lock so that pool water doesn't trigger accidental screen taps.
- As a user who forgets to start workouts, I want auto-detection to prompt me so that I don't miss tracking a workout.

---

## 12. Feature 4: Recovery and Sleep Summary

### 12.1 Recovery Detail View (Watch)

A simplified version of the iOS Recovery detail, optimized for the Watch screen:

```
┌─────────────────────────────┐
│         RECOVERY             │
│          ╭───╮              │
│         │ 78%│              │  ← Colored dial
│          ╰───╯              │
│         Green                │
│                              │
│  HRV     62ms    ↑ +12%    │  ← Contributing factors
│  RHR     55bpm   ↓ Good    │     with directional arrows
│  Sleep   91%     ↑ Great   │     and qualitative labels
│  Resp    13.5    → Normal  │
│                              │
│  ┌──────────────────────┐   │
│  │  7-day trend          │   │
│  │  📈 ___/‾‾\___/‾     │   │  ← Sparkline
│  └──────────────────────┘   │
│                              │
│  Strain Target: 14-18       │
│  "Great day to push hard"   │
└─────────────────────────────┘
```

### 12.2 Sleep Summary View (Watch)

```
┌─────────────────────────────┐
│        LAST NIGHT            │
│                              │
│  Duration: 7h 23m           │
│  Performance: 91%            │
│                              │
│  ┌──────────────────────┐   │
│  │████████████░░░▓▓▓▓░  │   │  ← Stacked bar (Deep/Light/REM/Awake)
│  │ Deep  Light  REM  Aw │   │
│  └──────────────────────┘   │
│                              │
│  Deep:   1h 42m  (23%)     │
│  REM:    1h 55m  (26%)     │
│  Light:  3h 34m  (48%)     │
│  Awake:  12m     (3%)      │
│                              │
│  In Bed: 11:02 PM           │
│  Asleep: 11:14 PM           │
│  Awake:  6:25 AM            │
│                              │
│  Sleep Planner:              │
│  Tonight bed by 10:15 PM    │
│  Need: 8h 20m              │
└─────────────────────────────┘
```

---

## 13. Feature 5: Strain Monitor

### 13.1 Strain Detail View (Watch)

Shows today's strain accumulation as a timeline:

```
┌─────────────────────────────┐
│      TODAY'S STRAIN          │
│         ╭───╮               │
│        │15.3│               │  ← Current strain, colored by proximity to target
│         ╰───╯               │
│      Target: 14-18          │
│      ■■■■■■■■■■□□□□         │  ← Progress bar toward target
│                              │
│  ┌──────────────────────┐   │
│  │    Strain Timeline    │   │
│  │   ╱                   │   │  ← Line chart of strain accumulation through day
│  │  ╱                    │   │
│  │ ╱    ╱                │   │     Jumps visible at workout times
│  │╱    ╱                 │   │
│  │ 6am  12pm  6pm       │   │
│  └──────────────────────┘   │
│                              │
│  Activities:                 │
│  🏃 Run · 12.1 strain       │
│  🚶 Walk · 1.2 strain       │
│  💓 Resting · 2.0 strain    │
└─────────────────────────────┘
```

### 13.2 Strain Target Haptic Alerts

| Event | Haptic | Message |
|-------|--------|---------|
| Strain reaches 50% of target | `WKHapticType.click` | "Halfway to your strain target" |
| Strain enters target range | `WKHapticType.success` | "You've hit your strain target! Great work." |
| Strain exceeds target range by >2 | `WKHapticType.warning` | "You're significantly above your strain target. Consider winding down." |

---

## 14. Feature 6: Stress and Breathwork

### 14.1 Stress View (Watch)

```
┌─────────────────────────────┐
│       STRESS LEVEL           │
│                              │
│          1.2                 │  ← Current score, large
│        Moderate              │  ← Level label
│  ■■■■■■■□□□□□□              │  ← 0-3 bar, colored by level
│                              │
│  ┌──────────────────────┐   │
│  │  Today's Pattern      │   │
│  │  ‾‾\_/‾‾‾\_/‾        │   │  ← Mini timeline showing stress fluctuations
│  │  9am  12pm  3pm       │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │ 🫁 Start Breathwork   │   │  ← CTA button, prominent when stress ≥ 1.5
│  └──────────────────────┘   │
└─────────────────────────────┘
```

### 14.2 Breathwork on Watch

The Watch is the ideal surface for guided breathwork because of haptic feedback.

#### Cyclic Sighing Session

```
┌─────────────────────────────┐
│     BREATHE TO RELAX         │
│                              │
│         ╭─────╮             │
│        │       │            │  ← Animated expanding/contracting circle
│        │ Inhale│            │     Expands on inhale, contracts on exhale
│        │       │            │
│         ╰─────╯             │
│                              │
│     4s in · 2s sip · 8s out │  ← Current phase timing
│                              │
│  Cycle 3 of 20              │
│  Elapsed: 1:24              │
│                              │
│  HR: 72 bpm  (was 84)      │  ← Real-time HR showing reduction
│                              │
│       [End Session]          │
└─────────────────────────────┘

Haptic pattern:
  Inhale start: WKHapticType.start
  Sip inhale: WKHapticType.click
  Exhale start: WKHapticType.directionDown
  Cycle complete: WKHapticType.success
```

#### Breathwork Summary (Post-Session)

```
┌─────────────────────────────┐
│      SESSION COMPLETE ✓      │
│                              │
│  Duration: 5:00              │
│  Cycles: 20                  │
│                              │
│  Stress: 2.1 → 0.8          │  ← Before/after with arrow
│  Heart Rate: 84 → 68 bpm    │
│                              │
│  "Significant stress         │
│   reduction achieved"        │
│                              │
│         [Done]               │
└─────────────────────────────┘
```

### 14.3 Extended Runtime for Breathwork

Breathwork sessions require the Watch screen to stay active for 1-10 minutes. This uses `WKExtendedRuntimeSession`:

```swift
class BreathworkSessionManager: NSObject, WKExtendedRuntimeSessionDelegate {
    var extendedSession: WKExtendedRuntimeSession?

    func startBreathwork() {
        extendedSession = WKExtendedRuntimeSession()
        extendedSession?.delegate = self
        extendedSession?.start()
        // Session keeps app active even when wrist is lowered
    }

    func endBreathwork() {
        extendedSession?.invalidate()
    }
}
```

---

## 15. Feature 7: Quick Journal

### 15.1 Overview

The full Journal (140+ behaviors) is iPhone-only. The Watch offers a **Quick Journal** — the user's top 5 most-logged behaviors as simple toggles.

### 15.2 Quick Journal Screen

```
┌─────────────────────────────┐
│      QUICK JOURNAL           │
│      Yesterday               │
│                              │
│  ┌────────────────────┬──┐  │
│  │ Alcohol             │ 🔘│  │  ← Toggle (tap to switch)
│  ├────────────────────┼──┤  │
│  │ Caffeine > 2 cups  │ ✅│  │
│  ├────────────────────┼──┤  │
│  │ Magnesium          │ ✅│  │
│  ├────────────────────┼──┤  │
│  │ Late Meal          │ 🔘│  │
│  ├────────────────────┼──┤  │
│  │ Screen before bed  │ ✅│  │
│  └────────────────────┴──┘  │
│                              │
│       [Submit ✓]             │
│                              │
│  "Full journal on iPhone"   │  ← Hint text
└─────────────────────────────┘

Interaction:
  - Tap row to toggle Yes/No
  - Haptic confirmation on each toggle (WKHapticType.click)
  - "Submit" sends entry via WatchConnectivity transferUserInfo
  - iPhone receives and saves to backend via POST /api/v1/journal
```

### 15.3 Behavior Selection

The top 5 behaviors displayed on the Watch are:
1. **User-configured:** User selects their "Watch behaviors" in the iPhone app settings
2. **Default:** If not configured, use the 5 most frequently logged behaviors from the user's Journal history
3. **Fallback:** If no Journal history, use: Alcohol, Caffeine, Late Meal, Magnesium, Screen Before Bed

---

## 16. Feature 8: Haptic Coaching and Smart Notifications

### 16.1 Overview

The Watch's haptic engine enables a "coaching through touch" paradigm where the user receives meaningful nudges throughout the day without needing to look at the screen.

### 16.2 Haptic Events

| Event | Trigger | Haptic Type | Notification Text | Time |
|-------|---------|-------------|-------------------|------|
| Morning Recovery | Recovery score computed | `success` (Green), `retry` (Yellow), `failure` (Red) | "Recovery: 78% 🟢 Great day to push." | Upon waking (detected via sleep end) |
| Strain Target Hit | Day strain enters target range | `success` | "Strain target reached (14.0). Great work today!" | Real-time |
| Strain Overreach | Day strain exceeds target by >2 | `warning` | "Strain 20.1 — well above your target. Consider resting." | Real-time |
| Bedtime Reminder | 30 min before recommended bedtime | `notification` | "Bed by 10:15 PM to meet your sleep need of 8h 20m." | Evening |
| Bedtime Final | At recommended bedtime | `directionDown` | "Time for bed. Sleep Performance goal: 100%." | Evening |
| High Stress Alert | Stress score ≥ 2.0 for >10 min | `notification` | "Elevated stress detected. Try a 5-min breathwork?" | Real-time |
| Workout Auto-Detect | Elevated HR without active workout | `click` | "Looks like you're working out. Start tracking?" | Real-time |
| Zone Transition (Workout) | HR crosses zone boundary | `click` (up), `directionDown` (down) | Silent — haptic only during workout | During workout |
| Inactivity Nudge | No movement for 2+ hours during waking hours | `retry` | "You've been still for 2 hours. A short walk adds to your strain." | Daytime |
| Weekly Summary | Sunday evening | `success` | "Your weekly report is ready. Avg Recovery: 72%." | Sunday 7 PM |

### 16.3 Notification Preferences

Users can enable/disable each haptic event category independently in the iPhone app settings. Categories:
- **Recovery alerts** (morning Recovery)
- **Strain coaching** (target hit, overreach)
- **Sleep coaching** (bedtime reminders)
- **Stress alerts** (high stress, breathwork prompt)
- **Workout detection** (auto-detect prompts)
- **Activity nudges** (inactivity reminders)
- **Weekly summaries**

Default: All enabled except "Inactivity Nudge" (can feel nagging).

---

## 17. Feature 9: Always-On Display

### 17.1 Overview

Apple Watch Series 5+ supports Always-On Display (AOD). When the user's wrist is lowered, the screen dims but remains visible. The ApexFit Watch app must provide a meaningful AOD state.

### 17.2 AOD Implementation

```swift
struct WorkoutView: View {
    @Environment(\.isLuminanceReduced) var isAOD

    var body: some View {
        if isAOD {
            // Always-On Display: simplified, low-power layout
            AODWorkoutView(hr: currentHR, strain: currentStrain, elapsed: elapsedTime)
        } else {
            // Full interactive view
            FullWorkoutView(...)
        }
    }
}
```

### 17.3 AOD States by Screen

| Active Screen | AOD Display | Update Rate |
|--------------|-------------|-------------|
| **Glance Dashboard** | Recovery % (large, colored) + Day Strain (small) | Every minute |
| **Live Workout** | Current HR (large) + Elapsed Time + Strain | Every second (using `TimelineView(.periodic(every: 1))`) |
| **Breathwork** | Animated circle frozen at current state + elapsed time | Paused (resumes when wrist raised) |
| **Stress** | Current stress score + level label | Every minute |
| **Sleep Planner** | Recommended bedtime (static) | Static |

### 17.4 AOD Design Rules

1. **Reduce brightness:** All colors at 60% opacity in AOD mode
2. **Remove animations:** No pulsing HR, no dial animations
3. **Minimize updates:** Use `TimelineView` with appropriate cadence to preserve battery
4. **Hide interactive elements:** Buttons, scrollable lists hidden in AOD
5. **Large, readable text:** Critical metrics displayed at minimum 24pt font

---

## 18. Feature 10: Digital Crown and Gesture Interactions

### 18.1 Digital Crown Mapping

| Screen | Crown Action | Effect |
|--------|-------------|--------|
| Glance Dashboard | Rotate | Scroll through metric cards |
| Live Workout | Rotate | Scroll between workout pages (HR, Strain, Zones) |
| Recovery Detail | Rotate | Scroll through contributing factors and trend |
| Sleep Detail | Rotate | Scroll through sleep stage breakdown |
| Breathwork | Rotate | Adjust session duration (1-10 min) before starting |
| Quick Journal | Rotate | Scroll through behavior list |
| Workout Type Selection | Rotate | Scroll through workout type list |

### 18.2 Gesture Interactions

| Gesture | Context | Action |
|---------|---------|--------|
| Tap | Any metric tile | Navigate to detail view |
| Long Press | Live Workout screen | Show Pause/End controls |
| Swipe Left | Live Workout pages | Navigate to next page |
| Swipe Right | Live Workout pages | Navigate to previous page |
| Double Tap | Live Workout | Mark lap/segment |
| Raise Wrist | Any screen | Wake from AOD, trigger complication refresh |
| Shake wrist (Double Tap gesture, watchOS 10+) | Anywhere | Quick action: configurable (default: toggle stress view) |

---

## 19. UI/UX Design Specification

### 19.1 Design Principles (Watch-Specific)

1. **One metric per glance:** Each screen focuses on one primary metric with supporting context. No information overload.
2. **Touch targets ≥ 38pt:** Minimum tap target size on Watch. Use full-width rows for list items.
3. **System fonts only:** Use SF Pro and SF Pro Rounded. No custom fonts (performance and readability).
4. **Dark background always:** watchOS is dark-mode only. Background is `Color.black`.
5. **Circular motifs:** Leverage the Watch's round bezels with circular gauges and progress rings.
6. **Max 3 scroll depths:** No screen should require more than 3 vertical scroll lengths to see all content.

### 19.2 Color System (Inherited from iOS PRD)

All colors from `ApexFitCore.ColorSystem` apply. Watch-specific additions:

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| AOD Dimmed Background | Near-black | `#0A0A0A` | Always-On Display background |
| AOD Dimmed Text | Dim white | `#666666` | AOD secondary text |
| Workout Zone 1 BG | Faded Blue | `#0A84FF20` | Zone 1 subtle background during workout |
| Workout Zone 2 BG | Faded Green | `#30D15820` | Zone 2 subtle background |
| Workout Zone 3 BG | Faded Yellow | `#FFD60A20` | Zone 3 subtle background |
| Workout Zone 4 BG | Faded Orange | `#FF9F0A20` | Zone 4 subtle background |
| Workout Zone 5 BG | Faded Red | `#FF375F20` | Zone 5 subtle background |

### 19.3 Typography Scale

| Usage | Font | Size | Weight |
|-------|------|------|--------|
| Primary metric (HR, Recovery %) | SF Pro Rounded | 40pt | Bold |
| Secondary metric (Strain, Sleep %) | SF Pro Rounded | 28pt | Semibold |
| Label text | SF Pro | 15pt | Medium |
| Caption / Subtitle | SF Pro | 13pt | Regular |
| Complication number | SF Pro Rounded | 20pt | Bold |
| AOD primary | SF Pro Rounded | 36pt | Bold |

### 19.4 Navigation Flow

```
┌──────────────────────────────────────────────────────┐
│                   App Launch                          │
│                      │                                │
│                      ▼                                │
│              Glance Dashboard                         │
│              (main scrollable view)                   │
│                      │                                │
│     ┌────────┬───────┼───────┬────────┬──────┐       │
│     ▼        ▼       ▼       ▼        ▼      ▼       │
│  Recovery  Strain   Sleep  Stress  Coach  Journal    │
│  Detail    Detail  Detail  Detail  Quick   Quick     │
│     │                         │                       │
│     │                         ▼                       │
│     │                    Breathwork                   │
│     │                    Session                      │
│     ▼                         │                       │
│  7-Day                   Session                     │
│  Trend                   Summary                     │
│                                                       │
├──────────────────────────────────────────────────────┤
│             Workout (Separate Flow)                   │
│                                                       │
│  Start → Type Select → Countdown → Live Tracking     │
│                                     (3 pages)        │
│                                        │              │
│                                   Pause/End           │
│                                        │              │
│                                   Summary             │
└──────────────────────────────────────────────────────┘
```

### 19.5 Watch App Icon

The Watch app icon should be a simplified version of the iOS app icon:
- Circular format (Watch icons are always circular)
- Primary element: A stylized circular gauge in the brand teal (`#00F19F`) on a dark background
- No text in the icon (too small to read)
- Must be provided at: 40x40, 44x44, 50x50, 58x58, 87x87, 100x100 (@2x and @3x variants)

---

## 20. Performance, Battery, and Thermal Constraints

### 20.1 Performance Budgets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Cold launch to first content | <2.0 seconds | User must see Recovery within 2s of tapping the app icon |
| Complication tap to app | <0.5 seconds | Complications launch directly to relevant screen |
| Workout HR update latency | <1.0 second | Real-time feedback requires sub-second HR display |
| Strain recalculation | <100ms | Must not block the UI during live workout |
| Memory usage (active) | <50 MB | watchOS has ~256MB RAM; app must coexist with system processes |
| Memory usage (background) | <16 MB | Background tasks are killed above this threshold |

### 20.2 Battery Impact Mitigation

| Concern | Mitigation |
|---------|------------|
| Live workout HR streaming drains battery | `HKWorkoutSession` is optimized by Apple for power. No additional power draw beyond what Apple's own Workout app uses. |
| Frequent complication updates | Limit to `transferCurrentComplicationUserInfo` budget (50/day). Use `TimelineProvider` with 15-min refresh policy. |
| Background tasks | Use `WKApplicationRefreshBackgroundTask` sparingly. Schedule max 4 background refreshes/hour. |
| Extended runtime (breathwork) | Limit extended sessions to 10 minutes max. Invalidate session immediately on completion. |
| Stress monitoring | Do NOT run continuous background stress computation on Watch. Compute only when app is in foreground. Rely on iPhone for background stress calculation. |
| WatchConnectivity | `applicationContext` is free (always-available). Avoid `sendMessage` when Watch is on charger to prevent unnecessary phone wake. |
| Network requests | Prefer WatchConnectivity over direct URLSession. Direct network is a battery fallback only when iPhone is unreachable. |

### 20.3 Thermal Constraints

| Rule | Implementation |
|------|---------------|
| No GPU-intensive rendering | Use built-in SwiftUI shapes for gauges. No Metal or SceneKit. |
| No continuous animations in AOD | All animations paused in `.isLuminanceReduced` mode. |
| Workout computation throttling | If Watch body temperature sensor indicates thermal throttling, reduce strain recalculation frequency from 5s to 30s. |

---

## 21. User Stories (Complete)

### Complications

- As a user, I want to see my Recovery score on my watch face without opening any app so that I know my readiness at a glance.
- As a user, I want my complication to update with my Recovery score when I wake up so that the information is fresh.
- As a user, I want to tap the complication and immediately land on the Recovery detail screen (not the app home) so that I can dive deeper with one tap.
- As a user, I want to choose between a circular (Recovery), corner (Strain), rectangular (triple summary), or inline complication so that it fits my preferred watch face.

### Glance Dashboard

- As a user, I want to see Recovery, Strain, Sleep, and Stress in a single scrollable view when I open the Watch app so that I get a complete picture in under 5 seconds.
- As a user with no iPhone nearby, I want the Watch to show my last known metrics with a timestamp so that I still have useful information.

### Live Workout

- As a runner, I want to see my live heart rate and current HR zone during a run so that I can train at the right intensity.
- As a user, I want to feel a haptic tap when I transition between HR zones so that I can adjust effort without looking at the screen.
- As a swimmer, I want to lock my screen during a pool session so that water doesn't trigger accidental taps.
- As a user, I want to see my live workout strain accumulating so that I know when I've hit my target.
- As a user who forgot to start tracking, I want auto-detection to prompt me so that I don't lose workout data.
- As a cyclist, I want to see distance and elapsed time alongside HR so that I have complete workout context on my wrist.

### Recovery and Sleep

- As a user, I want to see which factors drove my Recovery up or down on my Watch so that I don't need to open my phone for basic insight.
- As a user, I want to see last night's sleep stage breakdown on my Watch so that I know how well I slept.
- As a user, I want to see tonight's recommended bedtime on my Watch so that I get the reminder where I'll most likely see it.

### Stress and Breathwork

- As a stressed user, I want my Watch to offer a breathwork session when stress is elevated so that I can intervene immediately.
- As a user doing breathwork, I want haptic cues for inhale/exhale so that I can follow the pattern with my eyes closed.
- As a user, I want to see my before/after stress score after breathwork so that I know it worked.

### Quick Journal

- As a user, I want to log my top 5 behaviors directly on my Watch so that I can journal without pulling out my phone.
- As a user, I want my Watch journal entries to sync to my iPhone and backend so that they appear in my full Journal and behavioral impact analysis.

### Haptic Coaching

- As a user, I want a haptic buzz with my Recovery score when I wake up so that I start my day informed.
- As a user, I want a bedtime reminder haptic 30 minutes before my recommended sleep time so that I maintain consistency.
- As a user, I want to configure which haptic coaching events I receive so that I'm not overwhelmed by notifications.

### Offline / Connectivity

- As a user without my iPhone, I want the Watch to still display my metrics and track workouts so that I'm not dependent on the phone during activity.
- As a user, I want data collected on my Watch during offline periods to sync to my iPhone when it's back in range.

---

## 22. Requirements Summary (MoSCoW)

### Must Have (P0) — Watch MVP

| ID | Requirement |
|----|-------------|
| WP0-01 | WidgetKit complications: accessoryCircular (Recovery), accessoryCorner (Strain), accessoryRectangular (triple summary), accessoryInline |
| WP0-02 | Glance Dashboard: scrollable view with Recovery dial, Strain dial, Sleep summary, Stress bar |
| WP0-03 | WatchConnectivity integration: receive applicationContext, transferUserInfo, transferCurrentComplicationUserInfo from iPhone |
| WP0-04 | Live Workout tracking: HKWorkoutSession + HKLiveWorkoutBuilder for 12 workout types |
| WP0-05 | Live Workout UI: 3 paginated views (HR/Zone, Strain/Metrics, Zone Breakdown) |
| WP0-06 | Workout summary screen with strain, HR, zones, duration, calories |
| WP0-07 | Recovery detail view with contributing factors and 7-day sparkline |
| WP0-08 | Sleep summary view with stage breakdown |
| WP0-09 | Haptic zone transitions during workout |
| WP0-10 | Morning Recovery haptic notification |
| WP0-11 | Bedtime reminder haptic notification |
| WP0-12 | Shared Swift Package (`ApexFitCore`) with models, algorithms, and networking |
| WP0-13 | Offline mode: cached metrics display + queued sync |
| WP0-14 | Always-On Display states for Glance Dashboard and Live Workout |
| WP0-15 | Strain Monitor detail view with day timeline |
| WP0-16 | Local SwiftData cache for offline metric storage |

### Should Have (P1) — Fast Follow

| ID | Requirement |
|----|-------------|
| WP1-01 | Guided Breathwork (Cyclic Sighing) with haptic cues and before/after analytics |
| WP1-02 | Stress Monitor view with real-time score and day timeline |
| WP1-03 | Quick Journal (top 5 behaviors) |
| WP1-04 | Quick Coach (preset questions + voice dictation, truncated responses) |
| WP1-05 | Workout auto-detection prompts |
| WP1-06 | Strain target haptic alerts (reached, overreach) |
| WP1-07 | High stress haptic alert with breathwork prompt |
| WP1-08 | Inactivity nudge haptics |
| WP1-09 | Sleep Planner view (tonight's bedtime, need breakdown, goal picker) |
| WP1-10 | Direct API fallback when iPhone is unreachable (Wi-Fi/Cellular) |

### Could Have (P2) — Future

| ID | Requirement |
|----|-------------|
| WP2-01 | Cyclic Hyperventilation breathwork modality |
| WP2-02 | ApexFit Age complication (single number) |
| WP2-03 | Weekly Performance Summary notification with sparklines |
| WP2-04 | Double-tap gesture for configurable quick action |
| WP2-05 | Workout lap/segment marking with per-segment strain |
| WP2-06 | Watch-to-Watch "compete" — challenge a friend to a strain battle via WatchConnectivity relay |
| WP2-07 | Siri Shortcuts ("Hey Siri, what's my recovery?") |
| WP2-08 | Smart Stack widget (watchOS 10+) |

### Won't Have (This Version)

| ID | Requirement | Reason |
|----|-------------|--------|
| WW-01 | Full AI Coach conversation on Watch | Screen too small for multi-turn conversation. Quick Coach (P1) offers preset queries. |
| WW-02 | Full 140+ behavior Journal on Watch | Unusable on small screen. Quick Journal covers top 5. |
| WW-03 | Healthspan dashboard on Watch | Too data-dense. Single "ApexFit Age" complication (P2) is sufficient. |
| WW-04 | Team leaderboards on Watch | Social browsing requires phone-sized screen. |
| WW-05 | Data export from Watch | Export is an iPhone/backend feature. |
| WW-06 | Standalone Watch app without iPhone ever paired | watchOS requires initial iPhone pairing. |

---

## 23. Acceptance Criteria

### Complications (WP0-01)

- [ ] Given the user adds the ApexFit accessoryCircular complication, then it displays the current Recovery % with a colored ring (green/yellow/red).
- [ ] Given the iPhone computes a new Recovery score, then the complication updates within 5 minutes via `transferCurrentComplicationUserInfo`.
- [ ] Given the user taps the Recovery complication, then the app opens directly to the Recovery detail view (not the Glance Dashboard).
- [ ] Given no data has been received from the iPhone, then the complication shows a placeholder with "--" and "Open app" text.
- [ ] Given the accessoryRectangular complication is active, then it shows Recovery (with zone color dot), Strain (with target), and Sleep (performance %) in a 3-column layout.

### Live Workout (WP0-04, WP0-05)

- [ ] Given the user starts a workout, then HR updates appear on screen within 1 second of the heart beat.
- [ ] Given the user's HR crosses a zone boundary, then a haptic tap fires within 2 seconds.
- [ ] Given the user is in a live workout, then current workout strain updates every 5 seconds on the Strain page.
- [ ] Given the user ends a workout, then a workout summary screen appears showing strain, HR stats, zone time, duration, and calories.
- [ ] Given the user ends a workout, then an HKWorkout is saved to HealthKit and the workout summary is queued for iPhone sync.
- [ ] Given the user starts a swim workout, then water lock is automatically enabled.
- [ ] Given the iPhone is unreachable during a workout, then all workout data is tracked locally and synced when the iPhone reconnects.

### WatchConnectivity (WP0-03)

- [ ] Given the iPhone app computes new daily metrics, then the Watch receives updated applicationContext within 30 seconds when both devices are connected.
- [ ] Given the Watch app launches and no recent applicationContext exists, then it displays cached data from SwiftData with a "Last updated: [time]" badge.
- [ ] Given the user completes a Quick Journal on Watch, then the entries arrive on the iPhone via transferUserInfo within 2 minutes and are submitted to the backend.
- [ ] Given the iPhone is powered off, then the Watch displays the last received metrics and can independently track workouts.

### Always-On Display (WP0-14)

- [ ] Given the user lowers their wrist during a workout, then the AOD shows current HR, elapsed time, and strain in a dimmed layout.
- [ ] Given the user lowers their wrist on the Glance Dashboard, then the AOD shows Recovery % in a dimmed layout.
- [ ] Given the AOD is active, then no animations are running and all colors are at 60% opacity.

### Haptic Coaching (WP0-10, WP0-11)

- [ ] Given a Recovery score is computed, then a haptic notification fires with the score and zone-appropriate haptic type (success/retry/failure).
- [ ] Given it is 30 minutes before the recommended bedtime, then a haptic reminder fires with the bedtime and sleep need.
- [ ] Given the user has disabled "Sleep coaching" in notification preferences, then no bedtime haptic fires.

---

## 24. Success Metrics

### Leading Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Watch app install rate (among iOS users with Apple Watch) | >60% | Analytics: Watch app activation event |
| Complication adoption | >50% of Watch app users add a complication within 14 days | Complication data source timeline requests |
| Workout tracking adoption | >70% of HealthKit workouts use the Watch app as source | HKWorkout source bundle ID analysis |
| Complication refresh success rate | >95% of complication updates delivered within 5 min | WatchConnectivity delivery timestamps |
| Quick Journal completion rate | >20% of Watch users submit Quick Journal at least 3x/week | Journal submission events via WatchConnectivity |
| Breathwork session completion | >15% of stress alert recipients start a breathwork session | Stress alert → breathwork start funnel |

### Lagging Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| iOS app DAU lift | >15% increase after Watch app launch | DAU comparison pre/post Watch launch |
| iOS app D30 retention lift | >5 percentage point increase for Watch users vs non-Watch users | Cohort retention analysis |
| Workout frequency | Watch users average 1+ more tracked workouts per week than non-Watch users | Weekly workout count comparison |
| Sleep consistency improvement | Watch users with bedtime reminders have <25 min bedtime std dev vs <35 min without | Rolling 28-day bedtime variance |
| App Store rating for Watch app | >4.5 stars | App Store Connect |

---

## 25. Implementation Phases

### Phase W1: Foundation and WatchConnectivity (Weeks 1-2)
*Prerequisite: iOS app Phase 1-2 must be complete. `ApexFitCore` shared package must exist.*

- Create watchOS target in the existing Xcode project
- Add `ApexFitCore` as dependency for watchOS target
- Implement `WatchConnectivityManager` on both iOS and watchOS sides
- Define `WatchApplicationContext` schema
- iOS app: send applicationContext whenever core metrics update
- Watch app: receive and cache applicationContext in SwiftData
- Build Glance Dashboard shell with placeholder data
- Test bidirectional communication

### Phase W2: Complications (Week 3)
- Implement `ApexFitComplicationProvider` using WidgetKit `TimelineProvider`
- Build accessoryCircular (Recovery), accessoryCorner (Strain), accessoryRectangular (triple), accessoryInline views
- Wire complication data source to cached WatchApplicationContext
- Implement `transferCurrentComplicationUserInfo` on iOS side for priority complication updates
- Test complication refresh timing and budget

### Phase W3: Glance Dashboard and Detail Views (Weeks 4-5)
- Build Recovery detail view (gauge, contributing factors, 7-day sparkline)
- Build Sleep summary view (stage breakdown, times, Sleep Planner)
- Build Strain detail view (timeline, per-workout list, target bar)
- Build Stress view (current score, day timeline)
- Wire all views to cached data from WatchConnectivity
- Implement tap-from-complication deep linking (complication → specific detail view)
- Implement offline data display with staleness badges

### Phase W4: Live Workout Tracking (Weeks 6-8)
- Implement `WatchWorkoutManager` with HKWorkoutSession and HKLiveWorkoutBuilder
- Build workout type selection screen (12 types)
- Build 3-page live workout UI (HR/Zone, Strain/Metrics, Zone Breakdown)
- Implement real-time strain calculation using `StrainCalculator` from ApexFitCore
- Implement haptic zone transitions
- Build workout pause/end controls
- Build workout summary screen
- Implement workout sync to iPhone via `transferUserInfo`
- Test water lock for swim workouts
- Implement Always-On Display for workout screen

### Phase W5: Haptic Coaching and Notifications (Week 9)
- Implement morning Recovery haptic notification (triggered by iPhone via WatchConnectivity)
- Implement bedtime reminder haptic (scheduled locally on Watch using notification API)
- Implement strain target haptics (local computation during workout)
- Build notification preferences sync (iPhone settings → Watch)
- Implement Always-On Display for Glance Dashboard

### Phase W6: Stress, Breathwork, Quick Journal (Weeks 10-12)
- Implement Watch-side stress calculation (simplified HR deviation)
- Build breathwork session UI with haptic guide (Cyclic Sighing)
- Implement `WKExtendedRuntimeSession` for breathwork
- Build breathwork summary screen
- Build Quick Journal UI (top 5 toggles)
- Implement Journal entry sync to iPhone
- Implement high stress → breathwork prompt notification
- Implement Quick Coach interface (preset questions, voice dictation, truncated responses)

### Phase W7: Polish, Performance, Beta (Weeks 13-14)
- Performance optimization: launch time < 2s, memory < 50MB
- Battery impact testing (full-day monitoring with Instruments)
- AOD state testing across all screens
- Digital Crown interaction refinement
- Accessibility audit (VoiceOver, Dynamic Type on Watch)
- Offline mode stress testing (phone powered off for 24 hours)
- TestFlight beta for Watch app

---

## 26. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| WOQ-1 | Should the Watch app support watchOS 9 (ClockKit complications) or watchOS 10+ only (WidgetKit)? watchOS 10+ simplifies development significantly. | Product + Engineering | Blocking (determines complication framework) |
| WOQ-2 | What is the optimal `applicationContext` update frequency? Too frequent wastes battery; too infrequent shows stale data. | Engineering | Non-blocking (start with every metric change, tune with battery data) |
| WOQ-3 | Should the Watch app work with Garmin users who don't have an Apple Watch? (Answer: No — Watch app requires watchOS, which requires Apple Watch.) | Product | Non-blocking (confirmed: Apple Watch only) |
| WOQ-4 | How do we handle the 50/day `transferCurrentComplicationUserInfo` budget? Should we batch multiple metric updates into one transfer? | Engineering | Non-blocking (50/day is sufficient for morning Recovery + periodic strain updates) |
| WOQ-5 | Should breathwork haptic patterns be customizable (faster/slower) or fixed? | Product + Design | Non-blocking (start fixed, add customization in P2) |
| WOQ-6 | Can we get heart-rate beat-to-beat (RR) intervals in real-time during workouts on watchOS? `HKHeartbeatSeriesQuery` may only be available post-workout. | Engineering | Blocking for real-time HRV during stress calculation (fallback: HR-only stress) |
| WOQ-7 | Should workout auto-detection be enabled by default or opt-in? Risk of false positives annoying users. | Product | Non-blocking (start opt-in, switch to default after accuracy validation) |
| WOQ-8 | Apple Watch Ultra has an Action Button. Should we map it to start a workout or another ApexFit action? | Product + Engineering | Non-blocking (P2 feature) |

---

## 27. Appendix: Complication Slot Reference

### Watch Face Compatibility

| Watch Face | accessoryCircular | accessoryCorner | accessoryRectangular | accessoryInline |
|-----------|-------------------|-----------------|---------------------|-----------------|
| Modular | ✅ | ❌ | ✅ | ✅ |
| Infograph | ✅ | ✅ | ✅ | ✅ |
| Infograph Modular | ✅ | ❌ | ✅ | ✅ |
| California | ✅ | ❌ | ❌ | ✅ |
| Solar Dial | ✅ | ✅ | ❌ | ❌ |
| Palette | ✅ | ✅ | ❌ | ❌ |
| Snoopy | ✅ | ✅ | ❌ | ✅ |
| Wayfinder (Ultra) | ✅ | ✅ | ✅ | ✅ |

### HKWorkoutActivityType Mapping

| App Display Name | HKWorkoutActivityType | Category |
|-----------------|----------------------|----------|
| Run (Outdoor) | `.running` | Cardiovascular |
| Run (Indoor) | `.running` (indoor location) | Cardiovascular |
| Cycle (Outdoor) | `.cycling` | Cardiovascular |
| Cycle (Indoor) | `.cycling` (indoor location) | Cardiovascular |
| Swim (Pool) | `.swimming` (pool) | Cardiovascular |
| Swim (Open Water) | `.swimming` (openWater) | Cardiovascular |
| Strength Training | `.traditionalStrengthTraining` | Muscular |
| HIIT | `.highIntensityIntervalTraining` | Mixed |
| Yoga | `.yoga` | Flexibility |
| Walk | `.walking` | Cardiovascular (light) |
| Hike | `.hiking` | Cardiovascular |
| Other | `.other` | General |

### Haptic Type Reference

| WKHapticType | Sensation | Used For |
|-------------|-----------|----------|
| `.notification` | Gentle tap | General notifications (bedtime, stress alert) |
| `.directionUp` | Rising pulse | Zone transition upward |
| `.directionDown` | Falling pulse | Zone transition downward, exhale cue |
| `.success` | Double tap | Recovery Green, strain target hit, workout complete |
| `.failure` | Triple buzz | Recovery Red |
| `.retry` | Short buzz | Recovery Yellow, inactivity nudge |
| `.start` | Strong tap | Workout start, inhale cue |
| `.stop` | Strong tap | Workout end |
| `.click` | Micro tap | Journal toggle, general UI interaction |

---

*End of Apple Watch Companion PRD*

*This PRD is designed for Claude Code. When implementing, always import `ApexFitCore` for shared models and algorithms. Never duplicate code that exists in the shared package. The Watch app is a lightweight display and interaction layer on top of the same computation and backend infrastructure defined in the iOS PRD (`WHOOP_Clone_PRD.md`).*
