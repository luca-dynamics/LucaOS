import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { RECOVERY_FILE } from '../../config/constants.js';
import securityManager from '../../services/securityManager.js';
import { isPathWithinDirectory } from '../../utils/pathUtils.js';

const ALLOWED_ROOTS = [
    process.cwd(),
    path.join(os.homedir(), '.luca'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Downloads')
];

const isJailed = (targetPath, req) => {
    if (!securityManager.isGodMode()) return false;
    if (req && req.headers['x-luca-bypass'] === 'true') return false;
    return !ALLOWED_ROOTS.some(root => isPathWithinDirectory(root, targetPath) || targetPath === root);
};

const router = express.Router();
// Check if we are running inside a compiled Electron app (ASAR) or standard Node process
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || (process.mainModule && process.mainModule.filename.includes('app.asar'));

// State
let currentWorkingDirectory = process.cwd();

// --- API IMPLEMENTATION ---

// Get/Set CWD
router.post('/cwd', (req, res) => {
    const { path: newPath } = req.body;
    if (newPath) {
        try {
            // Resolve path relative to current, or absolute
            const resolved = path.resolve(currentWorkingDirectory, newPath);
            
    if (isJailed(resolved, req)) {
                return res.status(403).json({ 
                    error: 'Restricted Access', 
                    code: 'PERMISSION_REQUIRED',
                    action: 'FS_ACCESS',
                    metadata: { path: resolved, intent: 'CHANGE_DIRECTORY' },
                    message: `Autonomous filesystem access to '${resolved}' is restricted. Manual safety bypass required.` 
                });
            }

            if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
                currentWorkingDirectory = resolved;
                console.log(`[CWD] Changed to: ${currentWorkingDirectory}`);
                res.json({ result: currentWorkingDirectory });
            } else {
                res.json({ error: `Directory not found: ${resolved}` });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        res.json({ result: currentWorkingDirectory });
    }
});

// List Files
router.post('/list', (req, res) => {
    const targetPath = req.body.path ? path.resolve(currentWorkingDirectory, req.body.path) : currentWorkingDirectory;
    
    if (isJailed(targetPath, req)) {
        return res.status(403).json({ 
            error: 'Restricted Access', 
            code: 'PERMISSION_REQUIRED',
            action: 'FS_ACCESS',
            metadata: { path: targetPath, intent: 'LIST_DIRECTORY' },
            message: 'Path is outside of allowed directories.' 
        });
    }
    try {
        if (!fs.existsSync(targetPath)) {
            return res.json({ error: `Path not found: ${targetPath}` });
        }
        const items = fs.readdirSync(targetPath).map(item => {
            try {
                const fullPath = path.join(targetPath, item);
                const stats = fs.statSync(fullPath);
                return {
                    name: item,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    mtime: stats.mtime
                };
            } catch (e) {
                return { name: item, isDirectory: false, error: 'Access Denied' };
            }
        });
        // Sort directories first
        items.sort((a, b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1));
        res.json({ path: targetPath, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// List Files (GET) - For compatibility
router.get('/list', (req, res) => {
    const targetPath = req.query.path ? path.resolve(currentWorkingDirectory, req.query.path) : currentWorkingDirectory;
    
    if (isJailed(targetPath, req)) {
        return res.status(403).json({ 
            error: 'Restricted Access', 
            code: 'PERMISSION_REQUIRED',
            action: 'FS_ACCESS',
            metadata: { path: targetPath, intent: 'LIST_DIRECTORY' },
            message: 'Path is outside of allowed directories.' 
        });
    }
    try {
        if (!fs.existsSync(targetPath)) {
            return res.json({ error: `Path not found: ${targetPath}` });
        }
        const items = fs.readdirSync(targetPath).map(item => {
            try {
                const fullPath = path.join(targetPath, item);
                const stats = fs.statSync(fullPath);
                return {
                    name: item,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    mtime: stats.mtime
                };
            } catch (e) {
                return { name: item, isDirectory: false, error: 'Access Denied' };
            }
        });
         items.sort((a, b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1));
        res.json({ path: targetPath, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Read File
router.post('/read', (req, res) => {
    const { path: filePath } = req.body;
    const targetPath = path.resolve(currentWorkingDirectory, filePath);

    if (isJailed(targetPath, req)) {
        return res.status(403).json({ 
            error: 'Restricted Access', 
            code: 'PERMISSION_REQUIRED',
            action: 'FS_READ',
            metadata: { path: targetPath },
            message: 'Path is outside of allowed directories.' 
        });
    }
    try {
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
            const content = fs.readFileSync(targetPath, 'utf8');
            res.json({ content });
        } else {
            res.json({ error: 'File not found or is a directory' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/read', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({error: "No path provided"});
    
    const targetPath = path.resolve(currentWorkingDirectory, filePath);
    try {
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
            const content = fs.readFileSync(targetPath, 'utf8');
            res.json({ content });
        } else {
            res.json({ error: 'File not found or is a directory' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// Helper: Cleanup Old Backups
const cleanupOldBackups = (originalPath) => {
    try {
        const dir = path.dirname(originalPath);
        const baseName = path.basename(originalPath);

        const files = fs.readdirSync(dir);
        const backups = files.filter(f => f.startsWith(baseName) && f.endsWith('.bak'));

        const backupStats = backups.map(f => ({
            name: f,
            time: fs.statSync(path.join(dir, f)).mtime.getTime()
        }));

        backupStats.sort((a, b) => b.time - a.time); // Newest first

        // Keep last 5
        const toDelete = backupStats.slice(5);
        toDelete.forEach(f => {
            fs.unlinkSync(path.join(dir, f.name));
        });
    } catch (e) {
        console.warn("Backup cleanup failed", e);
    }
};

// Write File
router.post('/write', (req, res) => {
    const { path: filePath, content } = req.body;
    const targetPath = path.resolve(currentWorkingDirectory, filePath);

    if (isJailed(targetPath, req)) {
        return res.status(403).json({ 
            error: 'Restricted Access', 
            code: 'PERMISSION_REQUIRED',
            action: 'FS_WRITE',
            metadata: { path: targetPath },
            message: 'Path is outside of allowed directories.' 
        });
    }

    // --- INTEGRITY CHECK FOR PRODUCTION BUILDS ---
    if (IS_PRODUCTION) {
        const lockedPaths = ['server.js', 'App.tsx', 'index.tsx', 'components/', 'services/'];
        const isRestricted = lockedPaths.some(p => filePath.includes(p));

        if (isRestricted) {
            console.warn(`[SECURITY] Blocked write attempt to ${filePath} in Production Mode.`);
            return res.json({
                error: "KERNEL INTEGRITY LOCK: Cannot modify core source code in Production Distribution."
            });
        }
    }

    try {
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (fs.existsSync(targetPath)) {
            const timestamp = Date.now();
            const backupPath = `${targetPath}.${timestamp}.bak`;
            fs.copyFileSync(targetPath, backupPath);
            fs.copyFileSync(targetPath, targetPath + '.bak');

             try {
                if (!fs.existsSync(path.dirname(RECOVERY_FILE))) fs.mkdirSync(path.dirname(RECOVERY_FILE), {recursive:true});
                fs.writeFileSync(RECOVERY_FILE, targetPath, 'utf8');
            } catch (e) {
                 // ignore
            }
            cleanupOldBackups(targetPath);
        }

        fs.writeFileSync(targetPath, content, 'utf8');
        res.json({ success: true, path: targetPath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Batch Analyze and Organize Directory
router.post('/batch-organize', async (req, res) => {
    const { targetPath, instruction } = req.body;
    
    // Resolve absolute target path against current if relative
    const resolvedTarget = path.resolve(currentWorkingDirectory, targetPath || '.');
    
    if (isJailed(resolvedTarget, req)) {
        return res.status(403).json({ 
             error: 'Restricted Access', 
             code: 'PERMISSION_REQUIRED',
             action: 'FS_WRITE',
             metadata: { path: resolvedTarget, intent: 'BATCH_ORGANIZE' },
             message: 'Path is outside of allowed directories.' 
        });
    }
    
    try {
        // We forward this complex AI task to the Python Cortex Engine which handles LLM execution natively
        // As defined in real_tool_delegator.py via agent_tool_endpoints.py
        const response = await fetch('http://127.0.0.1:8000/api/agent/execute-tool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                toolName: 'batchAnalyzeAndOrganizeDirectory',
                params: { targetPath: resolvedTarget, instruction }
            }),
             // Increase timeout to 10 minutes (600000ms) to allow for large directory batch chunking
             signal: AbortSignal.timeout(600000) 
        });
        
        if (!response.ok) {
            const errBody = await response.text();
             return res.status(response.status).json({ error: `Python Cortex Agent Failed: ${errBody}` });
        }
        
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
