/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const mainSource = readFileSync(join(__dirname, '..', 'main.cjs'), 'utf8');
const widgetModeSource = readFileSync(join(__dirname, '..', '..', '..', 'src', 'components', 'WidgetMode.tsx'), 'utf8');
const useDictationSource = readFileSync(join(__dirname, '..', '..', '..', 'src', 'hooks', 'useDictation.ts'), 'utf8');

for (const label of [
    'Open LucaOS',
    'Talk to Luca',
    'See Screen',
    'Luca Hologram Face',
    'Luca Mini Chat',
    'Dictation Widget',
    'Sensor Privacy'
]) {
    assert.ok(mainSource.includes(`label: '${label}'`) || mainSource.includes(`label: \`${label}`), `missing tray label: ${label}`);
}

for (const legacyLabel of [
    "label: 'Switch Mind (Persona)'",
    "label: 'Switch Skin (Theme)'",
    "label: 'LIVE SENTRY MODE'",
    "label: 'God Mode (Autonomy)'",
    "label: 'Sense (Wake Word)'",
    "label: 'Start Dictation (Ctrl+D)'",
    "label: 'Luca Smart Screen'",
    "label: 'Luca Dashboard'"
]) {
    assert.ok(!mainSource.includes(legacyLabel), `legacy tray label remained: ${legacyLabel}`);
}

for (const legacyChannel of [
    'switch-theme',
    'sync-persona-tray',
    'toggle-sentry-audio',
    'toggle-sentry-visual',
    'toggle-wake-word'
]) {
    assert.ok(!mainSource.includes(legacyChannel), `legacy tray channel remained: ${legacyChannel}`);
}

assert.ok(
    mainSource.includes("{ label: 'Dictation Widget', click: () => toggleDictation() }"),
    'tray Dictation Widget should launch the dictation path'
);
assert.ok(
    !mainSource.includes("{ label: 'Dictation Widget', click: () => toggleWidgetWindow() }"),
    'tray Dictation Widget should not only show the widget shell'
);
assert.ok(
    useDictationSource.includes('sendDictationMode(newState)'),
    'direct widget clicks should notify the main voice runtime'
);
assert.ok(
    widgetModeSource.includes('setDictationState(true, true)') &&
        widgetModeSource.includes('setDictationState(false, true)') &&
        widgetModeSource.includes('setDictationState(!isDictating, true)'),
    'shortcut-triggered widget dictation should notify the main voice runtime'
);
