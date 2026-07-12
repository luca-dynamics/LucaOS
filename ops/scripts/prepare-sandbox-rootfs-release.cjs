const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const sourceDir = path.join(root, 'platforms', 'electron', 'sandbox', 'artifacts');
const releaseDir = path.join(root, 'build', 'sandbox');
const fileName = 'lucaos-wsl-rootfs.tar';
const rootfsPath = path.join(sourceDir, fileName);
const checksumPath = `${rootfsPath}.sha256`;

function fail(message) {
    process.stderr.write(`Sandbox rootfs release preparation failed: ${message}\n`);
    process.exitCode = 1;
}

if (!fs.existsSync(rootfsPath)) {
    fail(`missing ${path.relative(root, rootfsPath)}; run npm run sandbox:build-rootfs first.`);
} else if (!fs.existsSync(checksumPath)) {
    fail(`missing ${path.relative(root, checksumPath)}.`);
} else {
    const expected = fs.readFileSync(checksumPath, 'utf8').trim().split(/\s+/)[0]?.toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expected || '')) {
        fail('checksum file does not contain a SHA-256 digest.');
    } else {
        const actual = crypto.createHash('sha256').update(fs.readFileSync(rootfsPath)).digest('hex');
        if (actual !== expected) {
            fail('rootfs digest does not match its checksum.');
        } else {
            fs.rmSync(releaseDir, { recursive: true, force: true });
            fs.mkdirSync(releaseDir, { recursive: true });
            fs.copyFileSync(rootfsPath, path.join(releaseDir, fileName));
            fs.writeFileSync(path.join(releaseDir, `${fileName}.sha256`), `${actual}  ${fileName}\n`, 'utf8');
            fs.writeFileSync(path.join(releaseDir, 'manifest.json'), `${JSON.stringify({ schemaVersion: 1, file: fileName, sha256: actual }, null, 2)}\n`, 'utf8');
            process.stdout.write(`Prepared verified sandbox rootfs at ${releaseDir}\n`);
        }
    }
}
