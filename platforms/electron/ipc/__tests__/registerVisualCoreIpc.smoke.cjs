/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('assert');
const { registerVisualCoreIpc } = require('../registerVisualCoreIpc.cjs');

function createFakeIpcMain() {
    const listeners = new Map();
    const handlers = new Map();
    return {
        on(channel, handler) {
            const channelListeners = listeners.get(channel) || [];
            channelListeners.push(handler);
            listeners.set(channel, channelListeners);
        },
        handle(channel, handler) {
            handlers.set(channel, handler);
        },
        listeners(channel) {
            return listeners.get(channel) || [];
        },
        handler(channel) {
            return handlers.get(channel);
        }
    };
}

function createFakeWindow({ visible = true, destroyed = false, bounds = { x: 10, y: 20, width: 30, height: 40 } } = {}) {
    const calls = [];
    const sent = [];
    return {
        calls,
        sent,
        webContents: {
            send(channel, payload) {
                sent.push({ channel, payload });
            }
        },
        getBounds: () => bounds,
        isVisible: () => visible,
        isDestroyed: () => destroyed,
        hide: () => calls.push('hide'),
        show: () => {
            visible = true;
            calls.push('show');
        },
        focus: () => calls.push('focus'),
        close: () => calls.push('close')
    };
}

function createHarness({ visualCoreWindow = null, mainWindow = null, browserFromWebContents, displayForBounds } = {}) {
    const ipcMain = createFakeIpcMain();
    const creates = [];
    const syncs = [];
    let pendingData = null;
    let ready = false;

    registerVisualCoreIpc({
        ipcMain,
        BrowserWindow: {
            fromWebContents: browserFromWebContents || (() => visualCoreWindow)
        },
        screen: {
            getDisplayMatching: displayForBounds || (() => ({ id: 7 }))
        },
        getVisualCoreWindow: () => visualCoreWindow,
        createVisualCoreWindow: (data) => creates.push(data),
        getVisualCorePendingData: () => pendingData,
        setVisualCorePendingData: (data) => {
            pendingData = data;
        },
        getVisualCoreReady: () => ready,
        setVisualCoreReady: (value) => {
            ready = value;
        },
        syncVisualCoreStatus: (value) => syncs.push(value),
        getMainWindow: () => mainWindow,
        logger: { log() {}, error() {} }
    });

    return {
        ipcMain,
        creates,
        syncs,
        get pendingData() { return pendingData; },
        set pendingData(value) { pendingData = value; },
        get ready() { return ready; },
        set ready(value) { ready = value; }
    };
}

{
    const visualCoreWindow = createFakeWindow({ bounds: { x: 1, y: 2, width: 3, height: 4 } });
    const harness = createHarness({
        visualCoreWindow,
        displayForBounds: (bounds) => {
            assert.deepStrictEqual(bounds, { x: 1, y: 2, width: 3, height: 4 });
            return { id: 42 };
        }
    });
    assert.strictEqual(harness.ipcMain.handler('get-current-display-id')({ sender: {} }), 42);
}

{
    const harness = createHarness({ visualCoreWindow: createFakeWindow(), displayForBounds: () => null });
    assert.strictEqual(harness.ipcMain.handler('get-current-display-id')({ sender: {} }), null);
}

{
    const harness = createHarness({ browserFromWebContents: () => { throw new Error('lookup failed'); } });
    assert.doesNotThrow(() => harness.ipcMain.handler('get-current-display-id')({ sender: {} }));
    assert.strictEqual(harness.ipcMain.handler('get-current-display-id')({ sender: {} }), null);
}

{
    const visualCoreWindow = createFakeWindow();
    const harness = createHarness({ visualCoreWindow });
    harness.pendingData = { hello: 'visual-core' };
    harness.ipcMain.listeners('visual-core-ready')[0]();
    assert.strictEqual(harness.ready, true);
    assert.deepStrictEqual(visualCoreWindow.sent, [{ channel: 'visual-core-update', payload: { hello: 'visual-core' } }]);
    assert.strictEqual(harness.pendingData, null);
}

{
    const harness = createHarness();
    const data = { open: true };
    harness.ipcMain.listeners('open-visual-core')[0]({}, data);
    assert.deepStrictEqual(harness.creates, [data]);
    assert.deepStrictEqual(harness.syncs, [true]);
}

{
    const visualCoreWindow = createFakeWindow();
    const harness = createHarness({ visualCoreWindow });
    harness.pendingData = { queued: true };
    const closeHandlers = harness.ipcMain.listeners('close-visual-core');
    assert.strictEqual(closeHandlers.length, 2);

    closeHandlers[0]();
    assert.deepStrictEqual(visualCoreWindow.calls, ['hide']);
    assert.strictEqual(harness.pendingData, null);
    assert.deepStrictEqual(harness.syncs, [false]);

    closeHandlers[1]();
    assert.deepStrictEqual(visualCoreWindow.calls, ['hide', 'close']);
}

{
    const visualCoreWindow = createFakeWindow({ visible: false });
    const harness = createHarness({ visualCoreWindow });
    harness.ready = true;
    const data = { ready: true };
    harness.ipcMain.listeners('update-visual-core')[0]({}, data);
    assert.deepStrictEqual(visualCoreWindow.sent, [
        { channel: 'visual-core-update', payload: data },
        { channel: 'visual-core-update', payload: data }
    ]);
    assert.deepStrictEqual(visualCoreWindow.calls, ['show', 'focus']);
    assert.deepStrictEqual(harness.syncs, [true]);
}

{
    const visualCoreWindow = createFakeWindow({ visible: false });
    const harness = createHarness({ visualCoreWindow });
    const data = { ready: false };
    harness.ipcMain.listeners('update-visual-core')[0]({}, data);
    assert.deepStrictEqual(visualCoreWindow.sent, [{ channel: 'visual-core-update', payload: data }]);
    assert.strictEqual(harness.pendingData, data);
    assert.deepStrictEqual(visualCoreWindow.calls, ['show', 'focus']);
    assert.deepStrictEqual(harness.syncs, [true]);
}

{
    const harness = createHarness();
    const data = { missing: true };
    harness.ipcMain.listeners('update-visual-core')[0]({}, data);
    assert.deepStrictEqual(harness.creates, [data]);
    assert.deepStrictEqual(harness.syncs, [true]);
}

{
    const mainWindow = createFakeWindow();
    const harness = createHarness({ mainWindow });
    const interaction = { type: 'click' };
    harness.ipcMain.listeners('visual-core-interaction')[0]({}, interaction);
    assert.deepStrictEqual(mainWindow.sent, [{ channel: 'visual-core-feedback', payload: interaction }]);
}

{
    const visualCoreWindow = createFakeWindow();
    const harness = createHarness({ visualCoreWindow });
    const command = { type: 'navigate' };
    harness.ipcMain.listeners('visual-core-command')[0]({}, command);
    assert.deepStrictEqual(visualCoreWindow.sent, [{ channel: 'visual-core-remote-control', payload: command }]);
}
