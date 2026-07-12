function createSandboxAdapterRouter(adapters) {
    if (!Array.isArray(adapters) || adapters.length === 0) throw new Error('At least one sandbox adapter is required.');
    const byKind = new Map(adapters.map((adapter) => [adapter.kind, adapter]));

    async function select(requiredCapabilities = []) {
        const probes = [];
        for (const adapter of adapters) {
            const probe = await adapter.probe();
            probes.push(probe);
            const hasCapabilities = requiredCapabilities.every((capability) => probe.capabilities.includes(capability));
            if (probe.available && probe.isolated && hasCapabilities) return { adapter, probe };
        }
        return { adapter: null, probe: { backend: 'none', available: false, isolated: false, reason: probes.map((item) => `${item.backend}: ${item.reason}`).join(' '), capabilities: [] } };
    }

    return {
        kind: 'automatic',
        async probe(request = {}) { return (await select(request.capabilities || [])).probe; },
        async create(input) {
            const selected = await select(input.capabilities || []);
            if (!selected.adapter) throw new Error(selected.probe.reason || 'No isolated sandbox backend is available.');
            const runtime = await selected.adapter.create(input);
            return { ...runtime, backend: selected.adapter.kind };
        },
        async execute(runtime, command) {
            const adapter = byKind.get(runtime?.backend);
            if (!adapter?.execute) throw new Error('Sandbox runtime backend cannot execute commands.');
            return adapter.execute(runtime, command);
        },
        async exportArtifact(runtime, request) {
            const adapter = byKind.get(runtime?.backend);
            if (!adapter?.exportArtifact) return null;
            return adapter.exportArtifact(runtime, request);
        },
        async importArtifact(runtime, artifact) {
            const adapter = byKind.get(runtime?.backend);
            if (!adapter?.importArtifact) return null;
            return adapter.importArtifact(runtime, artifact);
        },
        async destroy(runtime) {
            const adapter = byKind.get(runtime?.backend);
            if (!adapter) throw new Error('Sandbox runtime backend is unavailable for cleanup.');
            return adapter.destroy(runtime);
        }
    };
}

module.exports = { createSandboxAdapterRouter };
