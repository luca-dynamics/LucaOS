# Browser Runtime Router

`BrowserRuntimeRouter` provides guard-aware routing for browser runtime requests.

## Purpose

- Build a route context from normalized `BrowserRuntimeRequest` metadata.
- Enforce guard policy before selecting any execution lane.
- Select a browser runtime lane from policy rules, lane providers, or adapter fallback.
- Return a consistent `BrowserRuntimeRouteResult` payload for accepted and denied outcomes.

## Guard and routing rules

1. **Approval gate**
   - `dangerous` and `sensitive` requests are denied when `hasGuardApproval` is not set.
   - Denied response includes `requiresApproval: true`.

2. **Trust-first sandboxing**
   - `untrusted` requests always route to `sandbox_browser` before checking preferred lanes.

3. **Preferred lane constraints**
   - `authenticated_direct_host` requires `trustTier: trusted` and `hasGuardApproval: true`.
   - `remote_linked_browser` is allowed only when both `linkedDeviceTrusted` and `linkedDeviceAvailable` are true.

4. **Lane provider behavior**
   - When lane providers are configured, one provider must match.
   - If providers exist and none match, the request is denied with `unknown` lane.

5. **Adapter fallback behavior**
   - Adapter fallback is used only when no lane providers are configured.
   - The router selects the first adapter that can handle the request.

## Public API

- `registerAdapter(adapter)`
- `registerLaneProvider(provider)`
- `route(request)`
- `buildContext(request)`
- `evaluateGuardRules(context)`
- `pickLane(context)`
- `deniedUnknown()`
