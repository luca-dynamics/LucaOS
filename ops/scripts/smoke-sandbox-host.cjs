const os = require('os');
const path = require('path');
const fs = require('fs');
const { createWsl2SandboxAdapter } = require('../../platforms/electron/sandbox/wsl2SandboxAdapter.cjs');
const { createSandboxBroker } = require('../../platforms/electron/sandbox/sandboxBroker.cjs');

async function main() {
    const reportPath = path.resolve('tmp', 'sandbox-smoke-report.json');
    const adapter = createWsl2SandboxAdapter({
        rootfsPath: path.resolve('platforms/electron/sandbox/artifacts/lucaos-wsl-rootfs.tar'),
        checksumPath: path.resolve('platforms/electron/sandbox/artifacts/lucaos-wsl-rootfs.tar.sha256'),
        installRoot: path.join(os.tmpdir(), 'lucaos-live-sandbox-distros')
    });
    const broker = createSandboxBroker({
        adapter,
        workspaceRoot: path.join(os.tmpdir(), 'lucaos-live-sandbox-workspaces')
    });
    const report = { probe: await broker.probe(), created: null, execution: null, destroyed: null };
    process.stdout.write(`PROBE ${JSON.stringify(report.probe)}\n`);
    let session;
    try {
        session = await broker.create({
            missionId: 'sandbox-smoke-test',
            capabilities: ['terminal', 'workspace_read', 'workspace_write']
        });
        report.created = {
            sessionId: session.sessionId,
            backend: session.backend,
            hostFallbackAllowed: session.hostFallbackAllowed,
            networkIsolation: session.runtime.networkIsolation
        };
        process.stdout.write(`CREATED ${JSON.stringify(report.created)}\n`);
        report.execution = await broker.execute(session.sessionId, {
            executable: 'node', args: ['--version'], timeoutMs: 30_000
        });
        process.stdout.write(`EXECUTED ${JSON.stringify(report.execution)}\n`);
    } finally {
        if (session) {
            report.destroyed = await broker.destroy(session.sessionId);
            process.stdout.write(`DESTROYED ${JSON.stringify(report.destroyed)}\n`);
        }
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    if (report.execution?.failed || !report.destroyed?.destroyed) process.exitCode = 1;
}

main().catch((error) => {
    const reportPath = path.resolve('tmp', 'sandbox-smoke-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify({ failed: true, error: error.stack || error.message || String(error) }, null, 2)}\n`, 'utf8');
    process.stderr.write(`${error.stack || error.message || error}\n`);
    process.exitCode = 1;
});
