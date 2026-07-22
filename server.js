// LucaOS Local Core — fast-listen boot.
//
// Boot contract (why this file is shaped the way it is):
//   Phase 0 (synchronous, tiny graph): express + CORS + auth + /api/health +
//     /api/status + one lazy placeholder per route group, then server.listen().
//     The port is bound and /api/health answers within ~a second of spawn.
//   Phase 1 (async): core route groups + core services are dynamic-imported in
//     parallel and swapped into their placeholders as each one resolves.
//   Phase 2 (async): heavy integrations (social, trading, IoT, media…) load
//     after the core is live so they never delay first readiness.
//
// While a group is still loading its placeholder answers 503 {warming:true};
// if a group's import fails it answers 503 with the error and the failure is
// listed in /api/health — one broken integration no longer kills the server.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { SERVER_PORT, MANIFEST_FILE, DATA_DIR } from './cortex/server/config/constants.js';
import securityManager from './cortex/server/services/securityManager.js';
import authMiddleware from './cortex/server/middleware/authMiddleware.js';

const BOOT_STARTED_AT = Date.now();
const bootMs = () => Date.now() - BOOT_STARTED_AT;

const app = express();
const server = http.createServer(app);

// --- BOOT STATE (served by /api/health) ---
const bootState = {
    phase: 'binding',            // binding -> mounting-core -> ready
    listening: false,
    port: null,                  // resolved after listen() (ephemeral by default)
    coreReadyMs: null,
    readyMs: null,
    coreGroupsTotal: 0,          // tier-1 groups, loaded at boot
    coreGroupsMounted: 0,
    deferredGroupsTotal: 0,      // tier-2 groups, loaded on first request
    deferredGroupsMounted: 0,
    failed: [],                  // [{ id, error }]
};

