# LucaOS Interface Design Principles

**Version**: 1.0  
**Authority**: Product/Design Systems Architecture  
**Applies to**: All LucaOS interface surfaces (desktop, mobile, voice, widget, overlay)

---

## Foundation

LucaOS is software inhabited by persistent AI cognition. Every interface decision must answer: "Does this make the user feel like they're operating a personal AI system, or just using another app?"

---

## Principle 1: OS-Level Calm, Not Dashboard Noise

The interface should feel like a **workspace you inhabit**, not a dashboard you visit.

- Default to showing less, not more
- Silence is acceptable; empty space is intentional
- No element should compete for attention unless it requires action
- Information density should match user tier, not maximum capability
- Animations serve transitions, not decoration
- Sound is ambient feedback, not notification spam

**Test**: If a first-time user feels overwhelmed within 10 seconds, the surface is too noisy.

---

## Principle 2: Center Is Conversation and Workspace, Not Just Chat

The center panel is the primary human-agent interaction space. It must evolve beyond a message list.

- Chat is one mode of the workspace, not the workspace itself
- The center should support: conversation, voice, browser, canvas, code, display sessions
- Mode switching should be fluid and state-preserving
- The center panel owns the user's attention — side panels support it

**Test**: Can the user accomplish their primary task without ever looking at the side panels?

---

## Principle 3: Right Side Is Operational Truth

The right panel is the system's honest self-report. It answers: "What is Luca doing, what does Luca know, and what does Luca need?"

- CONTROL: Current system state, pending approvals, runtime health
- ACTIVITY: Timeline of actions taken
- MEMORY: What the system remembers and believes
- LOGS: Execution trace for debugging

The right panel never lies, never hides problems, and never requires action to see truth.

**Test**: Can a user glance at the right panel and know if something needs their attention within 2 seconds?

---

## Principle 4: Left Side Is Capability Access

The left panel answers: "What can Luca do, and what tools are available?"

- Tools are organized by function, not by implementation
- Advanced tools are hidden from users who haven't opted into them
- Device linking lives here because devices are capabilities
- No tool should launch on hover — only on deliberate click
- Groups collapse to reduce density; only "Core" expands by default

**Test**: Can a Normal-mode user find what they need within 2 taps without encountering overwhelming options?

---

## Principle 5: Voice Is a System Layer, Not a Feature Tab

Voice is not accessed via navigation — it's an ambient capability of the OS.

- The OS can always be spoken to (when permission granted)
- Voice mode is a full-screen immersive experience, not a panel swap
- Wake-word activation produces a minimal indicator, not a full UI transition
- Voice status is a subtle system-level indicator (like Wi-Fi/Bluetooth icons)
- Transcript is ephemeral unless the user pins or saves it
- Voice-to-text handoff must be seamless and state-preserving

**Test**: Can the user start speaking without clicking anything?

---

## Principle 6: Memory Must Be Visible, Controllable, and Trustworthy

Users must always know what the system remembers, and must always be able to correct or delete it.

- Memory should be presented as "What Luca knows about you" — not raw data
- Every memory entry must have: source, timestamp, delete action
- Memory should build trust through transparency, not through silence
- Normal users see friendly summaries; Origin users see raw graph and approval trails
- The system must never feel like it's hiding what it knows

**Test**: Can the user find and delete any piece of information Luca has stored within 3 clicks?

---

## Principle 7: Device Linking Must Show Trust and Approval Clearly

Multi-device operation (LucaLink) must feel safe and controlled.

- Connected devices show clear trust indicators (verified, pending, untrusted)
- Every cross-device action requires visible approval (or pre-approved policy)
- Device permissions are granular and understandable
- The approval flow must be interruptible — the user can always say no
- For Normal users: simple connect/disconnect. For Origin: full permission matrix.

**Test**: Does the user feel in control of what devices can do, without reading documentation?

---

## Principle 8: Normal Users Get Simplicity

Normal mode is the default. It optimizes for:

