# WebBridge Lifecycle

> Direct product-UI reuse is currently blocked by unsafe imports in the
> canonical LucaOS components. The exact source files, import chains, and
> proposed isolation point are recorded in
> [`WEBBRIDGE_DIRECT_REUSE_AUDIT.md`](./WEBBRIDGE_DIRECT_REUSE_AUDIT.md).
> WebBridge intentionally renders only a plain technical blocker until the
> original UI can be imported without crossing the browser boundary.

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