// --- ROUTE GROUPS -----------------------------------------------------------
// Every group is registered as a lazy placeholder in phase 0 (deterministic
// Express order), then its real router is swapped in when the import lands.
// tier 1 = needed by the app during/just after boot. tier 2 = integrations.
// NOTE: the two groups mounted at the '/api' ROOT (root, automation) are
// declared LAST so specific prefixes match before the catch-all root router.
const ROUTE_GROUPS = [
    { id: 'admin', mounts: ['/api/admin'], module: './cortex/server/api/routes/admin.routes.js', tier: 1 },
    { id: 'system', mounts: ['/api/system'], module: './cortex/server/api/routes/system.routes.js', tier: 1 },
    { id: 'memory', mounts: ['/api/memory'], module: './cortex/server/api/routes/memory.routes.js', tier: 1 },
    { id: 'files', mounts: ['/api/fs'], module: './cortex/server/api/routes/files.routes.js', tier: 1 },
    { id: 'tasks', mounts: ['/api/tasks'], module: './cortex/server/api/routes/tasks.routes.js', tier: 1 },
    { id: 'autonomy', mounts: ['/api/autonomy'], module: './cortex/server/api/routes/autonomy.routes.js', tier: 1 },
    { id: 'knowledge', mounts: ['/api/knowledge'], module: './cortex/server/api/routes/knowledge.routes.js', tier: 1 },
    { id: 'skills', mounts: ['/api/skills'], module: './cortex/server/api/routes/skills.routes.js', tier: 1 },
    { id: 'network', mounts: ['/api/network'], module: './cortex/server/api/routes/network.routes.js', tier: 1 },
    { id: 'python', mounts: ['/api/python'], module: './cortex/server/api/routes/python.routes.js', tier: 1 },
    { id: 'node', mounts: ['/api/node'], module: './cortex/server/api/routes/node.routes.js', tier: 1 },
    { id: 'rpc', mounts: ['/api/rpc'], module: './cortex/server/api/routes/rpc.routes.js', tier: 1 },
    { id: 'ui', mounts: ['/api/ui'], module: './cortex/server/api/routes/ui.routes.js', tier: 1 },
    { id: 'subsystems', mounts: ['/api/subsystems'], module: './cortex/server/api/routes/subsystems.routes.js', tier: 1 },
    { id: 'security', mounts: ['/api/security'], module: './cortex/server/api/routes/security.routes.js', tier: 1 },
    { id: 'luca-link', mounts: ['/api/luca-link'], module: './cortex/server/api/routes/lucaLink.routes.js', tier: 1 },
    { id: 'router', mounts: ['/api/router'], module: './cortex/server/api/routes/router.routes.js', tier: 1 },
    { id: 'control', mounts: ['/api/control'], module: './cortex/server/api/routes/unified-control.routes.js', tier: 1 },
    { id: 'vision', mounts: ['/api/vision'], module: './cortex/server/api/routes/vision.routes.js', tier: 1 },
    { id: 'system-status', mounts: ['/api/system-status'], module: './cortex/server/api/routes/system-status.routes.js', tier: 1 },
    { id: 'mcp', mounts: ['/api/mcp'], module: './cortex/server/api/routes/mcp.routes.js', tier: 1 },
    { id: 'persona', mounts: ['/api/persona'], module: './src/cortex/server/api/routes/persona.routes.js', tier: 1 },

    { id: 'iot', mounts: ['/api/iot', '/api/relay'], module: './cortex/server/api/routes/iot.routes.js', tier: 2 },
    { id: 'whatsapp', mounts: ['/api/whatsapp'], module: './cortex/server/api/routes/whatsapp.routes.js', tier: 2 },
    { id: 'android', mounts: ['/api/android'], module: './cortex/server/api/routes/android.routes.js', tier: 2 },
    { id: 'mobile', mounts: ['/api/mobile'], module: './cortex/server/api/routes/mobile.routes.js', tier: 2 },
    { id: 'osint', mounts: ['/api/osint'], module: './cortex/server/api/routes/osint.routes.js', tier: 2 },
    { id: 'office', mounts: ['/api/office'], module: './cortex/server/api/routes/office.routes.js', tier: 2 },
    { id: 'crypto', mounts: ['/api/crypto'], module: './cortex/server/api/routes/crypto.routes.js', tier: 2 },
    { id: 'forex', mounts: ['/api/forex'], module: './cortex/server/api/routes/forex.routes.js', tier: 2 },
    { id: 'finance', mounts: ['/api/finance'], module: './cortex/server/api/routes/finance.routes.js', tier: 2 },
    { id: 'web', mounts: ['/api/web'], module: './cortex/server/api/routes/web.routes.js', tier: 2 },
    { id: 'build', mounts: ['/api/build'], module: './cortex/server/api/routes/build.routes.js', tier: 2 },
    { id: 'hacking', mounts: ['/api/hacking'], module: './cortex/server/api/routes/hacking.routes.js', tier: 2 },
    { id: 'c2', mounts: ['/api/c2'], module: './cortex/server/api/routes/c2.routes.js', tier: 2 },
    { id: 'forge', mounts: ['/api/forge'], module: './cortex/server/api/routes/forge.routes.js', tier: 2 },
    { id: 'audio', mounts: ['/api/audio'], module: './cortex/server/api/routes/audio.routes.js', tier: 2 },
    { id: 'trading', mounts: ['/api/trading'], module: './cortex/server/api/routes/trading.routes.js', tier: 2 },
    { id: 'debate', mounts: ['/api/debate'], module: './cortex/server/api/routes/debate.routes.js', tier: 2 },
    { id: 'backtest', mounts: ['/api/backtest'], module: './cortex/server/api/routes/backtest.routes.js', tier: 2 },
    { id: 'evolution', mounts: ['/api/evolution'], module: './cortex/server/api/routes/evolution.routes.js', tier: 2 },
    { id: 'telegram', mounts: ['/api/telegram'], module: './cortex/server/api/routes/telegram.routes.js', tier: 2 },
    { id: 'google', mounts: ['/api/google'], module: './cortex/server/api/routes/google.routes.js', tier: 2 },
    { id: 'macos-control', mounts: ['/api/macos-control'], module: './cortex/server/api/routes/macos-control.routes.js', tier: 2 },
    { id: 'windows-control', mounts: ['/api/windows-control'], module: './cortex/server/api/routes/windows-control.routes.js', tier: 2 },
    { id: 'mobile-control', mounts: ['/api/mobile-control'], module: './cortex/server/api/routes/mobile-control.routes.js', tier: 2 },
    { id: 'chrome-profile', mounts: ['/api/chrome-profile'], module: './cortex/server/api/routes/chromeProfile.routes.js', tier: 2 },
    { id: 'twitter', mounts: ['/api/twitter'], module: './cortex/server/api/routes/twitter.routes.js', tier: 2 },
    { id: 'instagram', mounts: ['/api/instagram'], module: './cortex/server/api/routes/instagram.routes.js', tier: 2 },
    { id: 'linkedin', mounts: ['/api/linkedin'], module: './cortex/server/api/routes/linkedin.routes.js', tier: 2 },
    { id: 'discord', mounts: ['/api/discord'], module: './cortex/server/api/routes/discord.routes.js', tier: 2 },
    { id: 'youtube', mounts: ['/api/youtube'], module: './cortex/server/api/routes/youtube.routes.js', tier: 2 },
    { id: 'social-skills', mounts: ['/api/social-skills'], module: './cortex/server/api/routes/social-skills.routes.js', tier: 2 },
    { id: 'wechat', mounts: ['/api/wechat'], module: './cortex/server/api/routes/wechat.routes.js', tier: 2 },

    // '/api' ROOT groups — declared last on purpose (see note above).
    { id: 'automation', mounts: ['/api'], module: './cortex/server/api/routes/automation.routes.js', tier: 1 },
    { id: 'root', mounts: ['/api'], module: './cortex/server/api/routes/root.routes.js', tier: 1 },
];
bootState.coreGroupsTotal = ROUTE_GROUPS.filter((g) => g.tier === 1).length;
bootState.deferredGroupsTotal = ROUTE_GROUPS.filter((g) => g.tier === 2).length;

