const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const context = path.join(root, 'platforms', 'electron', 'sandbox', 'rootfs');
const outputDir = path.join(root, 'platforms', 'electron', 'sandbox', 'artifacts');
const output = path.join(outputDir, 'lucaos-wsl-rootfs.tar');
const image = 'lucaos/sandbox-rootfs:local';
const container = 'lucaos-sandbox-rootfs-export';

fs.mkdirSync(outputDir, { recursive: true });
execFileSync('docker', ['build', '--pull', '--tag', image, context], { stdio: 'inherit', windowsHide: true });
try { execFileSync('docker', ['rm', '--force', container], { stdio: 'ignore', windowsHide: true }); } catch {}
execFileSync('docker', ['create', '--name', container, image], { stdio: 'inherit', windowsHide: true });
try {
    execFileSync('docker', ['export', '--output', output, container], { stdio: 'inherit', windowsHide: true });
} finally {
    try { execFileSync('docker', ['rm', '--force', container], { stdio: 'ignore', windowsHide: true }); } catch {}
}
const digest = crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
fs.writeFileSync(`${output}.sha256`, `${digest}  lucaos-wsl-rootfs.tar\n`, 'utf8');
process.stdout.write(`Built ${output}\nSHA256 ${digest}\n`);
