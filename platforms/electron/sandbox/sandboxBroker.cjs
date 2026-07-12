const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALLOWED_CAPABILITIES = new Set(['terminal', 'workspace_read', 'workspace_write', 'network']);
const MAX_ARGUMENTS = 128;
const MAX_ARGUMENT_LENGTH = 8192;
const MAX_TIMEOUT_MS = 120_000;
const MAX_ARTIFACT_BYTES = 128 * 1024 * 1024;

function createSandboxBroker({ adapter, workspaceRoot, fsApi = fs }) {
    if (!adapter) throw new Error('Sandbox adapter is required.');
    if (!path.isAbsolute(workspaceRoot)) throw new Error('Sandbox workspace root must be absolute.');
    const sessions = new Map();

    function normalizeRequest(request = {}) {
        const missionId = typeof request.missionId === 'string' ? request.missionId.trim() : '';
        if (!/^[a-zA-Z0-9._-]{1,100}$/.test(missionId)) throw new Error('Invalid sandbox mission id.');
        const capabilities = [...new Set(Array.isArray(request.capabilities) ? request.capabilities : [])];
        if (!capabilities.length || capabilities.some((item) => !ALLOWED_CAPABILITIES.has(item))) throw new Error('Sandbox capabilities are missing or unsupported.');
        return { missionId, capabilities };
    }

    function normalizeCommand(command = {}) {
        const executable = typeof command.executable === 'string' ? command.executable.trim() : '';
        if (!/^[a-zA-Z0-9_./+-]{1,200}$/.test(executable)) throw new Error('Invalid sandbox executable.');
        const args = Array.isArray(command.args) ? command.args : [];
        if (args.length > MAX_ARGUMENTS || args.some((arg) => typeof arg !== 'string' || arg.length > MAX_ARGUMENT_LENGTH || arg.includes('\0'))) {
            throw new Error('Invalid sandbox command arguments.');
        }
        const timeoutMs = Number.isFinite(command.timeoutMs)
            ? Math.max(1_000, Math.min(MAX_TIMEOUT_MS, Math.floor(command.timeoutMs)))
            : 30_000;
        return { executable, args: [...args], timeoutMs };
    }

    function normalizeArtifactPath(relativePath) {
        const normalized = typeof relativePath === 'string' ? relativePath.replaceAll('\\', '/').trim() : '';
        if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) throw new Error('Sandbox artifact path must be relative.');
        if (normalized.split('/').some((part) => !part || part === '..')) throw new Error('Sandbox artifact path must stay inside the workspace.');
        return normalized;
    }

    function workspaceFilePath(session, relativePath) {
        const normalized = normalizeArtifactPath(relativePath);
        const filePath = path.resolve(session.workspacePath, ...normalized.split('/'));
        const relative = path.relative(path.resolve(session.workspacePath), filePath);
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Sandbox artifact path escaped its workspace.');
        return { normalized, filePath };
    }

    function digestBytes(bytes) {
        return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
    }

    function requireSession(sessionId, capability) {
        const session = sessions.get(sessionId);
        if (!session || session.status !== 'running') throw new Error('Running sandbox session not found.');
        if (capability && !session.capabilities.includes(capability)) throw new Error(`Sandbox session has no ${capability} capability.`);
        return session;
    }

    return {
        probe: () => adapter.probe(),
        async create(request) {
            const normalized = normalizeRequest(request);
            const probe = await adapter.probe();
            if (!probe.available || !probe.isolated) throw new Error('No isolated Docker sandbox is available.');
            if (normalized.capabilities.some((item) => !probe.capabilities.includes(item))) throw new Error('Docker sandbox does not satisfy the requested capabilities.');
            const sessionId = crypto.randomUUID();
            const workspacePath = path.resolve(workspaceRoot, sessionId);
            const relative = path.relative(path.resolve(workspaceRoot), workspacePath);
            if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Sandbox workspace escaped its root.');
            fsApi.mkdirSync(workspacePath, { recursive: true });
            try {
                const runtime = await adapter.create({ sessionId, workspacePath, networkEnabled: normalized.capabilities.includes('network') });
                const session = { sessionId, missionId: normalized.missionId, backend: runtime.backend || adapter.kind, status: 'running', capabilities: normalized.capabilities, workspacePath, runtime, createdAt: new Date().toISOString(), hostFallbackAllowed: false };
                sessions.set(sessionId, session);
                return session;
            } catch (error) {
                fsApi.rmSync(workspacePath, { recursive: true, force: true });
                throw error;
            }
        },
        list: () => [...sessions.values()].map((session) => ({ ...session })),
        async execute(sessionId, command) {
            const session = requireSession(sessionId, 'terminal');
            const normalized = normalizeCommand(command);
            const startedAt = new Date().toISOString();
            try {
                const result = await adapter.execute(session.runtime, normalized);
                return { sessionId, startedAt, finishedAt: new Date().toISOString(), ...result };
            } catch (error) {
                return {
                    sessionId, startedAt, finishedAt: new Date().toISOString(),
                    stdout: String(error?.stdout || ''), stderr: String(error?.stderr || error?.message || 'Sandbox command failed.'),
                    exitCode: Number.isInteger(error?.code) ? error.code : null, failed: true
                };
            }
        },
        async exportArtifact(sessionId, request = {}) {
            const session = requireSession(sessionId, 'workspace_read');
            const { normalized, filePath } = workspaceFilePath(session, request.relativePath);
            const stat = fsApi.statSync(filePath);
            if (!stat.isFile()) throw new Error('Sandbox artifact export path must be a file.');
            if (stat.size <= 0) throw new Error('Sandbox artifact export requires non-empty content.');
            if (stat.size > MAX_ARTIFACT_BYTES) throw new Error('Sandbox artifact exceeds the transfer size limit.');
            const bytes = fsApi.readFileSync(filePath);
            const digest = digestBytes(bytes);
            return {
                artifactId: crypto.randomUUID(),
                sourceSessionId: session.sessionId,
                missionId: session.missionId,
                backend: session.backend,
                relativePath: normalized,
                name: request.name || path.basename(normalized),
                sizeBytes: bytes.byteLength,
                digest,
                bytesBase64: bytes.toString('base64'),
                exportedAt: new Date().toISOString(),
                hostFallbackAllowed: false
            };
        },
        async importArtifact(sessionId, artifact = {}) {
            const session = requireSession(sessionId, 'workspace_write');
            if (artifact.sourceSessionId === sessionId) throw new Error('Sandbox artifact cannot be imported into its source session.');
            const { normalized, filePath } = workspaceFilePath(session, artifact.relativePath);
            const bytes = Buffer.from(String(artifact.bytesBase64 || ''), 'base64');
            if (bytes.byteLength <= 0) throw new Error('Sandbox artifact import requires non-empty content.');
            if (bytes.byteLength > MAX_ARTIFACT_BYTES) throw new Error('Sandbox artifact exceeds the transfer size limit.');
            const digest = digestBytes(bytes);
            if (typeof artifact.digest !== 'string' || artifact.digest !== digest) throw new Error('Sandbox artifact digest mismatch.');
            fsApi.mkdirSync(path.dirname(filePath), { recursive: true });
            fsApi.writeFileSync(filePath, bytes, { flag: 'wx' });
            return {
                imported: true,
                artifactId: artifact.artifactId || null,
                targetSessionId: session.sessionId,
                relativePath: normalized,
                sizeBytes: bytes.byteLength,
                digest,
                importedAt: new Date().toISOString(),
                hostFallbackAllowed: false
            };
        },
        async destroy(sessionId) {
            const session = sessions.get(sessionId);
            if (!session) return { destroyed: false, reason: 'Sandbox session not found.' };
            await adapter.destroy(session.runtime);
            fsApi.rmSync(session.workspacePath, { recursive: true, force: true });
            sessions.delete(sessionId);
            return { destroyed: true, sessionId };
        }
    };
}

module.exports = { createSandboxBroker, ALLOWED_CAPABILITIES, MAX_TIMEOUT_MS, MAX_ARTIFACT_BYTES };
