const { spawn: nodeSpawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function createWindowsSandboxAdapter({
    fsApi = fs,
    spawn = nodeSpawn,
    platform = process.platform,
    systemRoot = process.env.SystemRoot || 'C:\\Windows',
    configRoot = path.join(os.tmpdir(), 'luca-windows-sandbox')
} = {}) {
    const executablePath = path.join(systemRoot, 'System32', 'WindowsSandbox.exe');

    return {
        kind: 'windows_sandbox',
        async probe() {
            if (platform !== 'win32') {
                return { backend: 'windows_sandbox', available: false, isolated: false, reason: 'Windows Sandbox is only available on Windows.', capabilities: [] };
            }
            if (!fsApi.existsSync(executablePath)) {
                return { backend: 'windows_sandbox', available: false, isolated: false, reason: 'Windows Sandbox executable is unavailable.', capabilities: [] };
            }
            return {
                backend: 'windows_sandbox',
                available: true,
                isolated: true,
                reason: 'Windows Sandbox executable is available.',
                capabilities: ['workspace_read', 'workspace_write']
            };
        },
        async create({ sessionId, workspacePath }) {
            if (!/^[a-f0-9-]{36}$/.test(sessionId)) throw new Error('Invalid Windows Sandbox session id.');
            if (!workspacePath || !path.isAbsolute(workspacePath)) throw new Error('Windows Sandbox workspace path must be absolute.');
            fsApi.mkdirSync(configRoot, { recursive: true });
            fsApi.mkdirSync(workspacePath, { recursive: true });
            const configPath = path.join(configRoot, `${sessionId}.wsb`);
            const config = [
                '<Configuration>',
                '  <VGpu>Disable</VGpu>',
                '  <Networking>Disable</Networking>',
                '  <MappedFolders>',
                '    <MappedFolder>',
                `      <HostFolder>${escapeXml(workspacePath)}</HostFolder>`,
                '      <SandboxFolder>C:\\Users\\WDAGUtilityAccount\\Desktop\\workspace</SandboxFolder>',
                '      <ReadOnly>false</ReadOnly>',
                '    </MappedFolder>',
                '  </MappedFolders>',
                '</Configuration>',
                ''
            ].join('\n');
            fsApi.writeFileSync(configPath, config, { flag: 'wx' });
            const child = spawn(executablePath, [configPath], { windowsHide: true, detached: true, stdio: 'ignore' });
            child.unref?.();
            return { backend: 'windows_sandbox', configPath, processId: child.pid || null, workspacePath };
        },
        async destroy(runtime) {
            if (runtime?.processId) {
                try { process.kill(runtime.processId); } catch { /* best-effort sandbox close */ }
            }
            if (runtime?.configPath) fsApi.rmSync(runtime.configPath, { force: true });
        }
    };
}

module.exports = { createWindowsSandboxAdapter };
