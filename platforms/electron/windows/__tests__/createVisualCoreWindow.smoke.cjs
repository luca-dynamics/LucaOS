/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('assert');
const { createVisualCoreWindow, resolveVisualCoreLoadUrl } = require('../createVisualCoreWindow.cjs');

function createFakeBrowserWindowClass(instances) {
    return class FakeBrowserWindow {
        constructor(options) {
            this.options = options;
            this.events = new Map();
            this.onceEvents = new Map();
            this.loadedUrls = [];
            this.calls = [];
            instances.push(this);
        }
        on(channel, handler) { this.events.set(channel, handler); }
        once(channel, handler) { this.onceEvents.set(channel, handler); }
        loadURL(url) { this.loadedUrls.push(url); }
        setVisibleOnAllWorkspaces(...args) { this.calls.push(['setVisibleOnAllWorkspaces', ...args]); }
        show() { this.calls.push(['show']); }
        focus() { this.calls.push(['focus']); }
        isMinimized() { return false; }
        getBounds() { return { x: 11, y: 22, width: 333, height: 222 }; }
    };
}

function createWindow(overrides = {}) {
    const instances = [];
    const pending = [];
    const readyStates = [];
    const closed = [];
    const BrowserWindow = createFakeBrowserWindowClass(instances);
    const window = createVisualCoreWindow({
        BrowserWindow,
        screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1440, height: 900 } }) },
        isDev: false,
        devPort: 5173,
        distPath: '/repo/dist/index.html',
        preloadPath: '/repo/platforms/electron/preload.cjs',
        initialData: null,
        loadWindowStateVC: () => null,
        saveWindowStateVC: () => {},
        setVisualCorePendingData: (data) => pending.push(data),
        setVisualCoreReady: (ready) => readyStates.push(ready),
        logger: { log() {}, error() {} },
        onClosed: () => closed.push(true),
        ...overrides
    });
    return { window, instances, pending, readyStates, closed };
}

{
    const { window } = createWindow();
    assert.strictEqual(window.options.width, 960);
    assert.strictEqual(window.options.height, 540);
    assert.strictEqual(window.options.minWidth, 320);
    assert.strictEqual(window.options.minHeight, 180);
    assert.strictEqual(window.options.frame, false);
    assert.strictEqual(window.options.transparent, true);
    assert.strictEqual(window.options.alwaysOnTop, true);
    assert.strictEqual(window.options.webPreferences.preload, '/repo/platforms/electron/preload.cjs');
    assert.strictEqual(window.options.webPreferences.webviewTag, true);
    assert.deepStrictEqual(window.calls[0], ['setVisibleOnAllWorkspaces', true, { visibleOnFullScreen: true }]);
}

{
    const { window } = createWindow({ loadWindowStateVC: () => ({ x: 5, y: 6, width: 700, height: 400 }) });
    assert.strictEqual(window.options.x, 5);
    assert.strictEqual(window.options.y, 6);
    assert.strictEqual(window.options.width, 700);
    assert.strictEqual(window.options.height, 400);
}

{
    assert.strictEqual(
        resolveVisualCoreLoadUrl({ isDev: true, devPort: 5173, distPath: '/repo/dist/index.html' }),
        'http://localhost:5173?mode=visual_core'
    );
    assert.strictEqual(
        resolveVisualCoreLoadUrl({ isDev: false, devPort: 5173, distPath: '/repo/dist/index.html' }),
        'file:///repo/dist/index.html?mode=visual_core'
    );
    const { window } = createWindow({ isDev: true });
    assert.deepStrictEqual(window.loadedUrls, ['http://localhost:5173?mode=visual_core']);
}

{
    const initialData = { preserve: 'pending until renderer ready' };
    const { window, pending, readyStates, closed } = createWindow({ initialData });
    window.onceEvents.get('ready-to-show')();
    assert.deepStrictEqual(window.calls.slice(-2), [['show'], ['focus']]);
    assert.deepStrictEqual(pending, [initialData]);

    window.events.get('closed')();
    assert.deepStrictEqual(readyStates, [false]);
    assert.deepStrictEqual(pending, [initialData, null]);
    assert.deepStrictEqual(closed, [true]);
}
