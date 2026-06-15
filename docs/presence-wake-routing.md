# Presence-first wake routing

Wake-word and voice-summon events now route to Luca Presence before the dashboard:

1. Keep or create the dashboard renderer as the hidden owner of the existing voice runtime.
2. Keep or create the non-focusable Hologram Face window.
3. Show the Hologram Face with `showInactive()` so the user's current application retains focus.
4. Send an immediate listening update through the existing `hologram-update` channel.
5. Synchronize the already-active wake-word voice state through `trigger-voice-hud`; shortcut summons
   activate the existing dashboard voice runtime through `trigger-voice-toggle` with `forceHud: false`.
6. Continue forwarding transcript, listening, speaking, and amplitude data through the existing
   `widget-voice-data` → `widget-update` / `hologram-update` path.

The dashboard remains the fallback when the voice runtime or Hologram surface cannot be created.
Manual dashboard, tray, MiniChat (`Ctrl+M`), and widget actions retain their existing behavior.

## Manual QA

1. Start LucaOS normally and confirm startup completes.
2. Open the dashboard from the tray and confirm it receives focus.
3. Press `Ctrl+M` and confirm MiniChat toggles normally.
4. Press `Ctrl+H` while the Hologram is hidden and confirm the Hologram appears and voice activates
   without focusing the dashboard; press it again to exercise the existing voice toggle.
5. Trigger “Hey Luca” while another application has focus and confirm the Hologram appears while
   that application remains focused.
6. Temporarily force Hologram window creation to fail and confirm the dashboard voice UI opens as
   the safe fallback.
7. Speak after activation and confirm listening state, transcript, speaking state, and amplitude
   continue to update the Hologram and Widget.

## Follow-up work

- Extract voice runtime ownership from the dashboard renderer into a dedicated Presence Runtime.
- Add explicit presence-surface health/readiness reporting instead of relying on BrowserWindow creation.
- Add intent routing for explicit MiniChat requests and dashboard/control-center requests.
- Add Electron main-process integration tests with mocked BrowserWindow lifecycle failures.
