/* eslint-disable */
const { contextBridge, ipcRenderer } = require('electron');

function expose(apiKey, api) {
    try {
        contextBridge.exposeInMainWorld(apiKey, api);
    } catch {
        // Fallback for contextIsolation: false
        window[apiKey] = api;
    }
}

expose('luca', {
    isIntelMac: process.platform === 'darwin' && process.arch === 'x64',
    isWindows: process.platform === 'win32',
    arch: process.arch,
    platform: process.platform,
    // Proactive check: If we're on Windows but arch is not x64, or if we want to be safe
    // Note: True GPU detection is handled better by the backend, but we can set 
    // a flag to prefer cloud on specific hardware if known.
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    onActiveWindowChange: (callback) => ipcRenderer.on('active-window-change', (event, data) => callback(data)),
    readClipboard: () => ipcRenderer.invoke('clipboard-read'),
    writeClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
    // Vision Touch
    moveMouse: (x, y) => ipcRenderer.invoke('mouse-move', { x, y }),
    clickMouse: (button) => ipcRenderer.invoke('mouse-click', { button }),
    openScreenPermissions: () => ipcRenderer.invoke('open-screen-permissions'),
    triggerScreenPermission: () => ipcRenderer.invoke('trigger-screen-permission'),
    // Credential Vault
    vault: {
        store: (site, username, password) => ipcRenderer.invoke('vault-store', { site, username, password }),
        retrieve: (site) => ipcRenderer.invoke('vault-retrieve', { site }),
        list: () => ipcRenderer.invoke('vault-list'),
        delete: (site) => ipcRenderer.invoke('vault-delete', { site }),
        hasCredentials: (site) => ipcRenderer.invoke('vault-has', { site })
    },
    // System Settings
    applySystemSettings: (settings) => ipcRenderer.send('update-system-settings', settings),

    connectSocial: (appId) => ipcRenderer.invoke('connect-social', { appId }),
    getCortexUrl: () => ipcRenderer.invoke('get-cortex-url'),
    getSecureToken: () => ipcRenderer.invoke('get-secure-token')
});

expose('electron', {
    ipcRenderer: {
        send: (channel, data) => ipcRenderer.send(channel, data),
        on: (channel, func) => {
            const subscription = (event, ...args) => func(...args);
            ipcRenderer.on(channel, subscription);
            return () => ipcRenderer.removeListener(channel, subscription);
        },
        once: (channel, func) => ipcRenderer.once(channel, (event, ...args) => func(...args)),
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
    }
});
