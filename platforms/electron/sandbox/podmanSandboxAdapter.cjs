const { execFile: nodeExecFile } = require('child_process');
const { promisify } = require('util');

const DEFAULT_IMAGE = 'docker.io/library/node:22-bookworm-slim';
const SAFE_IMAGES = new Set([DEFAULT_IMAGE]);

function createPodmanSandboxAdapter({ execFile = promisify(nodeExecFile), image = DEFAULT_IMAGE } = {}) {
    if (!SAFE_IMAGES.has(image)) throw new Error('Podman sandbox image is not allowlisted.');
    const podman = (args, options = {}) => execFile('podman', args, {
        windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024, ...options
    });

    return {
        kind: 'podman',
        async probe() {
            try {
                const result = await podman(['info', '--format', '{{.Host.Security.Rootless}}']);
                const rootless = String(result.stdout || '').trim() === 'true';
                return rootless
                    ? { backend: 'podman', available: true, isolated: true, reason: 'Rootless Podman is available.', capabilities: ['terminal', 'workspace_read', 'workspace_write', 'network'] }
                    : { backend: 'podman', available: false, isolated: false, reason: 'Podman is available but not rootless.', capabilities: [] };
            } catch (error) {
                return { backend: 'podman', available: false, isolated: false, reason: error?.code === 'ENOENT' ? 'Podman is not installed.' : 'Podman is unavailable.', capabilities: [] };
            }
        },
        async create({ sessionId, workspacePath, networkEnabled = false }) {
            const name = `luca-sandbox-${sessionId}`;
            const args = [
                'run', '--detach', '--name', name,
                '--label', 'lucaos.sandbox=true', '--label', `lucaos.session=${sessionId}`,
                '--cap-drop', 'all', '--security-opt', 'no-new-privileges', '--read-only',
                '--pids-limit', '128', '--memory', '1g', '--cpus', '1.0',
                '--tmpfs', '/tmp:rw,noexec,nosuid,size=256m',
                '--network', networkEnabled ? 'slirp4netns' : 'none',
                '--mount', `type=bind,src=${workspacePath},dst=/workspace`, '--workdir', '/workspace',
                image, 'sleep', 'infinity'
            ];
            const result = await podman(args, { timeout: 30_000 });
            return { backend: 'podman', containerId: String(result.stdout || '').trim(), name, networkEnabled };
        },
        async execute({ name }, { executable, args, timeoutMs }) {
            const result = await podman(
                ['exec', '--workdir', '/workspace', name, executable, ...args],
                { timeout: timeoutMs }
            );
            return { stdout: String(result.stdout || ''), stderr: String(result.stderr || ''), exitCode: 0 };
        },
        async destroy({ name }) {
            await podman(['rm', '--force', name], { timeout: 30_000 });
        }
    };
}

module.exports = { createPodmanSandboxAdapter, DEFAULT_IMAGE };
