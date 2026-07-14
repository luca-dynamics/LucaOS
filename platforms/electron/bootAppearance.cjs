const fs = require('fs');
const path = require('path');

const BOOT_APPEARANCE_FILENAME = 'luca-boot-appearance.json';
const ALLOWED_SKIN_IDS = new Set([
    'pearl', 'carbon', 'flow', 'canvas', 'graphite', 'onyx', 'dusk', 'mist'
]);
const ALLOWED_VARIABLE_NAMES = [
    '--luca-background-base',
    '--luca-background-elevated',
    '--luca-background-liquid',
    '--luca-surface-glass',
    '--luca-surface-solid',
    '--luca-surface-hover',
    '--luca-text-primary',
    '--luca-text-secondary',
    '--luca-text-tertiary',
    '--luca-accent-primary',
    '--luca-accent-soft',
    '--luca-material-opacity',
    '--luca-material-blur',
    '--luca-material-glass-highlight',
    '--luca-material-glass-rim',
    '--luca-material-glass-shadow',
    '--luca-material-glass-sheen',
    '--luca-material-border-strength',
    '--luca-material-shadow',
    '--luca-shadow-soft',
    '--luca-shadow-glow'
];

function isSafeCssValue(value) {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= 1024
        && !/[\u0000-\u001f{};<>]/.test(value)
        && !/(?:url|expression|javascript|@import)\s*\(/i.test(value);
}

function sanitizeBootAppearanceSnapshot(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        return null;
    }

    const sourceVariables = candidate.variables;
    if (!sourceVariables || typeof sourceVariables !== 'object' || Array.isArray(sourceVariables)) {
        return null;
    }

    const variables = {};
    for (const name of ALLOWED_VARIABLE_NAMES) {
        const value = sourceVariables[name];
        if (!isSafeCssValue(value)) return null;
        variables[name] = value;
    }

    return {
        schemaVersion: 1,
        skinId: ALLOWED_SKIN_IDS.has(candidate.skinId) ? candidate.skinId : 'carbon',
        materialTone: candidate.materialTone === 'light' ? 'light' : 'dark',
        variables
    };
}

function getBootAppearancePath(userDataPath) {
    return path.join(userDataPath, BOOT_APPEARANCE_FILENAME);
}

function readBootAppearanceSnapshot(userDataPath) {
    try {
        const contents = fs.readFileSync(getBootAppearancePath(userDataPath), 'utf8');
        return sanitizeBootAppearanceSnapshot(JSON.parse(contents));
    } catch {
        return null;
    }
}

function writeBootAppearanceSnapshot(userDataPath, candidate) {
    const snapshot = sanitizeBootAppearanceSnapshot(candidate);
    if (!snapshot) return null;

    try {
        fs.mkdirSync(userDataPath, { recursive: true });
        fs.writeFileSync(
            getBootAppearancePath(userDataPath),
            `${JSON.stringify(snapshot)}\n`,
            { encoding: 'utf8', mode: 0o600 }
        );
        return snapshot;
    } catch {
        return null;
    }
}

function getBootWindowBackground(snapshot) {
    const candidate = snapshot?.variables?.['--luca-background-base'];
    return typeof candidate === 'string' && /^#[0-9a-f]{6}$/i.test(candidate)
        ? candidate
        : '#111417';
}

module.exports = {
    ALLOWED_VARIABLE_NAMES,
    getBootAppearancePath,
    getBootWindowBackground,
    readBootAppearanceSnapshot,
    sanitizeBootAppearanceSnapshot,
    writeBootAppearanceSnapshot
};
