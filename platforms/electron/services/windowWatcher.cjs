/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const activeWin = require('active-win');

let intervalId = null;
let lastWindow = null;

function startWatching(mainWindow) {
    if (intervalId) return;

    console.log('[WINDOW_WATCHER] Started monitoring active window.');
    
    let isWatching = true;

    async function watch() {
        if (!isWatching) return;
        
        try {
            const windowInfo = await activeWin();
            if (windowInfo) {
                const currentSignature = `${windowInfo.owner.name}:${windowInfo.title}`;
                if (lastWindow !== currentSignature) {
                    lastWindow = currentSignature;
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('active-window-change', {
                            title: windowInfo.title,
                            app: windowInfo.owner.name,
                            url: windowInfo.url || null,
                            timestamp: Date.now()
                        });
                    }
                }
            }
        } catch {
            // Suppress errors (e.g. permissions denied)
        }
        
        // Wait 2 seconds AFTER the previous scan finished
        intervalId = setTimeout(watch, 2000);
    }

    watch();
    
    // Override stopWatching to set isWatching = false
    module.exports.stopWatching = () => {
        isWatching = false;
        if (intervalId) {
            clearTimeout(intervalId);
            intervalId = null;
        }
        console.log('[WINDOW_WATCHER] Stopped monitoring.');
    };
}

function stopWatching() {
    // This is a placeholder that will be overridden by startWatching
    if (intervalId) {
        clearTimeout(intervalId);
        intervalId = null;
        console.log('[WINDOW_WATCHER] Stopped monitoring.');
    }
}

module.exports = { startWatching, stopWatching };
