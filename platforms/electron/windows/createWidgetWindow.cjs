/* eslint-disable @typescript-eslint/no-require-imports */
function createWidgetWindow({
    BrowserWindow,
    screen,
    isDev,
    devPort,
    distPath,
    preloadPath,
    logger = console,
    onClosed
}) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const widgetWindow = new BrowserWindow({
        width: 200, // Reduced from 250
        height: 300, // Reduced from 400
        x: width - 220, // Adjusted padding from right
        y: height - 350, // Adjusted padding from bottomRight positioning
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        show: false, // Start Hidden (Use Tray to toggle)
        hasShadow: false,
        focusable: false, // CRITICAL: Prevent stealing focus from Notepad/Other Active Apps
        backgroundColor: '#00000000', // HEX transparent for Mac
        webPreferences: {
            preload: preloadPath, // Reuse preload
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            backgroundThrottling: false // CRITICAL: Ensure Voice runs even if window is technically "background" or unfocused
        }
    });

    logger.log('[WIDGET] BrowserWindow created');

    // Load same app but with ?mode=widget param
    const url = isDev
        ? `http://127.0.0.1:${devPort}?mode=widget`
        : `file://${distPath}?mode=widget`;

    logger.log('[WIDGET] Loading URL:', url);
    widgetWindow.loadURL(url);

    // FORCE OVERLAY ON TOP OF FULLSCREEN APPS
    widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    widgetWindow.setAlwaysOnTop(true, "floating", 1);
    widgetWindow.setFullScreenable(false);

    widgetWindow.once('ready-to-show', () => {
        logger.log('[WIDGET] Window ready to show');
    });

    widgetWindow.on('closed', () => {
        logger.log('[WIDGET] Window closed');
        onClosed();
    });

    // Forward console logs to terminal
    widgetWindow.webContents.on('console-message', (event, level, message) => {
        logger.log('[WIDGET]', message);
    });

    // Log any errors
    widgetWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        logger.error('[WIDGET] Failed to load:', errorCode, errorDescription);
    });

    return widgetWindow;
}

module.exports = { createWidgetWindow };
