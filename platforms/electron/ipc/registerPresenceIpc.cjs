/* eslint-disable @typescript-eslint/no-require-imports */
function registerPresenceIpc({ ipcMain, getWidgetWindow, getChatWindow, getHologramWindow, getVisualCoreWindow = () => null }) {
    ipcMain.on('sync-widget-state', (event, state, hologramState = state) => {
        const widgetWindow = getWidgetWindow();
        const chatWindow = getChatWindow();
        const hologramWindow = getHologramWindow();

        if (widgetWindow) {
            widgetWindow.webContents.send('widget-update', state);
        }
        if (chatWindow) {
            chatWindow.webContents.send('widget-update', state);
        }
        if (hologramWindow) {
            hologramWindow.webContents.send('hologram-update', hologramState);
        }
    });

    ipcMain.on('broadcast-app-state', (event, state) => {
        const visualCoreWindow = getVisualCoreWindow();
        const widgetWindow = getWidgetWindow();
        const chatWindow = getChatWindow();

        if (visualCoreWindow && !visualCoreWindow.isDestroyed()) {
            visualCoreWindow.webContents.send('sync-app-state', state);
        }
        if (widgetWindow && !widgetWindow.isDestroyed()) {
            widgetWindow.webContents.send('sync-app-state', state);
        }
        if (chatWindow && !chatWindow.isDestroyed()) {
            chatWindow.webContents.send('sync-app-state', state);
        }
    });
}

module.exports = { registerPresenceIpc };
