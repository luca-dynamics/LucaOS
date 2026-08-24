import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const bootstrapSource = readFileSync("src/index.tsx", "utf8");
const viteConfigSource = readFileSync("vite.config.ts", "utf8");

describe("web bootstrap entry boundary", () => {
  it("selects WebBridge before importing either runtime entry", () => {
    const selectorIndex = bootstrapSource.indexOf("selectLucaBootstrapEntry({");
    const webImportIndex = bootstrapSource.indexOf('import("./web/webBridgeEntry")');
    const desktopImportIndex = bootstrapSource.indexOf('import("./reactAppEntry")');

    expect(selectorIndex).toBeGreaterThanOrEqual(0);
    expect(webImportIndex).toBeGreaterThan(selectorIndex);
    expect(desktopImportIndex).toBeGreaterThan(webImportIndex);
    expect(bootstrapSource.startsWith('import "./web/webBootPolyfills";')).toBe(
      true,
    );
  });

  it("bundles, pre-optimizes, and explicitly boot-polyfills the browser buffer package", () => {
    const polyfillSource = readFileSync("src/web/webBootPolyfills.ts", "utf8");

    expect(viteConfigSource).toContain('include: ["buffer",');
    expect(polyfillSource).toContain('from "buffer"');
    expect(polyfillSource).toContain("globalThis.Buffer");
    expect(polyfillSource).toContain("window.Buffer");

    const externalBlock =
      viteConfigSource.match(/external:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    expect(externalBlock).not.toMatch(/["'](?:node:)?buffer["']/);
  });

  it("aliases Node EventEmitter imports away from Vite's browser external", () => {
    const nodePolyfillsSource = readFileSync(
      "src/mocks/node_polyfills.js",
      "utf8",
    );

    expect(viteConfigSource).toContain("events: path.resolve");
    expect(viteConfigSource).toContain('"node:events": path.resolve');
    expect(nodePolyfillsSource).toContain("export class EventEmitter");
    expect(nodePolyfillsSource).toContain("removeAllListeners(eventName)");
    expect(nodePolyfillsSource).toContain("setMaxListeners(count)");
    expect(nodePolyfillsSource).toContain("getMaxListeners()");
  });

  it("keeps the static boot loader responsive to short Electron windows", () => {
    const htmlSource = readFileSync("index.html", "utf8");

    expect(htmlSource).toContain("gap: clamp(7px, 2.4dvh, 18px)");
    expect(htmlSource).toContain("width: min(86vw, 62dvh, 500px)");
    expect(htmlSource).toContain("max-height: min(54dvh, 500px)");
    expect(htmlSource).toContain("@media (max-height: 460px)");
    expect(htmlSource).toContain("width: min(78vw, 50dvh, 420px)");
  });

  it("shows live boot process detail while the static loader waits", () => {
    const htmlSource = readFileSync("index.html", "utf8");

    expect(htmlSource).toContain('class="loader-phase"');
    expect(htmlSource).toContain("Loading saved setup");
    expect(htmlSource).toContain("Loading your workspace");
    expect(htmlSource).toContain("Finishing app setup");
    expect(htmlSource).toContain("loader.querySelector(\".loader-phase\")");
    expect(bootstrapSource).toContain("Starting the app");
    expect(bootstrapSource).toContain("Choosing the best app experience");
    expect(bootstrapSource).toContain("Loading the workspace");
  });
});

// A dev-server module fetch killed mid-flight (Wi-Fi flip, VPN, sleep/wake ->
// ERR_NETWORK_CHANGED) used to leave the app on a dead-end "failed to start"
// screen. The loader now recovers with a bounded reload. These pin the
// decisions in that recovery that are wrong-by-default and easy to "simplify"
// back into a defect.
describe("transient boot-failure recovery", () => {
  const htmlSource = readFileSync("index.html", "utf8");

  // The inline boot script cannot be imported, so extract it. Everything below
  // works on this slice rather than the whole document, so a match cannot come
  // from an unrelated part of the page. (`\r?` matters: index.html is committed
  // with CRLF endings on this platform.)
  const inlineBootScript = (() => {
    const blocks = htmlSource.match(/<script>\r?\n([\s\S]*?)\r?\n\s*<\/script>/);
    expect(blocks, "index.html must contain the inline boot script").not.toBe(
      null,
    );
    return blocks![1];
  })();

  it("keeps the inline boot script syntactically valid", () => {
    // The most expensive mistake available in this file: a syntax error in the
    // inline script bricks boot completely, before any module loads, with no
    // recovery path and nothing in the console that names this file. `Function`
    // compiles the body without running it, so this is a parse check.
    expect(() => new Function(inlineBootScript)).not.toThrow();
  });

  it("never auto-reloads for a connection that was refused", () => {
    // The distinction the whole feature rests on: reload what was INTERRUPTED,
    // never what was REFUSED. The core server and Cortex are routinely not up
    // yet while the renderer boots, the app is designed to start without them,
    // and no number of reloads will conjure a listener -- so treating
    // ERR_CONNECTION_REFUSED as transient would spend the budget on a
    // non-problem and then show a failure screen for a healthy app.
    expect(inlineBootScript).toContain("ERR_NETWORK_CHANGED");
    const transientLists = inlineBootScript.slice(
      inlineBootScript.indexOf("const MODULE_LOAD_FAILURES"),
      inlineBootScript.indexOf("const readBootRetryCount"),
    );
    expect(transientLists.length).toBeGreaterThan(0);
    expect(transientLists).not.toContain("ERR_CONNECTION_REFUSED");
  });

  it("requires the module load itself to have failed, not just nearby noise", () => {
    // Captured errors are backup evidence only. If any captured ERR_* could
    // qualify a failure as transient, an unrelated backend fetch failing during
    // boot would make a genuine app-code error look retryable and the app would
    // reload three times over a real bug before reporting it.
    expect(inlineBootScript).toContain("const isModuleLoadFailure");
    expect(inlineBootScript).toContain("!description &&");
    expect(inlineBootScript).toContain(
      "if (!isModuleLoadFailure && !isInterruptedTransport) return false;",
    );
  });

  it("bounds the reloads and forgets them when the window closes", () => {
    // sessionStorage, NOT localStorage: the budget must die with the window so
    // a fresh launch always gets a full set of retries. In localStorage, three
    // bad reloads on one afternoon would permanently disable recovery.
    expect(inlineBootScript).toContain("window.sessionStorage.getItem");
    expect(inlineBootScript).toContain("window.sessionStorage.setItem");
    expect(inlineBootScript).not.toContain("localStorage.setItem(BOOT_RETRY_KEY");
    expect(inlineBootScript).toContain("const BOOT_RETRY_LIMIT = 3");
    expect(inlineBootScript).toContain("if (attempts >= BOOT_RETRY_LIMIT) return false;");
  });

  it("tries to recover before painting the failure screen", () => {
    const recoveryIndex = inlineBootScript.indexOf(
      "window.__LUCA_TRY_BOOT_RECOVERY__ = (error)",
    );
    const failureIndex = inlineBootScript.indexOf(
      "window.__LUCA_SHOW_BOOT_FAILURE__ = (message, error)",
    );
    expect(recoveryIndex).toBeGreaterThanOrEqual(0);
    expect(failureIndex).toBeGreaterThan(recoveryIndex);
    // The failure screen is the last resort, reached only once recovery declines.
    expect(inlineBootScript).toContain(
      "if (window.__LUCA_TRY_BOOT_RECOVERY__(error)) return;",
    );
  });

  it("leaves the failure screen with a way out", () => {
    // Before this, a spent budget meant killing and relaunching the app.
    expect(htmlSource).toContain('id="loader-recover"');
    expect(htmlSource).toContain(
      '#root-loader[data-state="failed"] .loader-recover',
    );
    expect(inlineBootScript).toContain("window.location.reload()");
  });

  it("routes the entry's import failure through recovery, and resets on success", () => {
    // Order matters: reporting the failure first would paint the dead end even
    // when the very next line was going to recover from it.
    const recoveryCall = bootstrapSource.indexOf(
      "window.__LUCA_TRY_BOOT_RECOVERY__?.(error) === true",
    );
    const dispatch = bootstrapSource.indexOf(
      'new CustomEvent("luca-react-bootstrap-error")',
    );
    expect(recoveryCall).toBeGreaterThanOrEqual(0);
    expect(dispatch).toBeGreaterThan(recoveryCall);
    // A blip hours into a session should not be judged against one at startup.
    expect(bootstrapSource).toContain("window.__LUCA_CLEAR_BOOT_RECOVERY__?.()");
  });
});
