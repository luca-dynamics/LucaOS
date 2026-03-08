import securityManager from '../services/securityManager.js';

/**
 * Authentication Middleware
 * Validates the X-LUCA-TOKEN header for all incoming API requests.
 */
export const authMiddleware = (req, res, next) => {
    // 1. Skip auth for specific routes if needed (e.g. handshake, health, status checks)
    if (req.path === '/api/handshake' || req.path === '/api/health' || req.path.endsWith('/status')) {
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
