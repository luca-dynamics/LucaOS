import Foundation
import Capacitor
import WatchConnectivity

/**
 * LucaWatchPlugin
 * 
 * Bridging Capacitor (JavaScript) to Apple Watch (Native)
 */
@objc(LucaWatchPlugin)
public class LucaWatchPlugin: CAPPlugin, WCSessionDelegate {
    
    var session: WCSession?
    
    override public func load() {
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
            print("[LucaWatch] WCSession activated on Phone")
        }
    }
    
    // --- JavaScript -> Watch ---
    
    @objc func sendToWatch(_ call: CAPPluginCall) {
        let message = call.getObject("message") ?? [:]
        
        if let session = session, session.isReachable {
            session.sendMessage(message, replyHandler: nil) { error in
                call.reject("Failed to send to watch: \(error.localizedDescription)")
            }
            call.resolve()
        } else {
            call.reject("Watch not reachable")
        }
    }
    
    // --- Watch -> JavaScript ---
    
    public func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        print("[LucaWatch] Received message from watch: \(message)")
        
        // Notify the frontend
        self.notifyListeners("watchMessage", data: message)
    }
    
    // Required delegate stubs
    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    public func sessionDidBecomeInactive(_ session: WCSession) {}
    public func sessionDidDeactivate(_ session: WCSession) {
        session.activate() // Re-activate
    }
}