// Tier-1 placeholder: the group IS being loaded at boot, so tell the caller to
// retry rather than pretending the route is gone.
const warmingResponder = (group) => (req, res) => {
    res.set('Retry-After', '2');
    res.status(503).json({
        warming: true,
        group: group.id,
        phase: bootState.phase,
        uptimeMs: bootMs(),
        message: 'LucaOS Local Core is starting. Try again shortly.',
    });
};

// Tier-2 placeholder: the group is NOT loaded at boot at all. The first
// request triggers its import, waits for it, and is then served by the real
// router — so an integration costs startup time only if it is actually used.
// Concurrent callers share the one in-flight import via `group.loading`.
const onDemandResponder = (group) => async (req, res, next) => {
    try {
        group.loading ??= loadGroup(group);
        await group.loading;
    } catch {
        /* loadGroup never rejects; it records the failure on the group. */
    }
    if (typeof group.impl === 'function' && group.status !== 'on-demand') {
        return group.impl(req, res, next);
    }
    return next();
};

const failedResponder = (group, error) => (req, res) => {
    res.status(503).json({
        error: 'Route group failed to load',
        group: group.id,
        detail: String(error?.message || error),
    });
};

// --- MIDDLEWARE (phase 0) ---
const ALLOWED_ORIGINS = (process.env.LUCA_CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',');
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error('Blocked by CORS'));
    },
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// --- GLOBAL SECURITY LAYER ---
app.use('/api', authMiddleware);

