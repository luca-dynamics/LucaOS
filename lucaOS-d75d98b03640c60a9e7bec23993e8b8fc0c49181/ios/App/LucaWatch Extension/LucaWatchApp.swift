import SwiftUI

/**
 * LucaWatchApp
 * 
 * Entry point for the Apple Watch application.
 */
@main
struct LucaWatchApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationView {
                WatchContentView()
            }
        }
    }
}
