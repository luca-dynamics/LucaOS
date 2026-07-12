const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('release preparation is fail-closed and emits a versioned manifest', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'prepare-sandbox-rootfs-release.cjs'), 'utf8');
    assert.match(source, /process\.exitCode = 1/);
    assert.match(source, /actual !== expected/);
    assert.match(source, /schemaVersion: 1/);
    assert.doesNotThrow(() => new vm.Script(source));
});
