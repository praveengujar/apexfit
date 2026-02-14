import SwiftUI

struct CustomAppIcon: View {
    let size: CGFloat

    init(size: CGFloat = 1024) {
        self.size = size
    }

    var body: some View {
        ZStack {
            // Background gradient matching fitness theme
            LinearGradient(
                colors: [
                    Color(red: 0.15, green: 0.15, blue: 0.15), // Dark gray
                    Color(red: 0.05, green: 0.05, blue: 0.05)  // Almost black
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            // Main biceps and dumbbell design
            BicepsDumbbellIcon(size: size)
                .foregroundColor(.white)
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.22)) // iOS icon corner radius
    }
}

struct BicepsDumbbellIcon: View {
    let size: CGFloat

    var scale: CGFloat {
        size / 400 // Base scale for 400x400 design
    }

    var body: some View {
        ZStack {
            // Flexed bicep muscle
            FlexedBicep(scale: scale)

            // Dumbbell in hand
            DumbbellIcon(scale: scale)
                .position(x: size * 0.75, y: size * 0.8)
        }
        .frame(width: size, height: size)
    }
}

struct FlexedBicep: View {
    let scale: CGFloat

    var body: some View {
        Path { path in
            // Upper arm outline
            path.move(to: CGPoint(x: 80 * scale, y: 120 * scale))

            // Shoulder connection
            path.addCurve(
                to: CGPoint(x: 140 * scale, y: 80 * scale),
                control1: CGPoint(x: 100 * scale, y: 90 * scale),
                control2: CGPoint(x: 120 * scale, y: 70 * scale)
            )

            // Upper bicep curve
            path.addCurve(
                to: CGPoint(x: 220 * scale, y: 100 * scale),
                control1: CGPoint(x: 170 * scale, y: 60 * scale),
                control2: CGPoint(x: 200 * scale, y: 80 * scale)
            )

            // Bicep peak (the flexed muscle bump)
            path.addCurve(
                to: CGPoint(x: 250 * scale, y: 140 * scale),
                control1: CGPoint(x: 240 * scale, y: 110 * scale),
                control2: CGPoint(x: 250 * scale, y: 125 * scale)
            )

            // Down towards elbow
            path.addCurve(
                to: CGPoint(x: 230 * scale, y: 200 * scale),
                control1: CGPoint(x: 250 * scale, y: 160 * scale),
                control2: CGPoint(x: 245 * scale, y: 180 * scale)
            )

            // Forearm connection
            path.addCurve(
                to: CGPoint(x: 260 * scale, y: 260 * scale),
                control1: CGPoint(x: 240 * scale, y: 220 * scale),
                control2: CGPoint(x: 250 * scale, y: 240 * scale)
            )

            // Hand area
            path.addCurve(
                to: CGPoint(x: 280 * scale, y: 300 * scale),
                control1: CGPoint(x: 270 * scale, y: 275 * scale),
                control2: CGPoint(x: 275 * scale, y: 290 * scale)
            )

            // Inner arm curve back
            path.addCurve(
                to: CGPoint(x: 200 * scale, y: 280 * scale),
                control1: CGPoint(x: 260 * scale, y: 310 * scale),
                control2: CGPoint(x: 230 * scale, y: 300 * scale)
            )

            // Inner forearm
            path.addCurve(
                to: CGPoint(x: 180 * scale, y: 220 * scale),
                control1: CGPoint(x: 185 * scale, y: 260 * scale),
                control2: CGPoint(x: 175 * scale, y: 240 * scale)
            )

            // Inner bicep curve
            path.addCurve(
                to: CGPoint(x: 150 * scale, y: 160 * scale),
                control1: CGPoint(x: 170 * scale, y: 200 * scale),
                control2: CGPoint(x: 160 * scale, y: 180 * scale)
            )

            // Inner bicep peak
            path.addCurve(
                to: CGPoint(x: 130 * scale, y: 130 * scale),
                control1: CGPoint(x: 140 * scale, y: 150 * scale),
                control2: CGPoint(x: 135 * scale, y: 140 * scale)
            )

            // Back to start
            path.addCurve(
                to: CGPoint(x: 80 * scale, y: 120 * scale),
                control1: CGPoint(x: 115 * scale, y: 115 * scale),
                control2: CGPoint(x: 95 * scale, y: 118 * scale)
            )
        }
        .fill(Color.white)

        // Muscle definition lines
        Path { path in
            // Bicep separation line
            path.move(to: CGPoint(x: 160 * scale, y: 130 * scale))
            path.addCurve(
                to: CGPoint(x: 200 * scale, y: 150 * scale),
                control1: CGPoint(x: 175 * scale, y: 135 * scale),
                control2: CGPoint(x: 190 * scale, y: 142 * scale)
            )

            // Forearm definition
            path.move(to: CGPoint(x: 200 * scale, y: 240 * scale))
            path.addCurve(
                to: CGPoint(x: 230 * scale, y: 270 * scale),
                control1: CGPoint(x: 210 * scale, y: 250 * scale),
                control2: CGPoint(x: 220 * scale, y: 260 * scale)
            )
        }
        .stroke(Color.white.opacity(0.3), lineWidth: 2 * scale)
    }
}

struct DumbbellIcon: View {
    let scale: CGFloat

