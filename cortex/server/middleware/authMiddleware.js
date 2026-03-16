import securityManager from '../services/securityManager.js';

/**
 * Authentication Middleware
 * Validates the X-LUCA-TOKEN header for all incoming API requests.
 */
export const authMiddleware = (req, res, next) => {
    // 1. Skip auth for specific routes if needed (e.g. handshake, health, status checks)
    const isPublic = [
        '/api/health', '/health',
        '/api/handshake', '/handshake',
        '/api/status', '/status'
    ].some(p => req.path === p || req.path.endsWith(p));

    if (isPublic) {
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

export default authMiddleware;
