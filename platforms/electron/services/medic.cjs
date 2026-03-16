/* eslint-disable @typescript-eslint/no-require-imports */
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const PROJECT_ROOT = path.join(__dirname, '../../../');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const paths = require('../../../cortex/server/config/paths.cjs');

class MedicService {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        // Try to get key from multiple sources
        this.apiKey = process.env.VITE_API_KEY || process.env.GEMINI_API_KEY; 
    }

    log(message, type = 'medic', progress) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('medic-log', { message, type, progress });
        }
        console.log(`[MEDIC] ${message}`);
    }

    async startTriage(bootLogs) {
        this.log("Triage Started. Reviewing patient vitals...", 'medic', 10);
        await new Promise(r => setTimeout(r, 1000));

        // 1. Analyze Logs (Heuristic)
        const symptoms = this.analyzeLogs(bootLogs);
        
        // 2. Perform Surgery (Heuristic)
        if (symptoms.length > 0) {
            for (const symptom of symptoms) {
                this.log(`Identified Symptom: ${symptom.code}`, 'medic', 30);
                const success = await this.performSurgery(symptom);
                if (success) {
                    this.log("Heuristic surgery successful. Rebooting...", 'success', 100);
                    return { success: true };
                }
            }
        }

        // 3. Level 3: Summon Sysadmin (AI)
        this.log("Heuristics failed. Summoning AI Sysadmin (Level 3)...", 'sysadmin', 50);
        await new Promise(r => setTimeout(r, 2000));
        
        if (!this.apiKey) {
             this.log("CRITICAL: No API Key found for AI Sysadmin. Manual Repair Required.", 'error', 100);
             return { success: false, reason: "NO_API_KEY" };
        }

        return await this.summonSysadmin(bootLogs);
    }

    async summonSysadmin(logs) {
        try {
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const logContent = logs.slice(-50).join('\n'); // Last 50 lines
            
            const prompt = `
            You are an expert MacOS/Node.js Sysadmin.
            The system failed to boot. Analyze these logs and provide a SINGLE command to fix it.
            
            CONSTRAINTS:
            - OS is macOS. DO NOT use 'systemctl', 'service', or 'apt-get'.
            - Use 'npm', 'node', 'python3', or file system commands.
            - If a Python dependency is missing, use the full path './cortex/python/venv/bin/pip'.
            - If a port is blocked, use 'lsof -ti:PORT | xargs kill -9'.
            
            LOGS:
            ${logContent}

            Analyze the root cause.
            Return ONLY a valid JSON object with this format (no markdown):
            {
                "reasoning": "Brief explanation of the error",
                "action": "SHELL",
                "command": "The exact terminal command to run to fix it (e.g. 'npm install')",
                "confidence": 0-100
            }
            `;

            this.log("Sysadmin: Analyzing Core Dump...", 'sysadmin');
            const result = await model.generateContent(prompt);
            const response = result.response.text();
            
            // Clean markdown if present
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(jsonStr);

            this.log(`Sysadmin: "${plan.reasoning}"`, 'sysadmin', 70);
            
            if (plan.confidence < 70) {
                this.log("Sysadmin: Confidence too low. Aborting auto-repair.", 'error', 100);
                return { success: false, reason: "LOW_CONFIDENCE" };
            }

            // --- USER APPROVAL STEP ---
            this.log("LEVEL 3: Manual Approval Required for AI Command.", 'warn', 75);
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('medic-approval-request', plan);
                
                const { ipcMain } = require('electron');
                const approved = await new Promise((resolve) => {
                    ipcMain.once('medic-approval-response', (event, result) => {
                        resolve(result);
                    });
                });

                if (!approved) {
                    this.log("Execution DENIED by Operator. Halting.", 'error', 100);
                    return { success: false, reason: "USER_DENIED" };
                }
            } else {
                this.log("CRITICAL: Recovery Window lost. Aborting.", 'error', 100);
                return { success: false, reason: "NO_WINDOW" };
            }

            this.log(`Sysadmin: Executing Authorized Command: ${plan.command}`, 'sysadmin', 80);
            const success = await this.execPromise(plan.command);
            
            if (success) {
                this.log("Sysadmin Plan Executed Successfully.", 'success', 100);
                return { success: true };
            } else {
                this.log("Sysadmin Plan Failed.", 'error', 100);
                return { success: false, reason: "AI_EXEC_FAILED" };
            }

        } catch (error) {
            this.log(`Sysadmin Brain Failure: ${error.message}`, 'error');
            return { success: false, reason: "AI_CRASH" };
        }
    }

    analyzeLogs(logs = []) {
        const symptoms = [];
        const fullLog = logs.join('\n');

        // Check for Port Conflicts (Cross-platform)
        if (fullLog.includes('EADDRINUSE') || 
            fullLog.includes('Address already in use') || 
            fullLog.includes('Errno 10048') ||
            fullLog.includes('Errno 98')) {
            symptoms.push({ code: 'PORT_BLOCKAGE' });
        }

        // Check for Python Missing or dependency issues
        if (fullLog.includes('command not found: python') || 
            fullLog.includes('No module named') ||
            fullLog.includes('ModuleNotFoundError')) {
            symptoms.push({ code: 'MISSING_DEPENDENCY' });
        }

        // Detect Zombie Process (Generic timeout usually means zombies)
        if (fullLog.includes('TIMEOUT') || fullLog.includes('Process Died')) {
            symptoms.push({ code: 'ZOMBIE_PROCESS' });
        }

        return symptoms;
    }

    async performSurgery(symptom) {
        switch (symptom.code) {
            case 'PORT_BLOCKAGE':
            case 'ZOMBIE_PROCESS': {
                this.log(`Performing Emergency Incision: Clearing Ports 3001/8000...`, 'medic', 50);
                if (process.platform === 'win32') {
                    // Windows: Stop-Process or Taskkill
                    await this.execPromise(`powershell "Get-NetTCPConnection -LocalPort 3001, 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`);
                } else {
                    // Unix: lsof + kill
                    await this.execPromise(`lsof -ti:3001 | xargs kill -9`);
                    await this.execPromise(`lsof -ti:3002 | xargs kill -9`);
                    await this.execPromise(`lsof -ti:8000 | xargs kill -9`);
                }
                return true;
            }

            case 'MISSING_DEPENDENCY': {
                this.log(`Injecting Dependencies: pip install...`, 'medic', 60);
                
                // Unified Python/Pip Resolution from standardized bridge
                let pythonExe = paths.PYTHON_BIN;
                if (!fs.existsSync(pythonExe)) {
                    pythonExe = paths.SYSTEM_PYTHON_BIN;
                }
                
                if (!fs.existsSync(pythonExe)) {
                    this.log("CRITICAL: Python Environment not found. Manual repair required.", 'error', 100);
                    return false;
                }

                // Standardized Pip Discovery
                const pip = path.join(path.dirname(pythonExe), 'pip' + (process.platform === 'win32' ? '.exe' : ''));
                const reqs = path.join(PROJECT_ROOT, 'cortex/python/requirements.txt');
                
                try {
                     // Wrap in quotes to handle spaces in paths
                     await this.execPromise(`"${pip}" install -r "${reqs}"`);
                     return true;
                } catch (e) {
                    this.log(`Pip injection failed: ${e.message}`, 'error');
                    return false;
                }
            }

            default:
                return false;
        }
    }

    execPromise(cmd) {
        return new Promise((resolve) => {
            exec(cmd, (error) => {
                // Ignore errors for kill commands (if no process found)
                if (error && !cmd.includes('kill')) {
                    resolve(false); 
                } else {
                    resolve(true);
                }
            });
        });
    }
}

module.exports = MedicService;
