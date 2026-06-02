# LucaLink Runtime Shadow Wiring

PR #190 introduces diagnostics-only LucaLink runtime shadow wiring. Shadow mode runs beside the existing LucaLink relay, local, guest, WebRTC, mission sync, and sensor sync paths and records what the mesh observer would have reported.

## What shadow mode does

- Observes selected live LucaLink events in memory.
- Adapts legacy runtime shapes through the LucaLink legacy adapter.
- Produces runtime observations such as `would-allow`, `would-deny`, `would-require-primary-host-approval`, `would-route`, `adapter-warning`, and `adapter-error`.
- Maintains a capped in-memory observation buffer.
- Optionally calls a diagnostic `onObservation` callback.
- Optionally logs concise developer diagnostics when `logToConsole === true`.

## What shadow mode does not do

- It does not block, reject, rewrite, or enforce messages.
- It does not add approval gates or user prompts.
- It does not change pairing, Socket.IO, relay/local/VPN, mDNS, guest access, WebRTC, crypto/session, mission sync, sensor sync, Settings UI, boot, onboarding, theme, shell, or background behavior.
- It does not write observations to storage.
- It does not send diagnostics over the network.
- It does not use `Origin` as a LucaLink device authority; normal mesh authority remains `Primary Host`.

## Supported observed event types

The shadow helper accepts any event name, but the current adapter recognizes these legacy LucaLink events:

- `message`
- `sync`
- `registry`
- `mission`
- `SENSOR_PULSE`
- `guest-connected`
- `guest-message`
- `desktop-to-guest`
- `guest-disconnected`
- `webrtc-offer`
- `webrtc-answer`
- `webrtc-ice-candidate`
- `heartbeat`
- `error`
- `unknown`

Unknown event names are converted into adapter-warning observations rather than failures.

## Enabling diagnostics

Runtime shadow diagnostics are disabled by default. The LucaLink service exposes non-invasive controls:

```ts
lucaLink.enableRuntimeShadowDiagnostics({ maxObservations: 100 });
lucaLink.getRuntimeShadowObservations();
lucaLink.getRuntimeShadowSummary();
lucaLink.clearRuntimeShadowObservations();
lucaLink.disableRuntimeShadowDiagnostics();
```

A future caller can also submit a diagnostics-only event directly:

```ts
lucaLink.observeRuntimeEventForDiagnostics({
  eventName: "message",
  payload,
  sourceDeviceId,
  targetDeviceId,
});
```

## Observation buffer

The buffer is in-memory only and capped by `maxObservations` with ring-buffer semantics. Each observation may include:

- event name
- diagnostic decision
- adapted typed envelope, when one is available
- selected host id and role, when routing can be evaluated
- Primary Host approval requirement, if the observer would require it
- reasons, warnings, and errors

## Next step

The next LucaLink runtime phase can use these diagnostics to identify safe soft-enforcement or high-risk gate candidates. Any future enforcement must remain separate from this PR's shadow-only behavior.
