import SwiftUI
import UIKit

@MainActor
class AppIconGenerator: ObservableObject {
    @Published var isGenerating = false
    @Published var generatedIcons: [String: UIImage] = [:]
    @Published var statusMessage = ""

    // iOS App Icon Requirements
    static let requiredSizes: [String: CGFloat] = [
        // iPhone App Icons
        "Icon-App-60x60@2x": 120,     // iPhone App Icon (iOS 7-15)
        "Icon-App-60x60@3x": 180,     // iPhone App Icon (iOS 7-15)

        // iPad App Icons
        "Icon-App-76x76@1x": 76,      // iPad App Icon (iOS 7-15)
        "Icon-App-76x76@2x": 152,     // iPad App Icon (iOS 7-15)
        "Icon-App-83.5x83.5@2x": 167, // iPad Pro App Icon (iOS 9-15)

        // Settings Icons
        "Icon-App-29x29@1x": 29,      // iPhone Settings (iOS 5-6)
        "Icon-App-29x29@2x": 58,      // iPhone Settings (iOS 7-15)
        "Icon-App-29x29@3x": 87,      // iPhone Settings (iOS 7-15)

        // Spotlight Icons
        "Icon-App-40x40@1x": 40,      // iPad Spotlight (iOS 7-15)
        "Icon-App-40x40@2x": 80,      // iPhone/iPad Spotlight (iOS 7-15)
        "Icon-App-40x40@3x": 120,     // iPhone Spotlight (iOS 7-15)

        // Notification Icons
        "Icon-App-20x20@1x": 20,      // iPad Notification (iOS 7-15)
        "Icon-App-20x20@2x": 40,      // iPhone/iPad Notification (iOS 7-15)
        "Icon-App-20x20@3x": 60,      // iPhone Notification (iOS 7-15)

        // App Store Icon
        "Icon-App-1024x1024@1x": 1024  // App Store
    ]

    func generateCompleteIconSet() async {
        isGenerating = true
        statusMessage = "Generating app icons..."
        generatedIcons.removeAll()

        for (iconName, size) in Self.requiredSizes {
            statusMessage = "Generating \(iconName) (\(Int(size))px)..."

            let detailedIcon = await generateDetailedIcon(size: size)
            let minimalIcon = await generateMinimalIcon(size: size)

            // Store both versions
            if let detailed = detailedIcon {
                generatedIcons["detailed-\(iconName)"] = detailed
            }

            if let minimal = minimalIcon {
                generatedIcons["minimal-\(iconName)"] = minimal
            }

            // Small delay to prevent UI blocking
            try? await Task.sleep(nanoseconds: 10_000_000) // 0.01 second
        }

        statusMessage = "Generated \(generatedIcons.count) icons successfully!"
        isGenerating = false
    }

    private func generateDetailedIcon(size: CGFloat) async -> UIImage? {
        let iconView = CustomAppIcon(size: size)
        return await iconView.renderAsImage()
    }

    private func generateMinimalIcon(size: CGFloat) async -> UIImage? {
        let iconView = MinimalAppIcon(size: size)
        return await iconView.renderAsImage()
    }

    func saveIconsToPhotos() {
        guard !generatedIcons.isEmpty else { return }

        for (name, image) in generatedIcons {
            UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        }

        statusMessage = "Saved \(generatedIcons.count) icons to Photos!"
    }

    func exportIconSet(style: IconStyle) -> [String: UIImage] {
        let filteredIcons = generatedIcons.filter { key, _ in
            switch style {
            case .detailed:
                return key.hasPrefix("detailed-")
            case .minimal:
                return key.hasPrefix("minimal-")
            }
        }

        // Remove the prefix from keys
        var cleanedIcons: [String: UIImage] = [:]
        for (key, image) in filteredIcons {
            let cleanKey = key.replacingOccurrences(of: "detailed-", with: "")
                              .replacingOccurrences(of: "minimal-", with: "")
            cleanedIcons[cleanKey] = image
        }

        return cleanedIcons
    }

    enum IconStyle {
        case detailed
        case minimal
    }
}

// Extension to render SwiftUI views as images
extension View {
    @MainActor
    func renderAsImage() async -> UIImage? {
        let renderer = ImageRenderer(content: self)
        renderer.scale = UIScreen.main.scale
        return renderer.uiImage
    }

    func asUIImage() -> UIImage? {
        let controller = UIHostingController(rootView: self)

        guard let view = controller.view else { return nil }

        let targetSize = controller.view.intrinsicContentSize
        view.bounds = CGRect(origin: .zero, size: targetSize)
        view.backgroundColor = .clear

        let renderer = UIGraphicsImageRenderer(size: targetSize)

        return renderer.image { _ in
            view.drawHierarchy(in: controller.view.bounds, afterScreenUpdates: true)
        }
    }
}

// SwiftUI Interface for Icon Generation
struct AppIconGeneratorView: View {
    @StateObject private var generator = AppIconGenerator()
    @State private var selectedStyle: AppIconGenerator.IconStyle = .detailed
    @State private var showingExportSheet = false

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "app.badge")
                        .font(.system(size: 60))
                        .foregroundColor(.accentColor)

                    Text("DUM App Icon Generator")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Generate all required iOS app icon sizes")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }

                // Style Selection
                VStack(alignment: .leading, spacing: 12) {
                    Text("Icon Style")
                        .font(.headline)

                    Picker("Style", selection: $selectedStyle) {
                        Text("Detailed Design").tag(AppIconGenerator.IconStyle.detailed)
                        Text("Minimal Design").tag(AppIconGenerator.IconStyle.minimal)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }

                // Preview
                Group {
                    switch selectedStyle {
                    case .detailed:
                        CustomAppIcon(size: 120)
                    case .minimal:
                        MinimalAppIcon(size: 120)
                    }
                }
                .frame(width: 120, height: 120)
                .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)

                // Generation Controls
                VStack(spacing: 16) {
                    if generator.isGenerating {
                        VStack(spacing: 8) {
                            ProgressView()
                                .scaleEffect(1.2)
                            Text(generator.statusMessage)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        Button("Generate All Icon Sizes") {
                            Task {
                                await generator.generateCompleteIconSet()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(generator.isGenerating)
                    }

                    if !generator.generatedIcons.isEmpty {
                        VStack(spacing: 12) {
                            Text(generator.statusMessage)
                                .font(.caption)
                                .foregroundColor(.green)

                            HStack(spacing: 12) {
                                Button("Save to Photos") {
                                    generator.saveIconsToPhotos()
                                }
                                .buttonStyle(.bordered)

                                Button("Export Package") {
                                    showingExportSheet = true
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }

                // Requirements Info
                VStack(alignment: .leading, spacing: 8) {
                    Text("Generated Sizes")
                        .font(.headline)

                    ScrollView {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 8) {
                            ForEach(Array(AppIconGenerator.requiredSizes.keys.sorted()), id: \.self) { key in
                                let size = AppIconGenerator.requiredSizes[key] ?? 0
                                Text("\(Int(size))px")
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(4)
                            }
                        }
                    }
                    .frame(maxHeight: 120)
                }

                Spacer()

                Text("Icons will be generated in PNG format at the correct sizes for iOS apps")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
            .navigationBarHidden(true)
        }
        .sheet(isPresented: $showingExportSheet) {
            let icons = generator.exportIconSet(style: selectedStyle)
            ShareSheet(items: Array(icons.values))
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    AppIconGeneratorView()
}