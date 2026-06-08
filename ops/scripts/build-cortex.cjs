/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { spawnSync } = require('child_process');
const { findAvailableExecutable, getPythonCandidates } = require('../../platforms/shared/platform.cjs');

const projectRoot = path.resolve(__dirname, '../..');
const pythonDir = path.join(projectRoot, 'cortex', 'python');
const python = findAvailableExecutable(getPythonCandidates({ projectRoot }).slice(0, 2));

if (!python) {
    console.error('[BUILD] No Luca Python virtual environment was found. Run the platform setup script first.');
    process.exit(1);
}

function run(args) {
    const result = spawnSync(python, args, { cwd: pythonDir, stdio: 'inherit', windowsHide: true });
    if (result.error) {
        console.error(`[BUILD] Failed to start ${python}: ${result.error.message}`);
        process.exit(1);
    }
    if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('--- CORTEX FREEZE INITIATED ---');
console.log(`[BUILD] Using Python: ${python}`);
run(['-m', 'pip', 'install', 'pyinstaller']);
run([
    '-m', 'PyInstaller',
    '--onefile',
    '--name', 'cortex',
    '--clean',
    '--collect-all', 'lightrag',
    '--hidden-import', 'sentence_transformers',
    '--hidden-import', 'model2vec',
    '--hidden-import', 'networkx',
    'cortex.py',
]);
console.log(`[BUILD] Cortex binary created under ${path.join(pythonDir, 'dist')}.`);
