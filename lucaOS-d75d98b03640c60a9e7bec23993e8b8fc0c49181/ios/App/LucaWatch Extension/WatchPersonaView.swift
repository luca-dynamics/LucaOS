import SwiftUI

/**
 * WatchPersonaView
 * 
 * Allows the user to switch L.U.C.A.'s persona from their wrist.
 * Uses specialized haptic signatures for each identity.
 */
struct WatchPersonaView: View {
    @ObservedObject var viewModel: WatchViewModel
    @Environment(\.presentationMode) var presentationMode
    
    let personas = ["ASSISTANT", "ENGINEER", "RUTHLESS", "HACKER", "DICTATION"]
    
    var body: some View {
        List {
            ForEach(personas, id: \.self) { p in
                Button(action: {
                    selectPersona(p)
                }) {
                    HStack {
                        Circle()
                            .fill(colorFor(p))
                            .frame(width: 10, height: 10)
                        
                        Text(p)
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                        
                        Spacer()
                        
                        if viewModel.persona == p {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(colorFor(p))
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("PERSONA")
    }
    
    func selectPersona(_ p: String) {
        // Trigger distinct haptics per persona
        switch p {
        case "RUTHLESS": WKInterfaceDevice.current().play(.directionUp)
        case "ENGINEER": WKInterfaceDevice.current().play(.success)
        case "HACKER": WKInterfaceDevice.current().play(.click)
        default: WKInterfaceDevice.current().play(.click)
        }
        
        viewModel.switchPersona(to: p)
        presentationMode.wrappedValue.dismiss()
    }
    
    func colorFor(_ p: String) -> Color {
        switch p {
        case "ENGINEER": return Color(red: 0.96, green: 0.62, blue: 0.04)
        case "RUTHLESS": return Color(red: 0.28, green: 0.54, blue: 0.96)
        case "HACKER": return Color(red: 0.06, green: 0.73, blue: 0.51)
        case "DICTATION": return Color(red: 0.66, green: 0.33, blue: 0.97)
        default: return .white
        }
    }
}