    var body: some View {
        ZStack {
            // Left weight plate
            Circle()
                .fill(Color.white)
                .frame(width: 30 * scale, height: 30 * scale)
                .position(x: -15 * scale, y: 0)

            // Handle
            RoundedRectangle(cornerRadius: 3 * scale)
                .fill(Color.white)
                .frame(width: 40 * scale, height: 8 * scale)

            // Right weight plate
            Circle()
                .fill(Color.white)
                .frame(width: 30 * scale, height: 30 * scale)
                .position(x: 15 * scale, y: 0)

            // Handle grip lines
            VStack(spacing: 2 * scale) {
                Rectangle()
                    .fill(Color.black.opacity(0.3))
                    .frame(width: 25 * scale, height: 1 * scale)
                Rectangle()
                    .fill(Color.black.opacity(0.3))
                    .frame(width: 25 * scale, height: 1 * scale)
                Rectangle()
                    .fill(Color.black.opacity(0.3))
                    .frame(width: 25 * scale, height: 1 * scale)
            }
        }
        .rotationEffect(.degrees(-30)) // Angle it as if being held
    }
}

// Alternative simplified version
struct MinimalAppIcon: View {
    let size: CGFloat

    init(size: CGFloat = 1024) {
        self.size = size
    }

    var body: some View {
        ZStack {
            // Clean background
            Color.black

            // Simplified bicep with dumbbell
            SimplifiedBicepIcon(size: size)
                .foregroundColor(.white)
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.22))
    }
}

struct SimplifiedBicepIcon: View {
    let size: CGFloat

    var scale: CGFloat {
        size / 200
    }

    var body: some View {
        ZStack {
            // Simple flexed bicep shape
            Path { path in
                path.move(to: CGPoint(x: 60 * scale, y: 100 * scale))

                // Top curve
                path.addCurve(
                    to: CGPoint(x: 120 * scale, y: 70 * scale),
                    control1: CGPoint(x: 80 * scale, y: 60 * scale),
                    control2: CGPoint(x: 100 * scale, y: 55 * scale)
                )

                // Bicep peak
                path.addCurve(
                    to: CGPoint(x: 140 * scale, y: 100 * scale),
                    control1: CGPoint(x: 135 * scale, y: 80 * scale),
                    control2: CGPoint(x: 145 * scale, y: 90 * scale)
                )

                // Down to hand
                path.addCurve(
                    to: CGPoint(x: 130 * scale, y: 140 * scale),
                    control1: CGPoint(x: 138 * scale, y: 115 * scale),
                    control2: CGPoint(x: 135 * scale, y: 130 * scale)
                )

                // Inner curve
                path.addCurve(
                    to: CGPoint(x: 90 * scale, y: 130 * scale),
                    control1: CGPoint(x: 115 * scale, y: 145 * scale),
                    control2: CGPoint(x: 100 * scale, y: 140 * scale)
                )

                // Back to start
                path.addCurve(
                    to: CGPoint(x: 60 * scale, y: 100 * scale),
                    control1: CGPoint(x: 75 * scale, y: 120 * scale),
                    control2: CGPoint(x: 65 * scale, y: 110 * scale)
                )
            }
            .fill(Color.white)

            // Small dumbbell
            HStack(spacing: 2 * scale) {
                Circle()
                    .fill(Color.white)
                    .frame(width: 8 * scale, height: 8 * scale)

                Rectangle()
                    .fill(Color.white)
                    .frame(width: 15 * scale, height: 3 * scale)

                Circle()
                    .fill(Color.white)
                    .frame(width: 8 * scale, height: 8 * scale)
            }
            .position(x: 120 * scale, y: 130 * scale)
            .rotationEffect(.degrees(-20))
        }
    }
}

// Icon generator for all sizes
struct IconPackageGenerator {
    static let iconSizes: [String: CGFloat] = [
        "icon-20": 20,
        "icon-20@2x": 40,
        "icon-20@3x": 60,
        "icon-29": 29,
        "icon-29@2x": 58,
        "icon-29@3x": 87,
        "icon-40": 40,
        "icon-40@2x": 80,
        "icon-40@3x": 120,
        "icon-60@2x": 120,
        "icon-60@3x": 180,
        "icon-76": 76,
        "icon-76@2x": 152,
        "icon-83.5@2x": 167,
        "icon-1024": 1024
    ]

    static func generateAllIcons(style: IconStyle = .detailed) -> [String: UIImage] {
        var icons: [String: UIImage] = [:]

        for (name, size) in iconSizes {
            let iconView: any View

            switch style {
            case .detailed:
                iconView = CustomAppIcon(size: size)
            case .minimal:
                iconView = MinimalAppIcon(size: size)
            }

            if let image = iconView.asUIImage() {
                icons[name] = image
            }
        }

        return icons
    }

    enum IconStyle {
        case detailed
        case minimal
    }
}

// Preview Views
struct IconPreviewGrid: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("DUM App Icons")
                    .font(.title)
                    .fontWeight(.bold)

                // Main preview
                HStack(spacing: 30) {
                    VStack {
                        CustomAppIcon(size: 120)
                        Text("Detailed")
                            .font(.caption)
                    }

                    VStack {
                        MinimalAppIcon(size: 120)
                        Text("Minimal")
                            .font(.caption)
                    }
                }

                // Size variations
                Text("Size Variations")
                    .font(.headline)
                    .padding(.top)

                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 15) {
                    ForEach([1024, 180, 120, 87, 80, 76, 60, 58, 40, 29, 20], id: \.self) { size in
                        VStack {
                            CustomAppIcon(size: CGFloat(size))
                                .frame(width: 60, height: 60)
                            Text("\(size)pt")
                                .font(.caption2)
                        }
                    }
                }
            }
            .padding()
        }
    }
}

#Preview("Icon Grid") {
    IconPreviewGrid()
}

#Preview("Detailed Icon") {
    CustomAppIcon(size: 300)
}

#Preview("Minimal Icon") {
    MinimalAppIcon(size: 300)
}