// --- SYSTEM HEALTH (boot handshake; alive from the very first second) ---
// Kept in phase 0 so the app's BIOS check passes while route groups are still
// loading. `status` is 'ok' only once the core is mounted, so callers that
// gate on the body keep honest semantics; callers that gate on HTTP 200 see
// the server as reachable immediately (which it is).
app.get('/api/health', (req, res) => {
    const status = bootState.failed.length > 0
        ? 'degraded'
        : bootState.phase === 'ready'
            ? 'ok'
            : 'warming';
    res.json({
        status,
        timestamp: Date.now(),
        uptimeMs: bootMs(),
        // Identity, not just liveness: a caller can confirm it reached THIS
        // core (pid + port) rather than a leftover process on the same address.
        instance: { pid: process.pid, port: bootState.port },
        boot: {
            phase: bootState.phase,
            coreGroupsMounted: bootState.coreGroupsMounted,
            coreGroupsTotal: bootState.coreGroupsTotal,
            // Integrations load on first use, so this climbs during normal
            // operation rather than at boot. Not a readiness signal.
            deferredGroupsMounted: bootState.deferredGroupsMounted,
            deferredGroupsTotal: bootState.deferredGroupsTotal,
            coreReadyMs: bootState.coreReadyMs,
            readyMs: bootState.readyMs,
            failed: bootState.failed,
        },
    });
});

// Early /api/status: once the root route group is live this falls through to
// the real handler (single source of truth); before that it serves the same
// shape so the app's connectivity probe works during warm-up.
app.get('/api/status', (req, res, next) => {
    const rootGroup = ROUTE_GROUPS.find((g) => g.id === 'root');
    if (rootGroup && rootGroup.status === 'ready') return next('route');
    res.json({
        system: 'warming',
        modules: [],
        uptime: process.uptime(),
        cwd: process.cwd(),
        isProduction: process.env.NODE_ENV === 'production',
        opsecStatus: securityManager.isGodMode() ? 'BYPASSED' : 'ACTIVE',
    });
});

app.use('/mobile', express.static(path.join(process.cwd(), 'public/mobile')));

