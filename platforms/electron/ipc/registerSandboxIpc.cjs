function registerSandboxIpc({ ipcMain, broker }) {
    ipcMain.handle('sandbox:probe', () => broker.probe());
    ipcMain.handle('sandbox:create', (_event, request) => broker.create(request));
    ipcMain.handle('sandbox:list', () => broker.list());
    ipcMain.handle('sandbox:execute', (_event, sessionId, command) => broker.execute(sessionId, command));
    ipcMain.handle('sandbox:exportArtifact', (_event, sessionId, request) => broker.exportArtifact(sessionId, request));
    ipcMain.handle('sandbox:importArtifact', (_event, sessionId, artifact) => broker.importArtifact(sessionId, artifact));
    ipcMain.handle('sandbox:destroy', (_event, sessionId) => broker.destroy(sessionId));
}

module.exports = { registerSandboxIpc };
