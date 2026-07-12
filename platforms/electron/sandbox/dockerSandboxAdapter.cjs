const { execFile: nodeExecFile } = require('child_process');
const { promisify } = require('util');

const DEFAULT_IMAGE = 'node:22-bookworm-slim';
const SAFE_IMAGES = new Set([DEFAULT_IMAGE]);

function createDockerSandboxAdapter({ execFile = promisify(nodeExecFile), image = DEFAULT_IMAGE } = {}) {
    if (!SAFE_IMAGES.has(image)) throw new Error('Docker sandbox image is not allowlisted.');
    const docker = (args, options = {}) => execFile('docker', args, {
        windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024, ...options
    });

    return {
        kind: 'docker',
        async probe() {
            try {
                await docker(['info', '--format', '{{.ServerVersion}}']);
                return { backend: 'docker', available: true, isolated: true, reason: 'Docker daemon is available.', capabilities: ['terminal', 'workspace_read', 'workspace_write', 'network'] };
            } catch (error) {
                return { backend: 'docker', available: false, isolated: false, reason: error?.code === 'ENOENT' ? 'Docker is not installed.' : 'Docker daemon is unavailable.', capabilities: [] };
            }
        },
        async create({ sessionId, workspacePath, networkEnabled = false }) {
            const name = `luca-sandbox-${sessionId}`;
            const args = [
                'run', '--detach', '--name', name,
                '--label', 'lucaos.sandbox=true', '--label', `lucaos.session=${sessionId}`,
                '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--read-only',
                '--pids-limit', '128', '--memory', '1g', '--cpus', '1.0',
                '--tmpfs', '/tmp:rw,noexec,nosuid,size=256m',
                '--network', networkEnabled ? 'bridge' : 'none',
                '--mount', `type=bind,src=${workspacePath},dst=/workspace`, '--workdir', '/workspace',
                image, 'sleep', 'infinity'
            ];
            const result = await docker(args, { timeout: 30_000 });
            return { backend: 'docker', containerId: String(result.stdout || '').trim(), name, networkEnabled };
        },
        async execute({ name }, { executable, args, timeoutMs }) {
            const result = await docker(
                ['exec', '--workdir', '/workspace', name, executable, ...args],
                { timeout: timeoutMs }
            );
            return { stdout: String(result.stdout || ''), stderr: String(result.stderr || ''), exitCode: 0 };
        },
        async destroy({ name }) {
            await docker(['rm', '--force', name], { timeout: 30_000 });
        }
    };
}

module.exports = { createDockerSandboxAdapter, DEFAULT_IMAGE };
