/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('assert');
const { registerPresenceIpc } = require('../registerPresenceIpc.cjs');

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

function createFakeWindow() {
    const sent = [];
    return {
        sent,
        isDestroyed: () => false,
        webContents: {
            send(channel, payload) {
                sent.push({ channel, payload });
            }
        }
    };
}

const ipcMain = createFakeIpcMain();
const widgetWindow = createFakeWindow();
const chatWindow = createFakeWindow();
const hologramWindow = createFakeWindow();

registerPresenceIpc({
    ipcMain,
    getWidgetWindow: () => widgetWindow,
    getChatWindow: () => chatWindow,
    getHologramWindow: () => hologramWindow
});

assert.strictEqual(ipcMain.listeners('sync-widget-state').length, 1);

const state = { status: 'READY' };
ipcMain.listeners('sync-widget-state')[0]({}, state);
assert.deepStrictEqual(widgetWindow.sent, [{ channel: 'widget-update', payload: state }]);
assert.deepStrictEqual(chatWindow.sent, [{ channel: 'widget-update', payload: state }]);
assert.deepStrictEqual(hologramWindow.sent, [{ channel: 'hologram-update', payload: state }]);

const hologramState = { status: 'LISTENING' };
ipcMain.listeners('sync-widget-state')[0]({}, state, hologramState);
assert.deepStrictEqual(hologramWindow.sent[1], { channel: 'hologram-update', payload: hologramState });