// --- ROOT ---
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body style="background: #000; color: #3b82f6; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                <h1>LUCA LOCAL CORE :: ONLINE</h1>
                <p>Status: ${bootState.phase.toUpperCase()}</p>
                <p>Platform: ${process.platform}</p>
                <p>Port: ${SERVER_PORT || 3000}</p>
                <p>Gateway: Modular (lazy boot)</p>
            </body>
        </html>
    `);
});

// --- LAZY PLACEHOLDERS (phase 0, deterministic order) ---
// Tier 1 loads eagerly right after listen(); tier 2 waits for its first
// request. Either way the mount order is fixed here, before listening, so
// route precedence never depends on which import happens to resolve first.
for (const group of ROUTE_GROUPS) {
    group.status = group.tier === 1 ? 'pending' : 'on-demand';
    group.impl =
        group.tier === 1 ? warmingResponder(group) : onDemandResponder(group);
    for (const mount of group.mounts) {
        app.use(mount, (req, res, next) => group.impl(req, res, next));
    }
}

// --- START LISTENING (before any feature module loads) ---
// PORT=0 asks the OS for a free ephemeral port, which is the default when the
// caller does not pin one. A fixed well-known port invites two failures: a
// collision with any other app (3002/3000/8000 are heavily used), and — worse —
// a STALE LucaOS process keeping the port and answering health checks meant for
// the live instance, so the app talks to a zombie backend. With an ephemeral
// port the address is unguessable and unshareable, so neither can happen.
// Set PORT explicitly (or LUCA_FIXED_PORT=1) only when something external must
// reach this server at a known address.
const requestedPort = process.env.PORT !== undefined
    ? Number(process.env.PORT)
    : (process.env.LUCA_FIXED_PORT === '1' ? Number(SERVER_PORT) : 0);

server.listen(requestedPort, '127.0.0.1', () => {
    const actualPort = server.address().port;
    bootState.listening = true;
    bootState.port = actualPort;
    bootState.phase = 'mounting-core';

    // Handshake line: the parent process (Electron main) parses this to learn
    // where the core actually landed. Keep the prefix stable — it is a contract.
    console.log(`[LUCA CORE] LISTENING_PORT=${actualPort}`);
    console.log(`[LUCA CORE] Server running on port ${actualPort} (+${bootMs()}ms — routes warming)`);
    console.log(`[LUCA CORE] Luca Link Socket: ON-DEMAND (Port 3003 when enabled)`);

    // Secondary discovery channel for tools that are not our direct parent
    // (scripts, the mobile page, diagnostics). Includes the pid so a reader can
    // tell a live core from a leftover file.
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(
            path.join(DATA_DIR, 'local-core.json'),
            JSON.stringify({ port: actualPort, pid: process.pid, startedAt: Date.now() }, null, 2),
        );
    } catch (e) {
        console.warn('[LUCA CORE] Could not write port discovery file:', e.message);
    }

    // Begin loading routes only now that the socket is bound, announced, and
    // able to answer. setImmediate lets this callback return first so the
    // server can serve requests before the heavy import work begins.
    setImmediate(() => { void loadCoreRoutes(); });
});

// A fixed port can be occupied; an ephemeral one cannot. Fail loudly instead of
// dying with an unhandled 'error' event.
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`[LUCA CORE] Port ${requestedPort} is already in use. Another LucaOS core may still be running.`);
        process.exit(1);
    }
    throw error;
});

// --- PHASE 1 / PHASE 2: mount route groups + services -----------------------
const loadGroup = async (group) => {
    try {
        const mod = await import(group.module);
        const router = mod.default;
        if (typeof router !== 'function') {
            throw new Error(`module has no default router export`);
        }
        group.impl = router;
        group.status = 'ready';
    } catch (error) {
        group.impl = failedResponder(group, error);
        group.status = 'failed';
        bootState.failed.push({ id: group.id, error: String(error?.message || error) });
        console.error(`[BOOT] ✗ route group '${group.id}' failed to load (isolated):`, error?.message || error);
    } finally {
        if (group.tier === 1) bootState.coreGroupsMounted += 1;
        else bootState.deferredGroupsMounted += 1;
    }
};

const loadService = async (label, run) => {
    try {
        await run();
    } catch (error) {
        console.warn(`[BOOT] Service '${label}' degraded:`, error?.message || error);
    }
};

// Core services the tier-1 routes lean on. Each is isolated: a failure
// degrades that service, never the server.
const loadCoreServices = () => Promise.all([
    loadService('database', () => import('./src/services/db.js')),
    loadService('memory-store', async () => {
        const { memoryStore } = await import('./src/services/memoryStore.js');
        try {
            memoryStore.migrateFromJson();
        } catch (e) {
            console.warn('[MEMORY] Migration warning:', e.message);
        }
    }),
    loadService('socket-service', async () => {
        // Socket service is ON-DEMAND (started via /api/luca-link/start); the
        // route handlers read it off the app at request time.
        const { socketService } = await import('./cortex/server/services/socketService.js');
        app.set('socketService', socketService);
    }),
    loadService('tools-manifest', async () => {
        if (fs.existsSync(MANIFEST_FILE)) {
            const content = fs.readFileSync(MANIFEST_FILE, 'utf8');
            const manifest = JSON.parse(content);
            console.log(`[LUCA_TOOLS] Loaded ${manifest.tools?.length ?? 0} tools from manifest.`);
        }
    }),
]);

// Heavy integration services — loaded after the core is serving.
const loadIntegrationServices = () => Promise.all([
    loadService('whatsapp', () => import('./cortex/server/services/whatsappService.js')),
    loadService('wechat', () => import('./cortex/server/services/wechatService.js')),
    loadService('relay', () => import('./src/services/relayService.js')),
    loadService('iot-dlna', async () => {
        const [{ default: iotManager }, { DlnaProvider }] = await Promise.all([
            import('./src/services/iot/IoTManager.js'),
            import('./src/services/iot/providers/DlnaProvider.js'),
        ]);
        await iotManager.registerProvider(new DlnaProvider());
    }),
    loadService('mcp-autoconnect', async () => {
        // Auto-connect user-configured MCP servers (~/.luca/data/mcp-settings.json).
        const { mcpClientManager } = await import('./cortex/server/services/mcpClientManager.js');
        const mcpSettingsFile = path.join(DATA_DIR, 'mcp-settings.json');
        if (fs.existsSync(mcpSettingsFile)) {
            const mcpSettings = JSON.parse(fs.readFileSync(mcpSettingsFile, 'utf8'));
            mcpClientManager.loadFromSettings(mcpSettings);
        }
    }),
    loadService('goal-scheduler', async () => {
        const { goalScheduler } = await import('./cortex/server/services/goalScheduler.js');
        // Standing by for God Mode toggle — never auto-initialized at boot.
        console.log(`[GOAL_SCHEDULER] Initial State: ${goalScheduler.getStatus().enabled ? 'ACTIVE' : 'STANDBY'}`);
    }),
]);

// Boot-critical groups first: the app's connectivity probe reads /api/status
// (root) and the introspection scan sweeps subsystems/system-status early.
// This is a priority hint, not a correctness requirement — see the drift
// guard below, which loads any tier-1 group omitted from this list.
const TIER1_LOAD_ORDER = [
    'root', 'automation', 'system-status', 'subsystems', 'system', 'memory',
    'admin', 'files', 'tasks', 'autonomy', 'knowledge', 'skills', 'network',
    'python', 'node', 'rpc', 'ui', 'security', 'luca-link', 'router',
    'control', 'vision', 'mcp', 'persona',
];

/**
 * Load the core route groups. Started ONLY after the server is listening.
 *
 * Ordering matters more than it looks: kicking this off at module scope
 * starved the event loop, because a CJS import tree evaluates in one long
 * synchronous block. The listen callback sat queued behind ~12s of module
 * evaluation, so the port was announced — and the first health response
 * served — 12s late, blowing the app's 10s BIOS window. Starting the work
 * from inside the listen callback means the port is bound, announced, and
 * answering before any heavy import begins.
 */
const loadCoreRoutes = async () => {
    const byId = new Map(ROUTE_GROUPS.map((g) => [g.id, g]));
    const tier1 = TIER1_LOAD_ORDER.map((id) => byId.get(id)).filter(Boolean);
    // Drift guard: any tier-1 group missing from TIER1_LOAD_ORDER still loads.
    for (const group of ROUTE_GROUPS) {
        if (group.tier === 1 && !tier1.includes(group)) tier1.push(group);
    }

    // Batched rather than all-at-once: Node resolves modules concurrently, so
    // batching keeps most of the parallel speed-up, while the yield between
    // batches hands the event loop back so queued /api/health and /api/status
    // requests are actually answered while the rest of the routes load.
    // (Nothing can interrupt a single module's synchronous evaluation — the
    // yields buy responsiveness BETWEEN modules, not inside one.)
    const BATCH_SIZE = 4;
    const pending = [...tier1];
    const batches = [];
    while (pending.length) batches.push(pending.splice(0, BATCH_SIZE));

    for (const batch of batches) {
        await Promise.all(batch.map(loadGroup));
        await new Promise((resolve) => setImmediate(resolve));
    }
    await loadCoreServices();
    bootState.coreReadyMs = bootMs();
    bootState.readyMs = bootState.coreReadyMs;
    bootState.phase = 'ready';

    const deferred = ROUTE_GROUPS.filter((g) => g.tier === 2).length;
    const failedNote = bootState.failed.length
        ? ` — ${bootState.failed.length} group(s) degraded: ${bootState.failed.map((f) => f.id).join(', ')}`
        : '';
    console.log(`[BOOT] Local Core ready in ${(bootState.coreReadyMs / 1000).toFixed(1)}s — ${tier1.length} core groups live, ${deferred} integrations deferred to first use${failedNote}`);

    // Integration SERVICES (WhatsApp/WeChat/IoT/MCP…) are background daemons
    // rather than request handlers, so they still start after the core is
    // serving; they just no longer gate readiness.
    await loadIntegrationServices();
    console.log(`[BOOT] Background integration services settled (+${bootMs()}ms).`);
};

// EXPORT FOR TESTING
export { app, server };
