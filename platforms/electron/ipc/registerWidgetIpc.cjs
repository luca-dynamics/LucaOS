/* eslint-disable @typescript-eslint/no-require-imports */
function registerWidgetIpc({ ipcMain, getWidgetWindow, getChatWindow, getHologramWindow, getMainWindow, toggleWidgetWindow, logger = console }) {
    ipcMain.on('switch-to-widget', () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.hide();
        }
        toggleWidgetWindow();
    });

    ipcMain.on('widget-toggle-voice', (event, { mode, context }) => {
        logger.log(`[IPC] Widget requested voice toggle: ${mode} (Context: ${context})`);
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.webContents.send('trigger-voice-toggle', {
                mode: mode,
                context: context,
                forceHud: false
            });
        }
    });

    ipcMain.on('widget-voice-data', (event, data) => {
        const widgetWindow = getWidgetWindow();
        const hologramWindow = getHologramWindow();
        const chatWindow = getChatWindow();

        if (widgetWindow && !widgetWindow.isDestroyed()) {
            widgetWindow.webContents.send('widget-update', data);
        }
        if (hologramWindow && !hologramWindow.isDestroyed()) {
            hologramWindow.webContents.send('hologram-update', data);
        }
        if (chatWindow && !chatWindow.isDestroyed()) {
            chatWindow.webContents.send('widget-update', data);
        }
    });
}

module.exports = { registerWidgetIpc };
