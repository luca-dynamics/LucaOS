/* eslint-disable @typescript-eslint/no-require-imports */
function registerHologramIpc({ ipcMain, getHologramWindow }) {
    ipcMain.on('hologram-intent', (event, intent) => {
        const hologramWindow = getHologramWindow();
        if (hologramWindow) {
            hologramWindow.webContents.send('hologram-intent', intent);
        }
    });
}

module.exports = { registerHologramIpc };
