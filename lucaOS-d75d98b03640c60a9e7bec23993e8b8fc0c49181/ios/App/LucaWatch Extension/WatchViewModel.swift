import Foundation
import WatchConnectivity
import SwiftUI

/**
 * WatchViewModel
 * 
 * Handles the Watch-side of the WCSession.
 * Receives amplitude, persona, and transcripts from the Phone/Desktop.
 */
class WatchViewModel: NSObject, ObservableObject, WCSessionDelegate {
    @Published var amplitude: Double = 0.0
    @Published var persona: String = "ASSISTANT"
    @Published var transcript: String = ""
    @Published var isListening: Bool = false
    
    var session: WCSession
    
    init(session: WCSession = .default) {
        self.session = session
        super.init()
        self.session.delegate = self
        self.session.activate()
    }
    
    // --- Message Receiver ---
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        DispatchQueue.main.async {
            if let amp = message["amplitude"] as? Double {
                self.amplitude = amp
            }
            if let pers = message["persona"] as? String {
                self.persona = pers
            }
            if let text = message["transcript"] as? String {
                self.transcript = text
            }
            if let listening = message["isVadActive"] as? Bool {
                self.isListening = listening
            }
        }
    }
    
    // --- Commands -> Phone ---
    func toggleLuca() {
        let command = isListening ? "STOP_VOICE" : "START_VOICE"
        session.sendMessage(["command": command], replyHandler: nil) { error in
            print("Failed to send command to phone: \(error.localizedDescription)")
        }
    }
    
    func switchPersona(to: String) {
        session.sendMessage(["command": "SWITCH_PERSONA", "payload": ["persona": to]], replyHandler: nil, errorHandler: nil)
    }

    // Delegate Stubs
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
}
