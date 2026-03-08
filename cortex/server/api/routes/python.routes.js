import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PYTHON_BIN, VENV_DIR } from '../../config/constants.js';
import { sandboxService } from '../../services/sandboxService.js';

const router = express.Router();

router.post('/execute', async (req, res) => {
    const { script, venv, stateful = true } = req.body;
    
    if (!script) {
        return res.status(400).json({ error: 'Script content required' });
    }

    if (stateful) {
        try {
            const output = await sandboxService.execute(script);
            res.json(output); // output has { result: stdout, stderr }
        } catch (err) {
            res.status(500).json({ error: err.message, fix: "Check Python sandbox stability or syntax." });
        }
        return;
    }

    // Pre-flight check: Ensure python3 exists (Stateless execution fallback)
    exec('python3 --version', (checkErr) => {
        if (checkErr) {
            return res.status(503).json({ 
                error: "Python 3 is not installed or not in PATH.",
                fix: "Install Python 3 and ensure 'python3' command is available in your shell."
            });
        }

        const tempPath = path.join(os.tmpdir(), `luca_py_${Date.now()}.py`);
        fs.writeFileSync(tempPath, script);

        let command = fs.existsSync(PYTHON_BIN) ? `"${PYTHON_BIN}" "${tempPath}"` : `python3 "${tempPath}"`;
        if (venv || fs.existsSync(VENV_DIR)) {
            const venvPath = venv ? path.resolve(process.cwd(), venv) : VENV_DIR;
            const platform = os.platform();
            
            if (!fs.existsSync(venvPath)) {
                fs.unlinkSync(tempPath);
                return res.status(400).json({
                    error: `Virtual environment not found at: ${venvPath}`,
                    fix: `Create the venv: python3 -m venv ${venvPath}`
                });
            }

            if (platform === 'win32') {
                command = `"${path.join(venvPath, 'Scripts', 'python.exe')}" "${tempPath}"`;
            } else {
                command = `"${path.join(venvPath, 'bin', 'python')}" "${tempPath}"`;
            }
        }

        exec(command, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            fs.unlinkSync(tempPath);
            if (err) {
                return res.json({ error: err.message, stderr, fix: "Check Python script syntax or dependencies." });
            }
            res.json({ result: stdout, stderr });
        });
    });
});

router.post('/reset', (req, res) => {
    const result = sandboxService.reset();
    res.json(result);
});

export default router;
