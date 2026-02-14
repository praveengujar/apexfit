import SwiftUI

struct MainTabView: View {
    @State private var selectedTab: AppTab = .home

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(AppTab.home)

            CoachTabPlaceholder()
                .tabItem {
                    Label("Coach", systemImage: "brain.head.profile")
                }
                .tag(AppTab.coach)

            MyPlanTabPlaceholder()
                .tabItem {
                    Label("My Plan", systemImage: "calendar")
                }
                .tag(AppTab.myPlan)

            CommunityTabPlaceholder()
                .tabItem {
                    Label("Community", systemImage: "person.3.fill")
                }
                .tag(AppTab.community)

            HealthTabView()
                .tabItem {
                    Label("Health", systemImage: "heart.text.square.fill")
                }
                .tag(AppTab.health)
        }
        .tint(AppColors.primaryBlue)
    }
}

enum AppTab: String {
    case home, coach, myPlan, community, health
}
