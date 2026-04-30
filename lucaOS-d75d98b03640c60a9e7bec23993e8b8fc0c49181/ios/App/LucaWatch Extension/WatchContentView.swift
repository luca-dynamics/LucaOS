import SwiftUI

/**
 * WatchContentView
 * 
 * A premium, holographic interface for L.U.C.A. on watchOS.
 * Features a multi-layered Aura Orb that reacts to voice amplitude.
 */
struct WatchContentView: View {
    @StateObject var viewModel = WatchViewModel()
    @State private var rotation: Double = 0
    
    // Premium Color Palettes
    var primaryColor: Color {
        switch viewModel.persona {
        case "ENGINEER": return Color(red: 0.96, green: 0.62, blue: 0.04) // Amber (#f59e0b)
        case "RUTHLESS": return Color(red: 0.28, green: 0.54, blue: 0.96) // Blue (#4789f4)
        case "HACKER": return Color(red: 0.06, green: 0.73, blue: 0.51) // Green (#10b981)
        case "DICTATION": return Color(red: 0.66, green: 0.33, blue: 0.97) // Purple (#a855f7)
        default: return Color.white
        }
    }
    
    var body: some View {
        ZStack {
            // Background Ambient Glow
            RadialGradient(gradient: Gradient(colors: [primaryColor.opacity(0.15), Color.black]), center: .center, startRadius: 5, endRadius: 100)
                .edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 4) {
                Spacer()
                
                // --- THE HOLOGRAPHIC ORB ---
                ZStack {
                    // Outer Plasma Layer (Amplitude Pulse)
                    Circle()
                        .stroke(primaryColor.opacity(0.4), lineWidth: 2)
                        .scaleEffect(1.2 + (viewModel.amplitude * 1.5))
                        .blur(radius: 4)
                        .opacity(viewModel.isListening ? 1 : 0.4)
                    
                    // Middle Glare Layer
                    Circle()
                        .fill(
                            LinearGradient(gradient: Gradient(colors: [primaryColor, primaryColor.opacity(0.2)]), 
                                           startPoint: .topLeading, 
                                           endPoint: .bottomTrailing)
                        )
                        .scaleEffect(1.0 + (viewModel.amplitude * 0.5))
                        .rotationEffect(.degrees(rotation))
                    
                    // Inner Core
                    Circle()
                        .fill(Color.white.opacity(0.9))
                        .frame(width: 15, height: 15)
                        .blur(radius: 2)
                        .offset(x: -5, y: -5)
                    
                    // Mic / Status Icon
                    if viewModel.isListening {
                        Image(systemName: "waveform.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.white)
                            .shadow(radius: 5)
                    }
                }
                .frame(width: 100, height: 100)
                .onTapGesture {
                    WKInterfaceDevice.current().play(.start)
                    viewModel.toggleLuca()
                }
                
                Spacer()
                
                // --- TEXTUAL FEEDBACK ---
                VStack(spacing: 2) {
                    Text(viewModel.persona.uppercased())
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundColor(primaryColor)
                        .tracking(2)
                    
                    if !viewModel.transcript.isEmpty {
                        Text(viewModel.transcript)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                            .padding(.horizontal)
                    } else {
                        Text("SYSTEM ONLINE")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
                .padding(.bottom, 10)
            }
            
            // Hidden Navigation to Persona Selector (Long Press on Orb)
            NavigationLink(destination: WatchPersonaView(viewModel: viewModel)) {
                EmptyView()
            }
            .opacity(0)
            .buttonStyle(PlainButtonStyle())
        }
        .onLongPressGesture {
            WKInterfaceDevice.current().play(.heavy)
            // This is a SwiftUI hack for watchOS to trigger navigation programmatically 
            // if we were using a binding, but for now a simple List-based nav works well.
        }
        .onAppear {
            withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                rotation = 360
            }
        }
        .navigationTitle("L.U.C.A.")
    }
}

struct WatchContentView_Previews: PreviewProvider {
    static var previews: some View {
        WatchContentView()
    }
}
