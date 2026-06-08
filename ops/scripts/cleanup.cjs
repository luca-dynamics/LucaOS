/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require('child_process');
const { getPlatformInfo } = require('../../platforms/shared/platform.cjs');

const ports = [3001, 3002];
const platform = getPlatformInfo();

console.log('[LUCA] Cleaning up development ports...');

if (platform.isWindows) {
    const portList = ports.join(',');
    const command = `Get-NetTCPConnection -LocalPort ${portList} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`;
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'inherit', windowsHide: true });
    if (result.error) {
        console.error(`[LUCA] PowerShell cleanup failed: ${result.error.message}`);
        process.exitCode = 1;
    } else if (result.status !== 0) {
        process.exitCode = result.status;
    }
} else {
    for (const port of ports) {
        const lookup = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });
        if (lookup.error?.code === 'ENOENT') {
            console.error('[LUCA] lsof is required for cleanup on macOS/Linux.');
            process.exitCode = 1;
            break;
        }
        const pids = (lookup.stdout || '').trim().split(/\s+/).filter(Boolean);
        for (const pid of pids) {
            try {
                process.kill(Number(pid), 'SIGKILL');
                console.log(`[LUCA] Killed PID ${pid} on port ${port}.`);
            } catch (error) {
                console.warn(`[LUCA] Could not kill PID ${pid}: ${error.message}`);
            }
        }
    }
}

console.log('[LUCA] Cleanup complete.');
