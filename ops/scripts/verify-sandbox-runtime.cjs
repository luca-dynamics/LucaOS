const { spawnSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const tests = [
  'sandboxAdapterRouter.test.cjs', 'sandboxBroker.test.cjs', 'dockerSandboxAdapter.test.cjs',
  'podmanSandboxAdapter.test.cjs', 'wsl2SandboxAdapter.test.cjs', 'windowsSandboxAdapter.test.cjs',
  'firecrackerSandboxAdapter.test.cjs', 'appleVirtualizationSandboxAdapter.test.cjs',
  'hypervSandboxAdapter.test.cjs', 'sandboxBrowserController.test.cjs'
].map((name) => path.join(root, 'platforms', 'electron', 'sandbox', '__tests__', name));
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
