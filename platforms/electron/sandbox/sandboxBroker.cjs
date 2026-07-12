const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALLOWED_CAPABILITIES = new Set(['terminal', 'workspace_read', 'workspace_write', 'network']);
const MAX_ARGUMENTS = 128;
const MAX_ARGUMENT_LENGTH = 8192;
const MAX_TIMEOUT_MS = 120_000;

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
            const session = sessions.get(sessionId);
            if (!session || session.status !== 'running') throw new Error('Running sandbox session not found.');
            if (!session.capabilities.includes('terminal')) throw new Error('Sandbox session has no terminal capability.');
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

module.exports = { createSandboxBroker, ALLOWED_CAPABILITIES, MAX_TIMEOUT_MS };
