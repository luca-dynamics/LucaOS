/* eslint-disable @typescript-eslint/no-require-imports */
function createHologramWindow({
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
    // Freeform size (large enough for the w-80 h-80 container)
    // Position bottom-right, but account for potential dock
    // ample space

    const hologramWindow = new BrowserWindow({
        width: 300,
        height: 400,
        x: width - 300,
        y: height - 410,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        show: false,
        hasShadow: false,
        focusable: false,
        backgroundColor: '#00000000', // Transparent Hex
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        }
    });

    const url = isDev
        ? `http://localhost:${devPort}?mode=hologram`
        : `file://${distPath}?mode=hologram`;

    hologramWindow.loadURL(url);

    // Ensure visibility overlay
    hologramWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    hologramWindow.setAlwaysOnTop(true, "floating", 1);

    // Click-through behavior?
    // If the user wants to click the "Mic", we need it to be interactive.
    // If we setIgnoreMouseEvents(true), we can't click.
    // So we keep it interactive. But the transparent parts might block clicks unless we handle ignoreMouseEvents in renderer.
    // For now, let's keep it simple (fully interactive rectangular window).

    hologramWindow.on('closed', onClosed);

    return hologramWindow;
}

module.exports = { createHologramWindow };
