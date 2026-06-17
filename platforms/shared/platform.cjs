/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const os = require('os');
const path = require('path');

function isWSL(platform = process.platform, release = os.release(), env = process.env) {
    if (platform !== 'linux') return false;
    return Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP || /microsoft/i.test(release));
}

function getPlatformInfo(options = {}) {
    const platform = options.platform || process.platform;
    const release = options.release || os.release();
    const env = options.env || process.env;

    return {
        platform,
        isMacOS: platform === 'darwin',
        isWindows: platform === 'win32',
        isLinux: platform === 'linux',
        isWSL: isWSL(platform, release, env),
    };
}

function normalizeExecutableName(name, platform = process.platform) {
    if (platform !== 'win32' || path.extname(name)) return name;
    return `${name}.exe`;
}

function getVenvExecutable(venvDir, executable, platform = process.platform) {
    const binDir = platform === 'win32' ? 'Scripts' : 'bin';
    return path.join(venvDir, binDir, normalizeExecutableName(executable, platform));
}

function getPythonCandidates(options = {}) {
    const platform = options.platform || process.platform;
    const projectRoot = options.projectRoot || process.cwd();
    const homeDir = options.homeDir || os.homedir();
    const projectVenv = path.join(projectRoot, 'cortex', 'python', 'venv');
    const systemVenv = path.join(homeDir, '.luca', 'python', 'venv');

    return [
        getVenvExecutable(projectVenv, 'python', platform),
        getVenvExecutable(systemVenv, 'python', platform),
        platform === 'win32' ? 'python' : 'python3',
    ];
}

function findAvailableExecutable(candidates, existsSync = fs.existsSync) {
    return candidates.find((candidate) => !path.isAbsolute(candidate) || existsSync(candidate));
}

function getDefaultLocalModelPaths(options = {}) {
    const platform = options.platform || process.platform;
    const homeDir = options.homeDir || os.homedir();
    const env = options.env || process.env;

    if (platform === 'win32') {
        const localAppData = env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
        return {
            ollamaModels: path.join(homeDir, '.ollama', 'models'),
            ollamaExecutable: path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe'),
        };
    }

    return {
        ollamaModels: path.join(homeDir, '.ollama', 'models'),
        ollamaExecutable: platform === 'darwin'
            ? '/Applications/Ollama.app/Contents/Resources/ollama'
            : '/usr/local/bin/ollama',
    };
}

module.exports = {
    findAvailableExecutable,
    getDefaultLocalModelPaths,
    getPlatformInfo,
    getPythonCandidates,
    getVenvExecutable,
    isWSL,
    normalizeExecutableName,
};
