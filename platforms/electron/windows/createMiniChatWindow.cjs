/* eslint-disable @typescript-eslint/no-require-imports */
function createMiniChatWindow({
    BrowserWindow,
    screen,
    isDev,
    devPort,
    distPath,
    preloadPath,
    onClosed
}) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const w = 600;
    const h = 180; // Reduced height for Mini Chat feel

    const chatWindow = new BrowserWindow({
        width: w,
        height: h,
        x: Math.floor(width / 2 - w / 2),
        y: Math.floor(height / 3), // Slightly higher than center
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true, // User requested resizability
        minWidth: 200,
        minHeight: 40,
        show: false,
        hasShadow: false,
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            backgroundThrottling: false
        }
    });

    const url = isDev
        ? `http://127.0.0.1:${devPort}?mode=chat`
        : `file://${distPath}?mode=chat`;

    chatWindow.loadURL(url);
    chatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    chatWindow.on('closed', onClosed);

    // Close on blur (Spotlight style)
    chatWindow.on('blur', () => {
        // chatWindow.hide(); // Optional: user might want to keep it open
    });

    return chatWindow;
}

module.exports = { createMiniChatWindow };
