# WebBridge Lifecycle

WebBridge is LucaOS's browser-safe runtime adapter, not a separate product
homepage. Browser boot continues to select `webBridgeEntry`, which detects the
host and capability context before the LucaOS web lifecycle chooses a surface.

## Browser lifecycle

1. New or unknown browser profiles enter browser-safe LucaOS onboarding.
2. Completed browser profiles enter the web-safe LucaOS main interface.
3. Host classification and capability graphs remain background runtime context.
4. Host & Capabilities and LucaLink are reached through Settings, status, or a
   contextual Luca route rather than mandatory boot action cards.
5. Diagnostics remain hidden unless `?bootDebug=1` is present.

The browser lifecycle may persist only browser-safe profile state. It must not
initialize the desktop encrypted vault, SQLite memory, local model scanners,
native automation, Electron IPC, or desktop LucaLink host controllers.

Desktop and Electron startup continue to select `reactAppEntry` and retain the
full native runtime.

## Existing LucaOS UX audit

The concrete source-by-source extraction record is maintained in
[`WEBBRIDGE_UX_PARITY_AUDIT.md`](./WEBBRIDGE_UX_PARITY_AUDIT.md).

The browser path reuses LucaOS experience architecture rather than mounting a
parallel WebBridge product:

- **A — safe to reuse directly:** shell surface tokens in
  `src/styles/lucaShellStyles.ts` and settings surface tokens/layout styling in
  `src/components/settings/settingsLayoutStyles.ts`.
- **B — visual/state architecture extracted:** the identity → conversation mode
  → interface calibration → model route → activation progression from the
  original onboarding, plus the LucaOS three-zone workspace rhythm, Settings
  navigation, and LucaLink Device Center composition. These now live in
  browser-safe `src/shared/onboarding`, `src/shared/app-shell`,
  `src/shared/settings`, and `src/shared/ui` modules.
- **C — desktop/native runtime only:** the full `OnboardingFlow`, `App`,
  conversational model services, local provisioning/model scan, encrypted
  vault/SQLite memory, native voice stack, Electron bridge, automation, and the
  desktop LucaLink host controller. Web adapters must not import these modules.

`src/web` therefore supplies lifecycle storage, host/capability data, and
browser substitutions to shared LucaOS surfaces. Host & Capabilities is a
Settings/System section, and LucaLink remains a Settings/status/contextual
workflow rather than a boot destination.
