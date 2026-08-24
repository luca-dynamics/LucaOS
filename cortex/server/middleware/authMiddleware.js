import securityManager from '../services/securityManager.js';

/**
 * Authentication Middleware
 * Validates the X-LUCA-TOKEN header for all incoming API requests.
 */

/**
 * The paths served with no token at all, matched **exactly**.
 *
 * `server.js` mounts this middleware at '/api', and express rewrites `req.path` to
 * be relative to the mount — so a request for '/api/health' arrives here as
 * '/health'. Both spellings are listed so the middleware behaves the same if it is
 * ever mounted at the root instead.
 *
 * The test used to be `req.path === p || req.path.endsWith(p)`, and the suffix half
 * made public every route whose name merely ended in one of these. That was not a
 * handful of paths: 27 route registrations under `cortex/server/api/routes/` end in
 * '/status' or '/health', only two of which (root.routes.js's own pair) were meant
 * to be public — so **25 routes answered with no token at all**, among them
 * '/api/vision/status', '/api/audio/status', '/api/forex/status',
 * '/api/hacking/status', '/api/build/status', '/api/system-status/status',
 * '/api/goals/scheduler/status', '/api/iot/relay/status' and the parameterised
 * '/api/backtest/:id/status'. A suffix test cannot express "this exact path is
 * public" — only an exact match can, so that is what this does.
 *
 * Adding an entry here makes exactly that path public and nothing else. There is a
 * test asserting this file never goes back to matching by suffix.
 */
const PUBLIC_PATHS = new Set([
    '/api/health', '/health',
    '/api/handshake', '/handshake',
    '/api/status', '/status',
]);

export const authMiddleware = (req, res, next) => {
    // 1. Skip auth for the public routes (health, handshake, status).
    if (PUBLIC_PATHS.has(req.path)) {
        return next();
    }

    // 2. Extract token from header
    const token = req.headers['x-luca-token'];

    if (!token) {
        return res.status(401).json({
            error: 'Authentication Required',
            message: 'Missing X-LUCA-TOKEN header.'
        });
    }

    // 3. Validate token
    if (!securityManager.validateToken(token)) {
        console.warn(`[Security] Unauthorized access attempt from ${req.ip}`);
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid security token.'
        });
    }

    // 4. Authorized
    next();
};

export { PUBLIC_PATHS };
export default authMiddleware;
