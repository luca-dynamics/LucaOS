/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { spawnSync } = require('child_process');
const { getPlatformInfo } = require('../../platforms/shared/platform.cjs');

const androidDir = path.resolve(__dirname, '../../android');
const isWindows = getPlatformInfo().isWindows;
const gradle = isWindows ? 'cmd.exe' : './gradlew';
const args = isWindows ? ['/d', '/s', '/c', 'gradlew.bat', 'assembleRelease'] : ['assembleRelease'];
const result = spawnSync(gradle, args, {
    cwd: androidDir,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
});

if (result.error) {
    console.error(`[ANDROID] Failed to start ${gradle}: ${result.error.message}`);
    process.exit(1);
}
process.exit(result.status ?? 1);
