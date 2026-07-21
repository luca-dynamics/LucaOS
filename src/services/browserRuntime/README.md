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

## Sandbox Playwright adapter (real-capable, default off)

`SandboxPlaywrightBrowserRuntimeAdapter` implements `BrowserRuntimeAdapter` for lane `sandbox_browser`.

- **Default:** `enabled: false` — fails closed, no driver calls.
- **Real work:** requires `enabled: true` **and** an injected `BrowserDriver` (mock, Playwright, or Electron sandbox IPC).
- Does **not** import Playwright at module top-level (safe for renderer/web bundles).
- Never sets `directHostAllowed`; never uses authenticated host Chrome profiles.
- Factory: `createSandboxBrowserRuntimeRouter({ enabled, driver })` from `src/services/browserRuntime`.

Computer-use pipeline integration remains separate (see `docs/computer-use-runtime-map.md`); this adapter is the first real browser body for the router.

## Real drivers

| Driver | Kind | Use |
|--------|------|-----|
| `PlaywrightBrowserDriver` | `playwright` | Node/Electron: CSS selectors, dynamic Playwright import |
| `ElectronSandboxBrowserDriver` | `electron_sandbox` | IPC luca-browser plans (role/name, not CSS) |

## Full stack factory

```ts
import { createRealSandboxComputerUseStack } from "./createRealSandboxComputerUseStack";

// Default: scaffold only
await createRealSandboxComputerUseStack();

// Real Playwright
const stack = await createRealSandboxComputerUseStack({
  enabled: true,
  driverKind: "playwright",
  playwright: { headless: true },
});
```
