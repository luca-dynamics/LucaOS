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

## Boot behavior

### Shared boot visual, web-safe runtime

The Vercel/browser-safe preview now reuses the existing landing-page hologram face asset (`landing/hologram.png`) for the LucaOS boot presence instead of the old ring/orb/logo-icon loader. Both the root pre-hydration frame and the React boot shell use a large centered hologram face, a black/graphite base, restrained ice-cyan glow, LucaOS identity copy, a thin progress line, and minimal readiness typography without dot chips or badge cards.

In explicit web preview mode (`VITE_LUCA_RELEASE_TARGET=web` plus `VITE_LUCA_RUNTIME_TARGET=vercel`), or when a deployed browser host such as `*.vercel.app` or `app.lucaos.space` indicates the same web-preview surface, `policy.shouldRenderBrowserSafeApp === true` means the app shows that shared premium shell only as a brief transition and then resolves into the guarded LucaOS interface. Web boot does not wait for desktop/local runtime readiness and does not require localhost, Cortex, Ollama, Electron, or native-service polling before rendering the browser-safe app shell.

The runtime difference is capability logic only:

- Desktop boot keeps the full Electron/native/local readiness sequence, including memory, tool, model, device, and boot guard checks.
- Web boot uses browser-safe readiness copy and state while skipping desktop probes, localhost/Cortex/Ollama polling, and LucaLink/native-device probes.
- Unavailable native capabilities remain guarded instead of becoming fake-ready execution claims.

Browser-safe readiness lines currently surface as:

- Web surface: `Web surface ready`
- Memory surface: `Memory surface prepared`
- Model router: `Model router guarded`
- Desktop runtime: `Desktop runtime requires LucaOS Desktop`
- LucaLink: `LucaLink requires pairing`
- Actions: `Actions remain permissioned`

The desktop app still preserves the full boot sequence, runtime initialization, and readiness checks. The web shortcut applies only to the browser-safe web/Vercel policy path and does not weaken Electron/local desktop boot guards. Landing pages, Vercel configuration, and domain/deployment settings are not part of this boot behavior.


### Web boot resolution

`src/config/browserSafeBootResolver.ts` owns the browser-safe boot resolver. It activates when the web access policy reports `policy.shouldRenderBrowserSafeApp === true` and one of the robust browser-preview signals is present: `VITE_LUCA_RELEASE_TARGET=web`, `VITE_LUCA_RUNTIME_TARGET=vercel`, `VITE_LUCA_APP_MODE=web`, a `*.vercel.app` hostname, or `app.lucaos.space`. Electron/native desktop is explicitly excluded. In that mode the premium hologram boot visual is a short intro: the app marks the web surface ready immediately, keeps the visual on screen for a controlled 1.2 second minimum, and has a web-only 2 second fallback timeout so the preview cannot remain indefinitely on the boot page. After that timeout, the render path prioritizes the browser-safe shell even when desktop/runtime readiness is false, because those desktop/local services are expected to be unavailable in a deployed browser.

The resolver does not claim desktop authority. Electron/native readiness, localhost polling, Cortex, Ollama, local models, filesystem access, and host actions are skipped only for the browser-safe web boot path and remain represented as `desktop-required`, `pairing-required`, `api-required`, skipped, disabled, or permissioned in the app. Desktop/Electron/local builds do not use this resolver bypass and continue through the full boot readiness checks, runtime guards, and recovery behavior.

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

The public web shell still exists as the fallback/safety layer for truly non-app public pages. App-preview boot no longer depends on every Vercel variable being perfectly paired: an explicit web release target, Vercel runtime target, web app mode, or public deployment hostname can choose the browser-safe app interface shell as long as Electron/native desktop is not present. Future authenticated API/session state also flows through the same guarded app path rather than creating another runtime mode.

## Debugging web boot

Expected web app env values are:

- `VITE_LUCA_RELEASE_TARGET=web`
- `VITE_LUCA_RUNTIME_TARGET=vercel`
- optional `VITE_LUCA_APP_MODE=web`

The browser-safe boot resolver also accepts deployed browser hosts (`*.vercel.app` and `app.lucaos.space`) so env drift cannot leave the deployed preview on the boot screen indefinitely. Browser-safe boot should resolve after the short intro and no later than the 2 second fallback timeout. Desktop runtime remains unavailable in web and native-only capabilities should show disabled, skipped, pairing-required, API-required, or desktop-required states.

Use `?bootDebug=1` (for example, `https://app.lucaos.space/?bootDebug=1`) to print a `[LucaOS web boot]` diagnostic snapshot and show a tiny non-invasive boot panel. If web remains on boot, check the console for that prefix and confirm `shouldRenderBrowserSafeApp`, `resolverActive`, `bootSequence`, `showBootShell`, and `fallbackTimeoutMs`. If the resolver is active and boot still exits into an error panel, the remaining blocker is an app-shell render error after boot rather than the boot resolver itself.

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
