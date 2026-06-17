/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { spawn } = require('child_process');
const { findAvailableExecutable, getPythonCandidates } = require('../../platforms/shared/platform.cjs');

const projectRoot = path.resolve(__dirname, '../..');
const cortexEntry = path.join(projectRoot, 'cortex', 'python', 'cortex.py');
const python = findAvailableExecutable(getPythonCandidates({ projectRoot }));

const child = spawn(python, [cortexEntry], {
    cwd: path.dirname(cortexEntry),
    env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONPATH: path.dirname(cortexEntry) },
    stdio: 'inherit',
    windowsHide: true,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => child.kill(signal));
}

child.on('error', (error) => {
    console.error(`[CORTEX] Failed to start ${python}: ${error.message}`);
    process.exitCode = 1;
});
child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
});
