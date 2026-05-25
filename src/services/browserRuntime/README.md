# Browser Runtime Router

`BrowserRuntimeRouter` now supports guard-aware lane routing for browser automation.

## Lanes

- `direct_host_browser`
- `sandbox_browser`
- `ghost_browser`
- `remote_linked_browser`
- `custom`
- `unknown`

## Request context

`BrowserRuntimeRequest` includes lane-routing context:

- `trustTier`: `trusted | verified | untrusted`
- `riskLevel`: `safe | sensitive | dangerous`
- `requiresAuthentication`
- `hasGuardApproval`
- `linkedDeviceTrusted`
- `linkedDeviceAvailable`
- `preferredLane`

## Guard-aware routing behavior

- Dangerous browser actions are denied unless guard approval exists.
- Sensitive actions return `requiresApproval: true` when approval is missing.
- Untrusted or non-safe tasks are routed to `sandbox_browser`.
- Authenticated sessions can use `direct_host_browser` only when trusted and guard-approved.
- `remote_linked_browser` requires linked device trust and availability.
- `ghost_browser` is the default safe browser body when available.
- If no matching provider exists, routing is denied with lane/runtime `unknown`.

## Compatibility

The router preserves the existing simple adapter pattern (`canHandle` + `execute`) as a fallback when lane providers are absent.
