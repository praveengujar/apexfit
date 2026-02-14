import Foundation

struct HeartRateZone {
    let zone: Int
    let name: String
    let lowerBound: Double
    let upperBound: Double
    let multiplier: Double
}

struct HeartRateZoneCalculator {
    let maxHeartRate: Int

    var zones: [HeartRateZone] {
        let maxHR = Double(maxHeartRate)
        return [
            HeartRateZone(zone: 1, name: "Warm-Up", lowerBound: maxHR * 0.50, upperBound: maxHR * 0.60, multiplier: HealthKitConstants.zone1Multiplier),
            HeartRateZone(zone: 2, name: "Fat Burn", lowerBound: maxHR * 0.60, upperBound: maxHR * 0.70, multiplier: HealthKitConstants.zone2Multiplier),
            HeartRateZone(zone: 3, name: "Aerobic", lowerBound: maxHR * 0.70, upperBound: maxHR * 0.80, multiplier: HealthKitConstants.zone3Multiplier),
            HeartRateZone(zone: 4, name: "Threshold", lowerBound: maxHR * 0.80, upperBound: maxHR * 0.90, multiplier: HealthKitConstants.zone4Multiplier),
            HeartRateZone(zone: 5, name: "Anaerobic", lowerBound: maxHR * 0.90, upperBound: maxHR * 1.00, multiplier: HealthKitConstants.zone5Multiplier),
        ]
    }

    func zone(for heartRate: Double) -> HeartRateZone? {
        let maxHR = Double(maxHeartRate)
        let percentage = heartRate / maxHR

        switch percentage {
        case ..<0.50:
            return nil // Below Zone 1
        case 0.50..<0.60:
            return zones[0]
        case 0.60..<0.70:
            return zones[1]
        case 0.70..<0.80:
            return zones[2]
        case 0.80..<0.90:
            return zones[3]
        default:
            return zones[4]
        }
    }

    func zoneNumber(for heartRate: Double) -> Int {
        zone(for: heartRate)?.zone ?? 0
    }

    func multiplier(for heartRate: Double) -> Double {
        zone(for: heartRate)?.multiplier ?? 0
    }

    func zoneBoundaries() -> [(zone: Int, lower: Int, upper: Int)] {
        zones.map { (zone: $0.zone, lower: Int($0.lowerBound), upper: Int($0.upperBound)) }
    }
}
