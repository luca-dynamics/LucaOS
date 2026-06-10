# LucaOS web interface preview

The current `build:web` path renders the browser-safe LucaOS interface shell for visual and product QA. This is an evolution of the existing web/Vercel build path, not a new preview mode, not `design-preview`, and not a new runtime target.

## What renders in the browser

When `VITE_LUCA_RELEASE_TARGET=web` and `VITE_LUCA_RUNTIME_TARGET=vercel` are both set, the browser renders the main LucaOS app shell instead of stopping at the minimal public shell. This lets the founder and product team visually inspect the real LucaOS layout direction:

- Apple-premium dashboard structure
- boot/onboarding visual direction where browser-safe
- Hologram and LucaScreen visual surfaces
- Personal Intelligence summary/privacy shells
- LucaLink desktop-host and pairing shells
- Model Manager shell
- Operation Center shell
- desktop and mobile responsive layout

The rendered web interface is browser-safe. It does not turn the public web build into a trusted production runtime.

## Shared boot visual, web-safe runtime

The Vercel/browser-safe preview now reuses the same premium LucaOS boot visual language as desktop instead of a separate generic orb loader. Both the root pre-hydration frame and the React boot shell use a Luca/hologram face presence field, dark graphite base, controlled teal/ice-cyan glow, host grid, scan atmosphere, LucaOS identity copy, and refined readiness lines.

In explicit web preview mode (`VITE_LUCA_RELEASE_TARGET=web` plus `VITE_LUCA_RUNTIME_TARGET=vercel`), `policy.shouldRenderBrowserSafeApp === true` means the app shows that shared premium shell only as a brief transition and then resolves into the guarded LucaOS interface. Web boot does not wait for desktop/local runtime readiness and does not require localhost, Cortex, Ollama, Electron, or native-service polling before rendering the browser-safe app shell.

The runtime difference is capability logic only:

- Desktop boot keeps the full Electron/native/local readiness sequence, including memory, tool, model, device, and boot guard checks.
- Web boot uses browser-safe readiness copy and state while skipping desktop probes.
- Unavailable native capabilities remain guarded instead of becoming fake-ready execution claims.

Browser-safe readiness lines currently surface as:

- Web surface: `Web surface ready`
- Memory surface: `Memory surface prepared`
- Model router: `Model router guarded`
- Desktop runtime: `Desktop runtime requires LucaOS Desktop`
- LucaLink: `LucaLink requires pairing`
- Actions: `Actions remain permissioned`

The desktop app still preserves the full boot sequence, runtime initialization, and readiness checks. The web shortcut applies only to the browser-safe web/Vercel policy path and does not weaken Electron/local desktop boot guards.

## Trusted runtime boundary

LucaOS Desktop remains the trusted full runtime. Browser builds must not directly execute or reach for:

- Electron IPC
- filesystem access
- shell commands
- desktop automation
- local model execution
- Ollama or localhost fallback calls
- provider secrets or direct provider routing
- privileged LucaLink host actions
- raw Personal Intelligence memory storage

Unsupported actions are visible for layout QA but resolve to disabled/no-op, `Requires LucaOS Desktop`, `Requires paired desktop host`, `Requires authenticated API`, or `Coming through secure bridge` states.

## Capability guard model

`src/config/webRuntimeCapabilities.ts` defines browser-safe capability statuses:

- `available`
- `disabled_in_web`
- `desktop_required`
- `api_required`
- `pairing_required`
- `unsupported`

The capability registry covers Hologram, LucaScreen, VoiceHUD, Mini Chat, Personal Intelligence, LucaLink, Model Manager, Local Models, Browser/Tools, Operation Center, Desktop Control, File/System Access, and Provider Routing.

## Public shell fallback

The public web shell still exists as the fallback/safety layer. It appears for partial or misconfigured public web state, such as setting only one of the required web target variables.

Explicit web/Vercel configuration now chooses the browser-safe app interface shell. Future authenticated API/session state also flows through the same guarded app path rather than creating another runtime mode.

## Query mode blocking

Public web continues to block query-param bypasses for unsafe standalone surfaces:

- `?mode=widget`
- `?mode=chat`
- `?mode=hologram`
- `?mode=mobile`
- `?mode=tv`

Those modes cannot bypass the browser-safe capability guards. In web/Vercel builds, blocked query modes fall back to the guarded main app shell or the public shell fallback, depending on policy.

## Personal Intelligence and LucaLink continuity

Personal Intelligence in the web interface is a summary/privacy shell only. It does not expose raw memory and does not persist fake memory.

LucaLink in the web interface is a pairing/desktop-host shell only. It does not execute host actions. Hologram and LucaScreen states remain inspectable as visual surfaces while host actions remain desktop-required.

## Not included in this PR

This is not a production web app launch and does not attach a Vercel/domain deployment. Before a full hosted LucaOS web app, the following still remain:

- auth/session implementation
- `api.lucaos.space`
- secure device pairing
- real LucaLink bridge
- Personal Intelligence sync
- production import-boundary hard-fail
- production asset/security review
