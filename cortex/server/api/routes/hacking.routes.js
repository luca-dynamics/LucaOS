import express from 'express';
import { CORTEX_PORT } from '../../config/constants.js';

const router = express.Router();
const CORTEX_URL = `http://127.0.0.1:${CORTEX_PORT}`; // Use 127.0.0.1 to avoid localhost IPv6 issues

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
        console.error(`[HACKING PROXY] Error forwarding to ${path}:`, error.message);
        console.error(`[HACKING PROXY] Destination URL was: ${CORTEX_URL}${path}`);
        res.status(500).json({ status: 'error', message: 'Cortex Link Failure', error: error.message });
    }
};

// Tool Status
router.get('/status', (req, res) => proxyToCortex(req, res, '/api/hacking/status'));

// Install Tool
router.post('/install', (req, res) => proxyToCortex(req, res, '/api/hacking/install'));

// Nmap Scan
router.post('/nmap', (req, res) => proxyToCortex(req, res, '/api/hacking/nmap'));

// Metasploit
router.post('/metasploit', (req, res) => proxyToCortex(req, res, '/api/hacking/metasploit'));

// Payload Generation
router.post('/payload', (req, res) => proxyToCortex(req, res, '/api/hacking/payload'));

// Burp Suite
router.post('/burp', (req, res) => proxyToCortex(req, res, '/api/hacking/burp'));

// Wireshark
router.post('/wireshark', (req, res) => proxyToCortex(req, res, '/api/hacking/wireshark'));

// John the Ripper
router.post('/john', (req, res) => proxyToCortex(req, res, '/api/hacking/john'));

// SQLi
router.post('/sqli', (req, res) => proxyToCortex(req, res, '/api/hacking/sqli'));

// Source Analysis (Dry Run)
router.post('/analyze-source', (req, res) => proxyToCortex(req, res, '/api/hacking/analyze-source'));

// Source Analysis (Auto-Execute)
router.post('/analyze-source/execute', (req, res) => proxyToCortex(req, res, '/api/hacking/analyze-source/execute'));

// Generic fallback for any other hacking routes
router.all('/*', (req, res) => proxyToCortex(req, res, `/api/hacking${req.path}`));

export default router;
