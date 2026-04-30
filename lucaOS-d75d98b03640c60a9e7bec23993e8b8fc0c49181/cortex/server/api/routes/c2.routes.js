import express from 'express';
import { CORTEX_PORT } from '../../config/constants.js';

const router = express.Router();
const CORTEX_URL = `http://localhost:${CORTEX_PORT}`;

// Generic Proxy Handler
const proxyToCortex = async (req, res, path) => {
    try {
        const url = `${CORTEX_URL}${path}`;
        const options = {
            method: req.method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            options.body = JSON.stringify(req.body);
        }

        const response = await fetch(url, options);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error(`[C2 PROXY] Error forwarding to ${path}:`, error.message);
        res.status(500).json({ status: 'error', message: 'Cortex Link Failure', error: error.message });
    }
};

// List C2 Sessions
router.get('/sessions', (req, res) => proxyToCortex(req, res, '/api/c2/sessions'));

// Send C2 Command
router.post('/command', (req, res) => proxyToCortex(req, res, '/api/c2/command'));

// Generate Payload
router.post('/generate', (req, res) => proxyToCortex(req, res, '/api/c2/generate'));

// Aliases for frontend compatibility
router.post('/execute', (req, res) => proxyToCortex(req, res, '/api/c2/command'));

export default router;
