/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('assert');
const { registerWidgetIpc } = require('../registerWidgetIpc.cjs');

function createFakeIpcMain() {
    const listeners = new Map();
    return {
        on(channel, handler) {
            const channelListeners = listeners.get(channel) || [];
            channelListeners.push(handler);
            listeners.set(channel, channelListeners);
        },
        listeners(channel) {
            return listeners.get(channel) || [];
        }
    };
}

function createFakeWindow({ destroyed = false } = {}) {
    const sent = [];
    return {
        sent,
        isDestroyed: () => destroyed,
        webContents: {
            send(channel, payload) {
                sent.push({ channel, payload });
            }
        }
    };
}

function registerWithWindows(windows = {}) {
    const ipcMain = createFakeIpcMain();
    const widgetWindow = windows.widgetWindow;
    const chatWindow = windows.chatWindow;
    const hologramWindow = windows.hologramWindow;
    const mainWindow = windows.mainWindow;

    registerWidgetIpc({
        ipcMain,
        getWidgetWindow: () => widgetWindow,
        getChatWindow: () => chatWindow,
        getHologramWindow: () => hologramWindow,
        getMainWindow: () => mainWindow,
        toggleWidgetWindow: () => {},
        logger: { log: () => {} }
    });

    return { ipcMain, widgetWindow, chatWindow, hologramWindow, mainWindow };
}

{
    const mainWindow = createFakeWindow();
    const { ipcMain } = registerWithWindows({ mainWindow });
    assert.strictEqual(ipcMain.listeners('widget-toggle-voice').length, 1);

    const payload = {
        mode: 'TOGGLE',
        context: 'widget',
        requestId: 'voice-req-1',
        legacyFlag: true
    };
    ipcMain.listeners('widget-toggle-voice')[0]({}, payload);

    assert.deepStrictEqual(mainWindow.sent, [{
        channel: 'trigger-voice-toggle',
        payload: {
            mode: 'TOGGLE',
            context: 'widget',
            requestId: 'voice-req-1',
            legacyFlag: true,
            forceHud: false
        }
    }]);
    assert.deepStrictEqual(payload, {
        mode: 'TOGGLE',
        context: 'widget',
        requestId: 'voice-req-1',
        legacyFlag: true
    });
}

{
    const { ipcMain } = registerWithWindows();
    assert.doesNotThrow(() => {
        ipcMain.listeners('widget-toggle-voice')[0]({}, { mode: 'TOGGLE', context: 'missing-main' });
    });

    const destroyedMainWindow = createFakeWindow({ destroyed: true });
    const destroyedRegistration = registerWithWindows({ mainWindow: destroyedMainWindow });
    assert.doesNotThrow(() => {
        destroyedRegistration.ipcMain.listeners('widget-toggle-voice')[0]({}, { mode: 'TOGGLE', context: 'destroyed-main' });
    });
    assert.deepStrictEqual(destroyedMainWindow.sent, []);
}

{
    const widgetWindow = createFakeWindow();
    const hologramWindow = createFakeWindow();
    const chatWindow = createFakeWindow();
    const { ipcMain } = registerWithWindows({ widgetWindow, hologramWindow, chatWindow });
    assert.strictEqual(ipcMain.listeners('widget-voice-data').length, 1);

    const data = {
        transcript: 'hello Luca',
        isListening: true,
        isVadActive: true,
        amplitude: 0.42,
        status: 'LISTENING',
        source: 'widget',
        provider: 'fallback-provider',
        legacyUnknown: { keep: true }
    };
    const before = JSON.parse(JSON.stringify(data));

    ipcMain.listeners('widget-voice-data')[0]({}, data);

    assert.deepStrictEqual(widgetWindow.sent, [{ channel: 'widget-update', payload: data }]);
    assert.deepStrictEqual(hologramWindow.sent, [{ channel: 'hologram-update', payload: data }]);
    assert.deepStrictEqual(chatWindow.sent, [{ channel: 'widget-update', payload: data }]);
    assert.strictEqual(widgetWindow.sent[0].payload, data);
    assert.strictEqual(hologramWindow.sent[0].payload, data);
    assert.strictEqual(chatWindow.sent[0].payload, data);
    assert.deepStrictEqual(data, before);
}

{
    const widgetWindow = createFakeWindow({ destroyed: true });
    const hologramWindow = createFakeWindow({ destroyed: true });
    const chatWindow = createFakeWindow({ destroyed: true });
    const { ipcMain } = registerWithWindows({ widgetWindow, hologramWindow, chatWindow });

    assert.doesNotThrow(() => {
        ipcMain.listeners('widget-voice-data')[0]({}, { transcript: 'ignored for destroyed windows' });
    });
    assert.deepStrictEqual(widgetWindow.sent, []);
    assert.deepStrictEqual(hologramWindow.sent, []);
    assert.deepStrictEqual(chatWindow.sent, []);
}