- Minimal cognitive load
- Clear, limited choices
- No jargon (no "intent routing," "governance gates," "sync lanes")
- Obvious next actions
- Graceful degradation when features aren't available

The Normal dashboard should feel like talking to a helpful assistant in a calm room.

---

## Principle 9: Tactical Users Get Capability

Tactical mode expands the surface for power users who want:

- More tools visible in the left panel
- Runtime diagnostics in the right panel
- Model selection and routing visibility
- Execution traces and skill governance details
- IDE, browser, and code workspace modes

Tactical mode adds density without removing clarity.

---

## Principle 10: Origin Creators Get Deep Control

Origin mode is for the builder/founder who needs:

- Full agent operation graph
- Self-evolution controls and proposal review
- Memory internals with approval audit trails
- Device mesh topology and sync lane health
- Model router state and fallback chain visibility
- Skill registry with dry-run simulation
- Constraint gate configuration

Origin mode resembles Xcode Instruments — dense, technical, professional. Never "cyber."

---

## Principle 11: Themes Must Preserve Readability Before Style

The visual system serves comprehension, then aesthetics.

- Dynamic contrast must guarantee WCAG AA readability at all opacity levels
- Glass/blur effects are premium polish, not structural — content must be readable without them
- Light and dark modes must both work completely; neither is secondary
- Accent colors provide identity but must never carry semantic meaning alone
- Performance must be monitored: if glass costs >16ms frame time, degrade gracefully

**Test**: Is every text element readable if you screenshot the app and convert to grayscale?

---

## Principle 12: Preview and Scaffold Features Must Be Honest

Unfinished features must never pretend to be complete.

- Stub sections clearly indicate "Coming soon" or "Not yet connected"
- Preview/sample-data modules are labeled as such
- No "production" badges on scaffolded features
- Placeholder content uses honest language ("This will show X when connected")
- Users must never click something and get nothing without explanation

**Test**: Can the user distinguish between a feature that's broken and one that's not yet built?

---

## Principle 13: The Boot Sequence Is an Identity Moment

Boot is not a loading screen — it's the AI waking up.

- Boot establishes: "This is a system, not a website"
- Pacing should feel organic, not mechanical
- Subsystem initialization builds confidence that the system is thorough
- Boot visual quality sets expectations for the entire experience
- First-time boot (onboarding) should feel like meeting someone, not configuring software
- Returning-user boot should feel like reunion, not restart

---

## Principle 14: Mobile Is Not Desktop-Minus

Mobile is a different context with different needs.

- Mobile prioritizes: conversation, quick actions, notifications, device status
- Mobile hides: IDE, full skill registry, self-evolution controls, network maps
- Mobile navigation should be thumb-reachable (bottom bar)
- Mobile surfaces should feel native, not responsive-web
- Content should reflow, not shrink

**Test**: Can someone use LucaOS on their phone for 5 minutes without frustration?

---

## Application Hierarchy

```
Boot → Onboarding (first run) → Dashboard
                                    ├── Left: Capability Access
                                    ├── Center: Workspace (Chat/Voice/Browser/Canvas/Code)
                                    ├── Right: Operational Truth
                                    └── Overlays: VoiceHUD, Settings, Device Modals
```

Every surface traces back to one of these zones. No orphaned UI.

---

## Anti-Patterns (What LucaOS Must NOT Be)

- ❌ A "hacker dashboard" with green text on black
- ❌ A feature demo with every capability visible at once
- ❌ A chatbot with extra panels bolted on
- ❌ A settings app masquerading as an OS
- ❌ A developer tool that forgot about normal humans
- ❌ A marketing prototype that looks good but does nothing

---

## What LucaOS Must Feel Like

- ✓ macOS — calm, capable, always there
- ✓ iPhone on first boot — clear, guided, trustworthy
- ✓ A personal assistant's office — organized, professional, responsive
- ✓ A system you can rely on — honest about its state, clear about its limits
- ✓ An OS that grows with you — simple today, powerful when you're ready
