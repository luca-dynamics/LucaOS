const ALLOWED_ROLES = new Set(['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox']);

function createSandboxBrowserController({ broker }) {
    if (!broker?.execute) throw new Error('Sandbox broker is required.');
    return {
        async run(sessionId, request) {
            const url = new URL(request?.url);
            if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported browser URL protocol.');
            const actions = (request.actions || []).map((action) => {
                if (!['click', 'fill'].includes(action.type) || !ALLOWED_ROLES.has(action.role) || typeof action.name !== 'string' || !action.name.trim()) throw new Error('Invalid browser action.');
                if (action.type === 'fill' && typeof action.value !== 'string') throw new Error('Browser fill action requires a value.');
                return { type: action.type, role: action.role, name: action.name.slice(0, 200), ...(action.type === 'fill' ? { value: action.value.slice(0, 10_000) } : {}) };
            });
            if (actions.length > 50) throw new Error('Browser action limit exceeded.');
            const plan = { url: url.href, actions, timeoutMs: Math.min(Math.max(request.timeoutMs || 30_000, 1_000), 120_000), maxTextChars: Math.min(Math.max(request.maxTextChars || 20_000, 1), 100_000) };
            return broker.execute(sessionId, { executable: '/usr/local/bin/luca-browser', args: [Buffer.from(JSON.stringify(plan)).toString('base64url')], timeoutMs: plan.timeoutMs + 5_000 });
        }
    };
}

module.exports = { createSandboxBrowserController, ALLOWED_ROLES };
