/* eslint-disable @typescript-eslint/no-require-imports */
function resolveVisualCoreLoadUrl({ isDev, devPort, distPath }) {
    return isDev
        ? `http://localhost:${devPort}?mode=visual_core`
        : `file://${distPath}?mode=visual_core`;
}

function createVisualCoreWindow({
    BrowserWindow,
    screen,
    isDev,
    devPort,
    distPath,
    preloadPath,
    initialData = null,
    loadWindowStateVC,
    saveWindowStateVC,
    setVisualCorePendingData,
    setVisualCoreReady,
    logger = console,
    onClosed
}) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;

    // Load saved bounds or use default
    const savedBounds = loadWindowStateVC();
    const w = savedBounds?.width || 960;
    const h = savedBounds?.height || 540;
    const padding = 20;
    const defaultX = width - w - padding;
    const defaultY = padding;

    const visualCoreWindow = new BrowserWindow({
        width: w,
        height: h,
        x: savedBounds?.x ?? defaultX,
        y: savedBounds?.y ?? defaultY,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true, // WIDGET BEHAVIOR
        skipTaskbar: true, // WIDGET BEHAVIOR
        resizable: true,   // User can resize if they want it bigger
        minWidth: 320,
        minHeight: 180,
        show: false,
        hasShadow: true,
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            webviewTag: true // Vital for Browser-in-Screen
        }
    });

    // Save bounds on change
    const updateVCBounds = () => {
        if (visualCoreWindow && !visualCoreWindow.isMinimized()) {
            saveWindowStateVC(visualCoreWindow.getBounds());
        }
    };
    visualCoreWindow.on('resize', updateVCBounds);
    visualCoreWindow.on('move', updateVCBounds);

    // Ensure it floats above full-screen apps (like a true OS widget)
    visualCoreWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Load app with ?mode=visual_core
    const url = resolveVisualCoreLoadUrl({ isDev, devPort, distPath });

    visualCoreWindow.loadURL(url);

    visualCoreWindow.once('ready-to-show', () => {
        logger.log('[MAIN PROCESS] Smart Screen window ready-to-show');
        visualCoreWindow.show();
        visualCoreWindow.focus();

        // Queue the initial data - it will be sent when Smart Screen signals ready
        if (initialData) {
            logger.log('[MAIN PROCESS] Queuing initialData for when Smart Screen is ready:', initialData);
            setVisualCorePendingData(initialData);
        }
    });

    visualCoreWindow.on('closed', () => {
        setVisualCoreReady(false); // Reset ready state
        setVisualCorePendingData(null);
        onClosed();
    });

    return visualCoreWindow;
}

module.exports = { createVisualCoreWindow, resolveVisualCoreLoadUrl };
