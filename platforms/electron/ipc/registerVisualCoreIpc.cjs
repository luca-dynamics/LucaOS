/* eslint-disable @typescript-eslint/no-require-imports */
function registerVisualCoreIpc({
    ipcMain,
    BrowserWindow,
    screen,
    getVisualCoreWindow,
    createVisualCoreWindow,
    getVisualCorePendingData,
    setVisualCorePendingData,
    getVisualCoreReady,
    setVisualCoreReady,
    syncVisualCoreStatus,
    getMainWindow,
    logger = console
}) {
    ipcMain.handle('get-current-display-id', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return null;
        const { x, y, width, height } = win.getBounds();
        const display = screen.getDisplayMatching({ x, y, width, height });
        return display.id;
    });

    ipcMain.on('visual-core-ready', () => {
        logger.log('[MAIN PROCESS] Smart Screen signaled READY');
        setVisualCoreReady(true);

        const visualCorePendingData = getVisualCorePendingData();
        const visualCoreWindow = getVisualCoreWindow();
        if (visualCorePendingData && visualCoreWindow) {
            logger.log('[MAIN PROCESS] Sending queued data to Smart Screen:', visualCorePendingData);
            visualCoreWindow.webContents.send('visual-core-update', visualCorePendingData);
            setVisualCorePendingData(null);
        }
    });

    ipcMain.on('open-visual-core', (event, data) => {
        createVisualCoreWindow(data);
        syncVisualCoreStatus(true);
    });

    ipcMain.on('close-visual-core', () => {
        logger.log('[MAIN PROCESS] Closing Smart Screen');
        const visualCoreWindow = getVisualCoreWindow();
        if (visualCoreWindow) {
            visualCoreWindow.hide();
            setVisualCorePendingData(null);
            syncVisualCoreStatus(false);
        }
    });

    ipcMain.on('update-visual-core', (event, data) => {
        logger.log('[MAIN PROCESS] Received update-visual-core IPC:', data);
        const visualCoreWindow = getVisualCoreWindow();
        if (visualCoreWindow) {
            visualCoreWindow.webContents.send('visual-core-update', data);
            if (getVisualCoreReady()) {
                logger.log('[MAIN PROCESS] Smart Screen is ready, sending directly');
                visualCoreWindow.webContents.send('visual-core-update', data);
            } else {
                logger.log('[MAIN PROCESS] Smart Screen not ready, queuing data');
                setVisualCorePendingData(data);
            }
            if (!visualCoreWindow.isVisible()) {
                visualCoreWindow.show();
                syncVisualCoreStatus(true);
            }
            visualCoreWindow.focus();
        } else {
            logger.log('[MAIN PROCESS] Creating new Smart Screen window with data');
            createVisualCoreWindow(data);
            syncVisualCoreStatus(true);
        }
    });

    ipcMain.on('visual-core-interaction', (event, interaction) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('visual-core-feedback', interaction);
        }
    });

    ipcMain.on('visual-core-command', (event, command) => {
        const visualCoreWindow = getVisualCoreWindow();
        if (visualCoreWindow && !visualCoreWindow.isDestroyed()) {
            visualCoreWindow.webContents.send('visual-core-remote-control', command);
        }
    });

    ipcMain.on('close-visual-core', () => {
        const visualCoreWindow = getVisualCoreWindow();
        if (visualCoreWindow) {
            visualCoreWindow.close();
        }
    });
}

module.exports = { registerVisualCoreIpc };
