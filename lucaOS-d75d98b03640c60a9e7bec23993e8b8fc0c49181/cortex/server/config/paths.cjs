/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const os = require('os');

const USER_HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();

// System-level files (database, security, config)
const LUCA_SYSTEM_DIR = path.join(USER_HOME, '.luca');

// User-level files (exports, skills, macros, forge)
const LUCA_USER_DIR = path.join(USER_HOME, 'Documents', 'Luca');

const IS_WINDOWS = process.platform === 'win32';
const VENV_BIN_DIR = IS_WINDOWS ? 'Scripts' : 'bin';
const PYTHON_EXE = IS_WINDOWS ? 'python.exe' : 'python';

module.exports = {
    USER_HOME,
    LUCA_SYSTEM_DIR,
    LUCA_USER_DIR,
    DATA_DIR: path.join(LUCA_SYSTEM_DIR, 'data'),
    CAPABILITIES_DIR: path.join(LUCA_SYSTEM_DIR, 'capabilities'),
    SCRIPTS_DIR: path.join(LUCA_SYSTEM_DIR, 'scripts'),
    DRIVERS_DIR: path.join(LUCA_SYSTEM_DIR, 'drivers'),
    CHROME_PROFILES_DIR: path.join(LUCA_USER_DIR, 'browser-profiles'),
    ELECTRON_DATA_DIR: path.join(LUCA_SYSTEM_DIR, 'electron-user-data'),
    SECURITY_DIR: path.join(LUCA_SYSTEM_DIR, 'security'),
    CERTS_DIR: path.join(LUCA_SYSTEM_DIR, 'security', 'certs'),
    // PROJECT LOCAL VENV (Preferred for Dev)
    VENV_DIR: path.join(__dirname, '../../python/venv'),
    PYTHON_BIN: path.join(__dirname, '../../python/venv', VENV_BIN_DIR, PYTHON_EXE),
    // SYSTEM VENV (Fallback/Production)
    SYSTEM_VENV_DIR: path.join(LUCA_SYSTEM_DIR, 'python', 'venv'),
    SYSTEM_PYTHON_BIN: path.join(LUCA_SYSTEM_DIR, 'python', 'venv', VENV_BIN_DIR, PYTHON_EXE)
};
