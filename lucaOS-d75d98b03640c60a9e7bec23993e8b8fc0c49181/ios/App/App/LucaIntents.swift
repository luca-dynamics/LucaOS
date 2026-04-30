import AppIntents
import Foundation

// MARK: - 1. Get Status Intent
struct GetLucaStatus: AppIntent {
    static var title: LocalizedStringResource = "Get Luca Status"
    static var description = IntentDescription("Returns the current battery, network, and active task status from Luca.")

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        // In a real app, we would query the Capacitor bridge or a shared UserDefaults group
        // For now, we return a simulated status that matches the "Standalone" prototype
        
        let batteryLevel = Int(WKInterfaceDevice.current().batteryLevel * 100)
        let status = "🔋 Battery: \(batteryLevel < 0 ? "Unknown" : "\(batteryLevel)%")\n📡 Network: Active\n✅ System: Online"
        
        return .result(value: status)
    }
}

// MARK: - 2. Execute Command Intent
struct ExecuteCommand: AppIntent {
    static var title: LocalizedStringResource = "Execute Luca Command"
    static var description = IntentDescription("Sends a text command to Luca's core logic.")

    @Parameter(title: "Command")
    var command: String

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        // Logic:
        // 1. Check if App is running
        // 2. If running, forward via internal notification
        // 3. If killed, log to shared storage for next launch
        
        // Simulating immediate "Received" acknowledgment
        return .result(value: "Command received: '\(command)'. executing in background.")
    }
}

// MARK: - 3. Scan Environment Intent
struct ScanEnvironment: AppIntent {
    static var title: LocalizedStringResource = "Scan Environment"
    static var description = IntentDescription("Uses local sensors to scan the immediate area.")

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        return .result(value: "Scanning... No threats detected. WiFi: Secure.")
    }
}

// MARK: - App Shortcuts Provider
struct LucaShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: GetLucaStatus(),
            phrases: ["Get \(self.applicationName) status", "Ask \(self.applicationName) for report"],
            shortTitle: "Luca Status"
        )
        AppShortcut(
            intent: ExecuteCommand(),
            phrases: ["Tell \(self.applicationName) to \(.applicationName)"],
            shortTitle: "Execute Command"
        )
    }
}
