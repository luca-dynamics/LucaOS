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

// --- RUNTIME PORT PUBLICATION -------------------------------------------
// The Local Core and Cortex bind EPHEMERAL ports (see main.cjs), so the
// renderer cannot assume 3002/8000. Main pushes the real ports here as each
// backend reports in; src/config/api.ts reads this object lazily on every
// request, so calls made before a backend registered simply use the fallback
// and the next call picks up the live port. Plain data only — no callables,
// so it stays clonable across contextBridge.
// Exposed as a FUNCTION, not an object: contextBridge deep-clones values at
// expose time, so a plain object mutated later in preload would never update in
// the renderer. Functions are proxied live, so each call returns current ports.
const runtimePorts = {};
ipcRenderer.on('luca-runtime-ports', (_event, ports) => {
    Object.assign(runtimePorts, ports || {});
});

expose('luca', {
    getRuntimePorts: () => ({ ...runtimePorts }),
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
    // Renderer tells the host it has painted its first frame, so main can reveal
    // the transparent window without flashing an empty desktop-bleed frame.
    notifyReady: () => ipcRenderer.send('renderer-ready'),
    // Ask the host to size the window to the default centered layout — used for
    // the first-run onboarding so it always opens comfortably centered,
    // independent of any saved/maximized bounds from a prior session.
    centerDefault: () => ipcRenderer.send('window-center-default'),
    onActiveWindowChange: (callback) => ipcRenderer.on('active-window-change', (event, data) => callback(data)),
    readClipboard: () => ipcRenderer.invoke('clipboard-read'),
    writeClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
    // Vision Touch
    moveMouse: (x, y) => ipcRenderer.invoke('mouse-move', { x, y }),
    clickMouse: (button) => ipcRenderer.invoke('mouse-click', { button }),
    openScreenPermissions: () => ipcRenderer.invoke('open-screen-permissions'),
    triggerScreenPermission: () => ipcRenderer.invoke('trigger-screen-permission'),
    nativeGguf: {
        list: () => ipcRenderer.invoke('native-gguf:list'),
        register: (input) => ipcRenderer.invoke('native-gguf:register', input),
        remove: (id) => ipcRenderer.invoke('native-gguf:remove', id),
        health: () => ipcRenderer.invoke('native-gguf:health'),
        chat: (request) => ipcRenderer.invoke('native-gguf:chat', request),
        streamStart: (requestId, request, callback) => {
            const listener = (_event, payload) => {
                if (payload?.requestId !== requestId) return;
                callback(payload);
                if (payload.type === 'done' || payload.type === 'error') {
                    ipcRenderer.removeListener('native-gguf:stream-event', listener);
                }
            };
            ipcRenderer.on('native-gguf:stream-event', listener);
            return ipcRenderer.invoke('native-gguf:stream-start', { requestId, request }).catch(error => {
                ipcRenderer.removeListener('native-gguf:stream-event', listener);
                throw error;
            });
        },
        streamCancel: (requestId) => ipcRenderer.invoke('native-gguf:stream-cancel', requestId),
        unload: () => ipcRenderer.invoke('native-gguf:unload'),
        apiStart: (port) => ipcRenderer.invoke('native-gguf:api-start', port),
        apiStop: () => ipcRenderer.invoke('native-gguf:api-stop'),
        apiStatus: () => ipcRenderer.invoke('native-gguf:api-status')
    },
    localDocs: {
        list: () => ipcRenderer.invoke('local-docs:list'),
        register: (input) => ipcRenderer.invoke('local-docs:register', input),
        rescan: (id) => ipcRenderer.invoke('local-docs:rescan', id),
        remove: (id) => ipcRenderer.invoke('local-docs:remove', id),
        embed: (id, modelId) => ipcRenderer.invoke('local-docs:embed', { id, modelId }),
        search: (request) => ipcRenderer.invoke('local-docs:search', request),
        watchStart: (id) => ipcRenderer.invoke('local-docs:watch-start', id),
        watchStop: (id) => ipcRenderer.invoke('local-docs:watch-stop', id)
    },
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
    getSecureToken: () => ipcRenderer.invoke('get-secure-token'),
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => {
        ipcRenderer.on(channel, func);
        return () => ipcRenderer.removeListener(channel, func);
    },
    // Mission Control Bridge
    missionControl: {
        start: (title, metadata) => ipcRenderer.invoke('mission-start', title, metadata),
        addGoal: (missionId, description, dependencyId) => ipcRenderer.invoke('mission-add-goal', missionId, description, dependencyId),
        updateGoal: (goalId, status) => ipcRenderer.invoke('mission-update-goal', goalId, status),
        getContext: () => ipcRenderer.invoke('mission-get-context'),
        getActive: () => ipcRenderer.invoke('mission-get-active'),
        archive: (missionId) => ipcRenderer.invoke('mission-archive', missionId)
    },
    sandbox: {
        probe: () => ipcRenderer.invoke('sandbox:probe'),
        create: (request) => ipcRenderer.invoke('sandbox:create', request),
        list: () => ipcRenderer.invoke('sandbox:list'),
        listSnapshots: (sessionId) => ipcRenderer.invoke('sandbox:listSnapshots', sessionId),
        snapshot: (sessionId) => ipcRenderer.invoke('sandbox:snapshot', sessionId),
        cleanupExpired: () => ipcRenderer.invoke('sandbox:cleanupExpired'),
        execute: (sessionId, command) => ipcRenderer.invoke('sandbox:execute', sessionId, command),
        exportArtifact: (sessionId, request) => ipcRenderer.invoke('sandbox:exportArtifact', sessionId, request),
        importArtifact: (sessionId, artifact) => ipcRenderer.invoke('sandbox:importArtifact', sessionId, artifact),
        destroy: (sessionId) => ipcRenderer.invoke('sandbox:destroy', sessionId)
    }
});

expose('electron', {
    ipcRenderer: {
        send: (channel, data) => ipcRenderer.send(channel, data),
        on: (channel, func) => {
            ipcRenderer.on(channel, func);
            return () => ipcRenderer.removeListener(channel, func);
        },
        once: (channel, func) => ipcRenderer.once(channel, func),
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        removeListener: (channel, func) => ipcRenderer.removeListener(channel, func),
        off: (channel, func) => ipcRenderer.off(channel, func)
    }
});
