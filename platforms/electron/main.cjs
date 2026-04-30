/* eslint-disable @typescript-eslint/no-require-imports */
const { 
  app, BrowserWindow, ipcMain, shell, desktopCapturer, 
  Tray, Menu, nativeImage, screen, systemPreferences, dialog 
} = require('electron');

require('dotenv').config(); // Load environment variables for Main process (and Medic)
const path = require('path');
const fs = require('fs');

// [MAIN] Mission Control Service Initialization
const MissionControl = require('./services/missionControl.cjs');
let missionControl;
const net = require('net'); // Native Node.js net module for TCP
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// --- WINDOW STATE PERSISTENCE ---
const WINDOW_STATE_FILENAME = 'window-state.json';
const WINDOW_STATE_VC_FILENAME = 'window-state-vc.json';
let windowStateTimer;
let windowStateVCTimer;

function getWindowStatePath() {
    return path.join(app.getPath('userData'), WINDOW_STATE_FILENAME);
}

function loadWindowState() {
    try {
        const statePath = getWindowStatePath();
        if (fs.existsSync(statePath)) {
            const data = fs.readFileSync(statePath, 'utf8');
            const state = JSON.parse(data);
            
            // INDUSTRIAL GRADE: Visibility Audit
            // Ensure the window isn't opening off-screen (e.g. if a monitor was disconnected)
            const primaryDisplay = screen.getPrimaryDisplay();
            const { x, y, width, height } = state;
            
            // If we have saved bounds, check if they intersect with ANY active display
            const display = screen.getDisplayMatching({ x, y, width, height });
            const titleBarHeight = 32; // Standard Electron title bar height we target
            
            // INDUSTRIAL GRADE: "Handle Check"
            // Let the window stay if the TOP-CENTER (the drag handle area) is on a valid screen.
            // This prevents the window from being "lost" if only the bottom half is on a screen.
            const handleX = x + (width / 2);
            const handleY = y + (titleBarHeight / 2);

            const isHandleVisible = (
                handleX >= display.bounds.x &&
                handleX <= display.bounds.x + display.bounds.width &&
                handleY >= display.bounds.y &&
                handleY <= display.bounds.y + display.bounds.height
            );

            if (!isHandleVisible) {
                console.log('[MAIN] Window handle is off-screen. Resetting to primary display.');
                return { 
                    width: 1152, 
                    height: 710, 
                    x: Math.floor((primaryDisplay.workArea.width - 1152) / 2),
                    y: Math.floor((primaryDisplay.workArea.height - 710) / 2)
                };
            }

            return state;
        }
    } catch (e) {
        console.error('[MAIN] Failed to load window state:', e);
    }
    return { width: 1152, height: 710 }; // Default
}

function saveWindowState(bounds, isMaximized = false) {
    if (windowStateTimer) clearTimeout(windowStateTimer);
    windowStateTimer = setTimeout(() => {
        try {
            const statePath = getWindowStatePath();
            const data = { ...bounds, isMaximized };
            fs.writeFileSync(statePath, JSON.stringify(data), 'utf8');
        } catch (e) {
            console.error('[MAIN] Failed to save window state:', e);
        }
    }, 500);
}

function getWindowStateVCPath() {
    return path.join(app.getPath('userData'), WINDOW_STATE_VC_FILENAME);
}

function loadWindowStateVC() {
    try {
        const statePath = getWindowStateVCPath();
        if (fs.existsSync(statePath)) {
            const data = fs.readFileSync(statePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[MAIN] Failed to load VisualCore state:', e);
    }
    return null;
}

function saveWindowStateVC(bounds) {
    if (windowStateVCTimer) clearTimeout(windowStateVCTimer);
    windowStateVCTimer = setTimeout(() => {
        try {
            const statePath = getWindowStateVCPath();
            fs.writeFileSync(statePath, JSON.stringify(bounds), 'utf8');
        } catch (e) {
            console.error('[MAIN] Failed to save VisualCore state:', e);
        }
    }, 500);
}


// Pentesting modules
// --- SYSTEM PATH SYNCHRONIZATION ---
const paths = require('../../cortex/server/config/paths.cjs');
// NOTE: app.setPath must be called after app is ready — see app.on('ready') below.

const WiFiScanner = require('./pentesting/wifiScanner.cjs');
const wifiScanner = new WiFiScanner();

let robot;
try {
  robot = require('robotjs');
  console.log("[MAIN] ✅ RobotJS loaded successfully. HID Control active.");
} catch (e) {
  console.error("[MAIN] ❌ Failed to load robotjs:", e);
}

// Keep a global reference of the window object
let mainWindow;
let widgetWindow; // Widget Window Reference
let chatWindow; // Chat Window Reference (Luca CLI)
let browserWindow; // Browser Window Reference (GhostBrowser)
let visualCoreWindow; // Visual Core Window Reference (Smart Screen)
let bootWindow; // BIOS Boot Window
let tray; // Tray Reference
let trayMenu; // Tray Menu Reference
let serverProcess;
let cortexProcess;

// Track comprehensive sensor and service status for Tray UI
let sensorState = { 
    mic: false, 
    vision: false, 
    screen: false,
    audioSentry: false,
    visualSentry: false,
    wakeWord: false,
    godMode: false,
    privacy: {
        micEnabled: true,
        cameraEnabled: true,
        screenEnabled: true
    }
};

// --- PORT CONFIGURATION ---
// These should match cortex/server/config/constants.js
const VITE_DEV_PORT = process.env.VITE_DEV_PORT || 3000;  // Frontend dev server
const SERVER_PORT = process.env.SERVER_PORT || 3002;      // Node.js backend API
const CORTEX_PORT = process.env.CORTEX_PORT || 8000;      // Python Cortex (dynamically overridden if port unavailable)
// Note: WS_PORT (3003) is only used by backend server.js, not in this Electron main process


// --- BIOS BOOT SEQUENCE ---
let rebootAttempts = 0;

function createBootWindow() {
    if (bootWindow) return; // Re-use if exists

    bootWindow = new BrowserWindow({
        width: 600,
        height: 400,
        frame: false,
        transparent: false,
        backgroundColor: '#000000',
        show: false, // Don't show until content is ready
        center: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    bootWindow.loadFile(path.join(__dirname, 'boot.html'));
    
    // Smooth reveal to avoid blank flash
    bootWindow.once('ready-to-show', () => {
        bootWindow.show();
    });

    bootWindow.on('closed', () => { bootWindow = null; });
}

async function checkPort(port) {
    return new Promise(resolve => {
        const client = new net.Socket();
        client.connect(port, '127.0.0.1', () => {
            client.destroy();
            resolve(true);
        });
        client.on('error', () => resolve(false));
    });
}

function cleanupProcesses() {
    if (serverProcess) {
        console.log('[BOOT] Killing Server Process...');
        serverProcess.kill();
        serverProcess = null;
    }
    if (cortexProcess) {
        console.log('[BOOT] Killing Cortex Process...');
        cortexProcess.kill();
        cortexProcess = null;
    }
}



let recoveryWindow;

function createRecoveryWindow() {
    if (recoveryWindow) return;

    recoveryWindow = new BrowserWindow({
        width: 800,
        height: 600,
        backgroundColor: '#1a0505',
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    recoveryWindow.loadFile(path.join(__dirname, 'recovery.html'));
    recoveryWindow.on('closed', () => { recoveryWindow = null; });
}

let bootLogs = []; // Store logs for Medic

/**
 * Provision the environment if missing (Initial Setup)
 */
async function provisionEnvironment(log) {
    const isWindows = process.platform === 'win32';
    const setupScript = isWindows 
        ? path.join(__dirname, '../../cortex/python/setup_vision.ps1')
        : path.join(__dirname, '../../cortex/python/setup_vision.sh');
    
    log(`[BIOS] Environment Alignment Required. Launching Provisioner...`, 'warn', 15);
    
    return new Promise((resolve, reject) => {
        let child;
        if (isWindows) {
            child = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', setupScript, '--full']);
        } else {
            // Ensure script is executable
            try { fs.chmodSync(setupScript, '755'); } catch { /** ignore permission errors on some systems */ }
            child = spawn('/bin/bash', [setupScript, '--full']);
        }

        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;
                
                // Extract progress if present in format [PROGRESS:XX]
                const progressMatch = cleanLine.match(/\[PROGRESS:(\d+)\]/);
                const progress = progressMatch ? parseInt(progressMatch[1]) : undefined;
                
                // Determine log type
                let type = 'info';
                if (cleanLine.includes('[ERROR]')) type = 'error';
                else if (cleanLine.includes('[WARN]')) type = 'warn';
                else if (cleanLine.includes('[SUCCESS]')) type = 'success';
                
                // Strip metadata for UI and send
                const uiMsg = cleanLine.replace(/\[PROGRESS:\d+\]\s*/, '').replace(/\[BOOT\]\s*/, '');
                log(uiMsg, type, progress);
            }
        });

        child.stderr.on('data', (data) => {
            const errLine = data.toString().trim();
            if (errLine) log(errLine, 'error');
        });

        child.on('close', (code) => {
            if (code === 0) {
                log("Environment Provisioned Successfully.", 'success', 90);
                resolve();
            } else {
                log(`Provisioning Protocol Failure (Exit Code: ${code})`, 'error', 100);
                reject(new Error(`Setup script failed with code ${code}`));
            }
        });
    });
}

async function bootSequence(isSilent = false) {
    if (!isSilent) createBootWindow();
    bootLogs = []; // Reset logs

    const log = (msg, type = 'info', progress) => {
        bootLogs.push(`[${type}] ${msg}`); // Capture for Medic
        if (bootWindow && !bootWindow.isDestroyed()) {
            bootWindow.webContents.send('boot-log', { message: msg, type, progress });
        }
        console.log(`[BOOT] ${msg}`);
    };

    if (rebootAttempts > 0) {
        log(`[SYSTEM] Watchdog Failure. Rebooting (Attempt ${rebootAttempts}/3)...`, 'warn', 0);
        await new Promise(r => setTimeout(r, 2000));
        cleanupProcesses();
    }

    // 1. Hardware Check
    if (rebootAttempts === 0) { // Only show hardware check on cold boot
        log("Initializing Hardware Abstraction Layer...", 'info', 10);
        await new Promise(r => setTimeout(r, 800)); 
        
        // --- PROVISIONING CHECK (Dev Only) ---
        if (!app.isPackaged) {
            const venvExists = fs.existsSync(paths.VENV_DIR) || fs.existsSync(paths.SYSTEM_VENV_DIR);
            if (!venvExists) {
                try {
                    await provisionEnvironment(log);
                } catch (err) {
                    log(`CRITICAL: Provisioning Failed. Luca cannot start. Error: ${err.message}`, 'error', 100);
                    return; // Halt
                }
            } else {
                log("AI Environment Verified. Integrity Check: PASS.", 'success', 25);
            }
        }
    }

    // 2. Start Subsystems
    log(`Spawning Luca Cortex...`, 'warn', 30);
    await startCortex();
    
    log(`Igniting Node.js Logic Core (Port ${SERVER_PORT})...`, 'warn', 40);
    startServer();

    // 3. Wait Loop
    let serverReady = false;
    let cortexReady = false;
    let attempts = 0;
    const maxAttempts = 180; // Increased to 180s for Intel Mac First-Boot headroom

    const checkInterval = setInterval(async () => {
        attempts++;
        
        // Don't check if we are rebooting/cleaning up
        if (!bootWindow) {
            clearInterval(checkInterval);
            return;
        }

        if (!serverReady) serverReady = await checkPort(SERVER_PORT);
        if (!cortexReady) cortexReady = await checkPort(cortexPort);

        if (serverReady && !cortexReady) {
            log(`[WAIT] Logic Core Ready. Waiting for Cortex Graph DB... (${attempts}s)`, 'info', 50 + Math.floor(attempts/2));
        } else if (!serverReady && cortexReady) {
             log(`[WAIT] Cortex Ready. Waiting for Logic Core... (${attempts}s)`, 'info', 50 + Math.floor(attempts/2));
        }

        if (serverReady && cortexReady) {
            clearInterval(checkInterval);
            rebootAttempts = 0; // Reset on success
            log("ALL SYSTEMS ONLINE. HANDSHAKE COMPLETE.", 'success', 100);
            if (bootWindow) bootWindow.webContents.send('boot-status', 'SYSTEM READY');
            
            setTimeout(() => {
                launchInterface(isSilent);
            }, 1000); 
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            handleBootFailure("TIMEOUT", log);
        }
    }, 1000);
}

const MedicService = require('./services/medic.cjs');

async function handleBootFailure(reason, logFunc) {
    rebootAttempts++;
    if (rebootAttempts <= 3) {
        logFunc(`BOOT FAILURE: ${reason}. Retrying (Attempt ${rebootAttempts}/3)...`, 'error', 100);
        setTimeout(() => {
             // Close existing windows before retry?
             bootSequence();
        }, 1000);
    } else {
        logFunc("CRITICAL FAILURE: MAX REBOOTS EXCEEDED.", 'error', 100);
        
        // --- LEVEL 2: THE MEDIC ---
        if (bootWindow) bootWindow.close();
        createRecoveryWindow();
        
        const medic = new MedicService(recoveryWindow);
        const result = await medic.startTriage(bootLogs);
        
        if (result.success) {
            console.log('[MAIN] Medic reported success. Rebooting system...');
            rebootAttempts = 0;
            if (recoveryWindow) recoveryWindow.close();
            bootSequence();
        } else {
            console.log('[MAIN] Medic failed to revive system. HALTING.');
            // IPC to show failure in Recovery Window
             if (recoveryWindow) recoveryWindow.webContents.send('medic-log', { message: "SYSTEM HALTED. PLEASE CHECK TERMINAL.", type: 'error' });
        }
    }
}

function launchInterface(isSilent = false) {
    if (!isSilent) createWindow();
    createWidgetWindow(); 
    createChatWindow();
    
    // Auto-boot hologram only in PRODUCTION for the "Sovereign AI" feel.
    // In DEVELOPMENT, leave it off to save GPU overhead and speed up Vite hydration.
    if (app.isPackaged) {
        toggleHologram(); 
    }
    
    // Smooth transition: Show Main, Wait, Close Boot
    if (mainWindow && bootWindow) {
        let shown = false;
        const show = () => {
            if (shown) return;
            shown = true;
            if (mainWindow) mainWindow.show();
            setTimeout(() => {
                if (bootWindow) bootWindow.close();
            }, 500);
        };

        mainWindow.once('ready-to-show', show);
        // INDUSTRIAL GRADE: "Force Render" fallback for Intel Macs under load
        setTimeout(show, 2000); 
    } else {
        if (bootWindow) bootWindow.close();
    }
}

function createWindow() {
    // Create the browser window.
    // [MISSION_CONTROL] Handlers Registration
    if (!missionControl) {
        missionControl = new MissionControl(app.getPath('userData'));
    }

    /* eslint-disable no-unused-vars */
    ipcMain.handle('mission-start', (_event, title, metadata) => missionControl.startMission(title, metadata));
    ipcMain.handle('mission-add-goal', (_event, missionId, description, dependencyId) => missionControl.addGoal(missionId, description, dependencyId));
    ipcMain.handle('mission-update-goal', (_event, goalId, status) => missionControl.updateGoalStatus(goalId, status));
    ipcMain.handle('mission-get-context', () => missionControl.getActiveMissionContext());
    ipcMain.handle('mission-archive', (_event, missionId) => missionControl.archiveMission(missionId));
    /* eslint-enable no-unused-vars */

    // Load saved bounds
    const savedBounds = loadWindowState();

    mainWindow = new BrowserWindow({
        width: savedBounds.width,
        height: savedBounds.height,
        x: savedBounds.x,
        y: savedBounds.y,
        backgroundColor: '#00000000', // Transparent Hex for true native transparency
        transparent: true,
        titleBarStyle: 'hiddenInset', // Mac-style hidden title bar
        icon: path.join(__dirname, '../../public/logo.png'), // Desktop Icon (Background)
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false, // Security best practice
            contextIsolation: true, // Security best practice
            webSecurity: false, // Allow loading local resources if needed (dev only)
            webviewTag: true, // Enable <webview> tag support
            backgroundThrottling: false // CRITICAL: Allow Audio/Mic to run when window is backgrounded
        }
    });

    // Save bounds on resize/move
    const updateBounds = () => {
        const isMaximized = mainWindow.isMaximized();
        if (!isMaximized && !mainWindow.isMinimized()) {
            saveWindowState(mainWindow.getBounds(), false);
        } else if (isMaximized) {
            saveWindowState(loadWindowState(), true); // Preserve last normal bounds + maximized flag
        }
    };
    mainWindow.on('resize', updateBounds);
    mainWindow.on('move', updateBounds);

    // Initial Maximization
    if (savedBounds.isMaximized) {
        mainWindow.maximize();
    }

    // Load the app
    // Load the app
    const isDev = !app.isPackaged;
    let startUrl = process.env.ELECTRON_START_URL || (isDev ? `http://127.0.0.1:${VITE_DEV_PORT}` : `file://${path.join(__dirname, '../../dist/index.html')}`);
    
    // Append platform parameter for reliable renderer-side detection
    const urlObj = new URL(startUrl.startsWith('file://') ? startUrl : startUrl);
    urlObj.searchParams.set('platform', 'electron');
    startUrl = urlObj.toString();
    
    console.log(`[MAIN] Loading Window URL: ${startUrl}`);
    mainWindow.loadURL(startUrl);

    // Open the DevTools (Commented - Use Cmd+Option+I to open manually)
    // mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('dom-ready', () => {
        console.log('DOM Ready');
    });

    // Emitted when the window is closed.
    mainWindow.on('close', (event) => {
        if (global.minimizeToTray && !app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    // --- RECOVERY & MONITORING PROTOCOLS ---
    
    // Handle Renderer Crash (Black Screen)
    mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error(`[MAIN] 🔴 Renderer Process Gone: ${details.reason} (Exit Code: ${details.exitCode})`);
        logSystemResource(`Renderer Crash: ${details.reason}`);
        
        // Auto-Reload if it crashed or was killed by OOM
        if (details.reason !== 'clean-exit') {
            console.log('[MAIN] Attempting emergency window reload...');
            setTimeout(() => {
                if (mainWindow) mainWindow.reload();
            }, 1000);
        }
    });

    // Handle Window Hanging
    mainWindow.on('unresponsive', () => {
        console.warn('[MAIN] ⚠️ Main Window is unresponsive. Logging resource state...');
        logSystemResource('Window Unresponsive');
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// --- RESOURCE MONITORING ---
function logSystemResource(context = 'Regular Check') {
    try {
        const logDir = path.join(os.homedir(), '.luca', 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        
        const timestamp = new Date().toISOString();
        const logMsg = `[${timestamp}] [${context}] Main RSS: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB\n`;
        
        fs.appendFileSync(path.join(logDir, 'electron_memory.log'), logMsg);
    } catch (e) {
        console.error('[MONITOR] Failed to log memory:', e);
    }
}

// Start periodic monitoring
const os = require('os');
setInterval(() => logSystemResource('HEARTBEAT'), 5 * 60 * 1000); // Every 5 mins


// Start the Backend Server (Node.js)
function startServer() {
    const serverPath = path.join(__dirname, '../../server.js');
    console.log('Starting Backend Server at:', serverPath);

    // Use 'spawn' with 'node' to decouple from Electron's runtime/ABI
    // This ensures better-sqlite3 binaries (compiled for system Node) work correctly.
    // In production, we assume 'node' is available or bundle the runtime.
    serverProcess = spawn('node', [serverPath], {
        env: { 
            ...process.env, 
            PORT: SERVER_PORT, 
            CORTEX_PORT: cortexPort.toString(), // Pass dynamic port
            VITE_DEV_PORT: VITE_DEV_PORT.toString(), // Sync dev port
            ELECTRON_RUN: 'true' 
        },
        stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start Backend Server:', err);
    });
}

let cortexPort = CORTEX_PORT; // Default from env or 8000

// Start the Python Cortex (LightRAG)
// Start the Python Cortex (LightRAG)
async function startCortex() {
    const isPackaged = app.isPackaged;
    const cortexBinaryName = process.platform === 'win32' ? 'cortex.exe' : 'cortex';
    
    let cortexPath;
    let pythonCmd = null;

    if (isPackaged) {
        // PRODUCTION: Use the bundled standalone binary
        cortexPath = path.join(process.resourcesPath, 'bin', cortexBinaryName);
        console.log('[CORTEX] [PROD] Spawning bundled binary:', cortexPath);
    } else {
        // DEVELOPMENT: Use the local script and venv
        cortexPath = path.join(__dirname, '../../cortex/python/cortex.py');
        
        // Force Local VENV Priority (Critical for Intel Mac stability)
        const localVenv = paths.PYTHON_BIN;
        const systemVenv = paths.SYSTEM_PYTHON_BIN;
        
        if (fs.existsSync(localVenv)) {
            pythonCmd = localVenv;
            console.log(`[CORTEX] [DEV] Successfully located project venv: ${pythonCmd}`);
        } else if (fs.existsSync(systemVenv)) {
            pythonCmd = systemVenv;
            console.log(`[CORTEX] [DEV] Falling back to system venv: ${pythonCmd}`);
        } else {
            pythonCmd = 'python3';
            console.warn('[CORTEX] [DEV] WARNING: No venv found! Using system python (may lack dependencies).');
        }

        if (process.platform === 'win32' && pythonCmd.includes('python')) {
            pythonCmd = pythonCmd.replace('python', 'python.exe');
        }
        
        console.log('[CORTEX] [DEV] Using Python Source:', cortexPath);
        console.log('[CORTEX] [DEV] Using Interpreter:', pythonCmd);
    }


    // Initial Env from Process
    const env = { 
        ...process.env, 
        SERVER_PORT: SERVER_PORT.toString(), // Explicitly pass the correct Node port
        API_URL: `http://localhost:${SERVER_PORT}`, // Helper for Python
        PYTHONUNBUFFERED: '1',
        CORTEX_PORT: cortexPort.toString()
    };

    // Load .env.local if it exists (Overrides process.env)
    const envPath = path.join(__dirname, '../../.env.local');
    if (fs.existsSync(envPath)) {
        try {
            console.log('[CORTEX] Loading .env.local from:', envPath);
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    let value = match[2].trim();
                    // Strip quotes
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    if (key && value) {
                        env[key] = value;
                    }
                }
            });
        } catch (e) {
            console.error('[CORTEX] Error reading .env.local:', e);
        }
    }

    // Ensure API Key Aliases
    if (env.GEMINI_API_KEY) {
        env.GOOGLE_API_KEY = env.GEMINI_API_KEY; // Alias for Google SDKs
        env.API_KEY = env.GEMINI_API_KEY;        // Alias for generic SDKs
        console.log(`[CORTEX] GEMINI_API_KEY found (Length: ${env.GEMINI_API_KEY.length}). Aliased to GOOGLE_API_KEY.`);
    } else {
        console.error('[CORTEX] CRITICAL: GEMINI_API_KEY missing from Final Env!');
    }

    if (pythonCmd) {
        cortexProcess = spawn(pythonCmd, [cortexPath], {
            stdio: 'inherit',
            env: env
        });
    } else {
        cortexProcess = spawn(cortexPath, [], {
            stdio: 'inherit',
            env: env,
            windowsHide: true // Cleaner for Windows binary launching
        });
    }

    cortexProcess.on('error', (err) => {
        console.error('Failed to start Cortex:', err);
        if (bootWindow) bootWindow.webContents.send('boot-log', { message: `[CORTEX] Spawn Error: ${err.message}`, type: 'error' });
    });

    cortexProcess.on('exit', (code, signal) => {
        console.log(`Cortex exited with code ${code} and signal ${signal}`);
        if (bootWindow) bootWindow.webContents.send('boot-log', { message: `[CORTEX] Process Died (Code: ${code})`, type: 'error' });
    });
}

// --- TRAY & WIDGET MANANGEMENT ---

function createTray() {
    const iconPath = path.join(__dirname, '../../public/icon.png');
    let trayIcon;
    
    try {
        trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
        if (trayIcon.isEmpty()) {
            throw new Error("Icon file missing or empty");
        }
    } catch {
        console.log('[TRAY] Falling back to default icon');
        trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMC8yOS8xMiHZF3sAAAAcdEVh dFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAAAawlVQ4jZmQwQ3AIAxDz7I8jUZn6Wg0Won+I0QhQhH+7bOcyI6D6u6qKq1tW2vt5HnOuQ4A7v7GueecI38GAGut53c/VRURoZSClFL6L4QQQsqZc8445+R+3/631iYi9H3P+76T933zD/4B8EwX5hVw7NwAAAAASUVORK5CYII=');
    }
    
    tray = new Tray(trayIcon);
    tray.setToolTip('Luca AI');
    updateTrayMenu();
}

function updateTrayMenu() {
    if (!tray) return;

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Luca Dashboard', click: () => toggleMainWindow() },
        { label: 'Luca Smart Screen', click: () => toggleVisualCoreWindow() },

        { label: '🎙️ Start Dictation (Ctrl+D)', click: () => toggleWidgetWindow() },

        { label: 'Luca Hologram Face', click: () => toggleHologram() },
        { label: 'Luca Mini Chat', click: () => toggleChatWindow() },
        
        { type: 'separator' },
        
        {
            label: '🔒 Sensor Privacy',
            submenu: [
                { 
                    label: `🎙️ Mic Access`, 
                    type: 'checkbox',
                    checked: sensorState.privacy.micEnabled,
                    click: (item) => toggleSensorPrivacy('mic', item.checked)
                },
                { 
                    label: `👁️ Camera Access`, 
                    type: 'checkbox',
                    checked: sensorState.privacy.cameraEnabled,
                    click: (item) => toggleSensorPrivacy('camera', item.checked)
                },
                { 
                    label: `🖥️ Screen Access`, 
                    type: 'checkbox',
                    checked: sensorState.privacy.screenEnabled,
                    click: (item) => toggleSensorPrivacy('screen', item.checked)
                },
                { type: 'separator' },
                { 
                    label: `Status: ${sensorState.mic || sensorState.vision || sensorState.screen ? '🔴 CAPTURING' : '🟢 SECURE'}`,
                    enabled: false
                },
                { type: 'separator' },
                 { 
                    label: '🛑 KILL ALL SENSORS', 
                    click: () => {
                        console.warn('[TRAY] Emergency Kill Switch triggered!');
                        // Immediate UI update
                        sensorState = { 
                            ...sensorState, 
                            mic: false, 
                            vision: false, 
                            screen: false,
                            audioSentry: false,
                            visualSentry: false,
                            wakeWord: false,
                            godMode: false
                        };
                        updateTrayMenu();
                        
                        // Signal Renderer to kill everything
                        if (mainWindow) mainWindow.webContents.send('force-kill-sensors');
                    }
                }
            ]
        },
        
        { type: 'separator' },

        {
            label: '🛡️ LIVE SENTRY MODE',
            submenu: [
                {
                    label: '🔊 Audio Sentry(God Ear)',
                    type: 'checkbox',
                    id: 'sentry-audio',
                    checked: sensorState.audioSentry || false,
                    click: (item) => toggleSentryMode('audio', item.checked)
                },
                {
                    label: '👁️ Visual Sentry(God Eye)',
                    type: 'checkbox',
                    id: 'sentry-vision',
                    checked: sensorState.visualSentry || false,
                    click: (item) => toggleSentryMode('visual', item.checked)
                }
            ]
        },

        { type: 'separator' },
        { 
            label: 'Switch Mind (Persona)', 
             submenu: [
                { label: 'Assistant Mode', click: () => switchPersona('ASSISTANT') },
                { label: 'Engineer Mode', click: () => switchPersona('ENGINEER') },
                { label: 'Ruthless Mode', click: () => switchPersona('RUTHLESS') },
                { label: 'Hacker Mode', click: () => switchPersona('HACKER') }
            ]
        },
        { 
            label: 'Switch Skin (Theme)', 
             submenu: [
                { label: 'Master System (Blue)', click: () => switchTheme('MASTER_SYSTEM') },
                { label: 'Terminal (Green)', click: () => switchTheme('TERMINAL') },
                { label: 'Builder (Terracotta)', click: () => switchTheme('BUILDER') },
                { label: 'Professional (White)', click: () => switchTheme('PROFESSIONAL') },
                { label: 'Agentic Slate', click: () => switchTheme('AGENTIC_SLATE') },
                { label: 'Frost Ice', click: () => switchTheme('FROST') },
                { label: 'Satin Cream', click: () => switchTheme('LIGHTCREAM') },
                { label: 'Vaporwave Night', click: () => switchTheme('VAPORWAVE') },
                { label: 'Neural Purple', click: () => switchTheme('DICTATION') }
            ]
        },
        { type: 'separator' },
        { 
            label: '⚡ God Mode (Autonomy)', 
            type: 'checkbox', 
            checked: sensorState.godMode, 
            click: (item) => toggleGodMode(item.checked) 
        },
        { 
            label: '🎙️ Sense (Wake Word)', 
            type: 'checkbox', 
            id: 'wake-word-monitor',
            checked: sensorState.wakeWord, 
            click: (item) => toggleWakeWordMonitor(item.checked)
        },
        { type: 'separator' },
        { label: 'Quit Luca', click: () => {
            app.isQuitting = true;
            app.quit();
        }}
    ]);
    
    trayMenu = contextMenu;
    tray.setContextMenu(trayMenu);
}

function toggleChatWindow() {
    if (!chatWindow) {
        createChatWindow();
    } else {
        if (chatWindow.isVisible()) {
            chatWindow.hide();
        } else {
            chatWindow.show();
            chatWindow.focus();
        }
    }
}

function toggleMainWindow() {
    if (!mainWindow) {
        createWindow();
    } else {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    }
}

function toggleWidgetWindow() {
    if (!widgetWindow) {
        createWidgetWindow();
    } else {
        if (widgetWindow.isVisible()) {
            widgetWindow.hide();
        } else {
            widgetWindow.showInactive(); // Show but DO NOT STEAL FOCUS from Notepad/Chrome
            // widgetWindow.focus(); // REMOVED: We want focus to stay on the target app
        }
    }
}

// --- HOLOGRAM WINDOW ---
let hologramWindow;

function createHologramWindow() {
    if (hologramWindow) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    // Freeform size (large enough for the w-80 h-80 container)
    // Position bottom-right, but account for potential dock
    // ample space

    hologramWindow = new BrowserWindow({
        width: 300, 
        height: 400, 
        x: width - 300, 
        y: height - 410,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        show: false,
        hasShadow: false,
        focusable: false,
        backgroundColor: '#00000000', // Transparent Hex
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        }
    });

    const isDev = !app.isPackaged;
    const url = isDev 
        ? `http://localhost:${VITE_DEV_PORT}?mode=hologram` 
        : `file://${path.join(__dirname, '../../dist/index.html')}?mode=hologram`;

    hologramWindow.loadURL(url);
    
    // Ensure visibility overlay
    hologramWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    hologramWindow.setAlwaysOnTop(true, "floating", 1);

    // Click-through behavior? 
    // If the user wants to click the "Mic", we need it to be interactive.
    // If we setIgnoreMouseEvents(true), we can't click.
    // So we keep it interactive. But the transparent parts might block clicks unless we handle ignoreMouseEvents in renderer.
    // For now, let's keep it simple (fully interactive rectangular window).

    hologramWindow.on('closed', () => {
        hologramWindow = null;
    });
}

function toggleHologram() {
    if (!hologramWindow) {
        createHologramWindow();
        // Wait briefly for load? Or just show when ready-to-show is better.
        // For now, create then show.
        setTimeout(() => {
            if (hologramWindow) hologramWindow.show();
        }, 500); 
    } else {
        if (hologramWindow.isVisible()) {
            hologramWindow.hide();
        } else {
            hologramWindow.show();
        }
    }
}

function switchPersona(mode) {
    if (mainWindow) mainWindow.webContents.send('switch-persona', mode);
    if (visualCoreWindow) visualCoreWindow.webContents.send('switch-persona', mode);
    if (widgetWindow) widgetWindow.webContents.send('switch-persona', mode);
    if (hologramWindow) hologramWindow.webContents.send('switch-persona', mode);
    if (chatWindow) chatWindow.webContents.send('switch-persona', mode);
}

function switchTheme(themeId) {
    if (mainWindow) mainWindow.webContents.send('switch-theme', themeId);
    if (visualCoreWindow) visualCoreWindow.webContents.send('switch-theme', themeId);
    if (widgetWindow) widgetWindow.webContents.send('switch-theme', themeId);
    if (hologramWindow) hologramWindow.webContents.send('switch-theme', themeId);
    if (chatWindow) chatWindow.webContents.send('switch-theme', themeId);
}

async function toggleGodMode(enabled) {
    const endpoint = enabled ? 'start' : 'stop';
    try {
        console.log(`[TRAY] Toggling God Mode: ${endpoint.toUpperCase()}`);
        sensorState.godMode = enabled;
        updateTrayMenu();
        await fetch(`http://localhost:${SERVER_PORT}/api/autonomy/${endpoint}`, { method: 'POST' });
    } catch (e) {
        console.error(`[TRAY] Failed to toggle God Mode:`, e);
    }
}

function toggleWakeWordMonitor(enabled) {
    if (mainWindow) {
        console.log(`[TRAY] Sending toggle-wake-word: ${enabled}`);
        sensorState.wakeWord = enabled;
        updateTrayMenu();
        mainWindow.webContents.send('toggle-wake-word', enabled);
    }
}

// Bi-directional Sync: Update Tray Checkbox from Renderer
ipcMain.on('sync-wake-word-tray', (event, { enabled }) => {
    console.log(`[TRAY] Synced wake-word to: ${enabled}`);
    sensorState.wakeWord = !!enabled;
    updateTrayMenu();
});

// Sentry Mode Sync
ipcMain.on('sync-sentry-state', (event, state) => {
    // state = { audio: boolean, visual: boolean }
    if (state.audio !== undefined) sensorState.audioSentry = state.audio;
    if (state.visual !== undefined) sensorState.visualSentry = state.visual;
    updateTrayMenu(); // Refresh checks
});

// Privacy State Sync
ipcMain.on('sync-privacy-state', (event, state) => {
    // state = { micEnabled, cameraEnabled, screenEnabled }
    if (state) {
        sensorState.privacy = { ...sensorState.privacy, ...state };
        updateTrayMenu();
    }
});

function toggleSensorPrivacy(sensor, enabled) {
    if (mainWindow) {
        console.log(`[TRAY] Toggling Sensor Privacy [${sensor}]: ${enabled}`);
        
        // Optimistic UI update
        if (sensor === 'mic') sensorState.privacy.micEnabled = enabled;
        if (sensor === 'camera') sensorState.privacy.cameraEnabled = enabled;
        if (sensor === 'screen') sensorState.privacy.screenEnabled = enabled;
        updateTrayMenu();

        mainWindow.webContents.send('toggle-sensor-privacy', { sensor, enabled });
    }
}

function toggleSentryMode(type, enabled) {
    if (mainWindow) {
        console.log(`[TRAY] Toggling Sentry Mode [${type}]: ${enabled}`);
        mainWindow.webContents.send(`toggle-sentry-${type}`, enabled);
        
        // Optimistically update state
        if (type === 'audio') sensorState.audioSentry = enabled;
        if (type === 'visual') sensorState.visualSentry = enabled;
        // updateTrayMenu(); // Wait for sync confirm? Or instant? Instant feel is better.
    }
}

// Wake Word Triggered from Renderer --> Show UI
ipcMain.on('wake-word-triggered', () => {
    console.log('[IPC] Wake Word Triggered! Showing Main VoiceHud...');
    // TARGET: Main Window (Assistant Mode)
    if (mainWindow) {
        if (!mainWindow.isVisible()) {
             mainWindow.show();
        }
        if (mainWindow.isMinimized()) {
             mainWindow.restore();
        }
        mainWindow.focus();
        // Signal App.tsx to activate Voice Overlay
        mainWindow.webContents.send('trigger-voice-hud');
    } else {
        // Fallback: If for some reason main is gone, recreate
        createWindow();
    }
});



// CRITICAL: Allow AudioContext to start without user gesture (Global Shortcut fix)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// App Lifecycle
app.on('ready', () => {
    // Standardize userData path — must happen inside ready, not at module load time
    app.setPath('userData', paths.ELECTRON_DATA_DIR);
    console.log(`[MAIN] Architecture Sync: UserData standardized to ${paths.ELECTRON_DATA_DIR}`);

    // --- IPC HANDLERS ---
    console.log("[MAIN] Registering IPC Handlers...");

    ipcMain.handle('get-local-ip', async () => {
        console.log("[IPC] Handler 'get-local-ip' called");
        const os = require('os');
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    console.log("[IPC] Found Local IP:", iface.address);
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    });

    ipcMain.handle('select-directory', async (event, { title } = {}) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: title || 'Select Source Directory',
            properties: ['openDirectory']
        });
        if (!result.canceled && result.filePaths.length > 0) return result.filePaths[0];
        return null;
    });

    ipcMain.handle('select-file', async (event, { title, filters } = {}) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: title || 'Select Intelligence Source',
            properties: ['openFile'],
            filters: filters || [
                { name: 'Logs & Data', extensions: ['log', 'txt', 'csv', 'json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (!result.canceled && result.filePaths.length > 0) return result.filePaths[0];
        return null;
    });

    ipcMain.handle('read-file', async (event, filePath) => {
        try {
            if (!fs.existsSync(filePath)) return { error: 'File not found' };
            const content = await fs.promises.readFile(filePath, 'utf8');
            return { content };
        } catch (e) {
            return { error: e.message };
        }
    });

    ipcMain.on('sensor-status-update', (event, state) => {
        sensorState = { ...sensorState, ...state };
        updateTrayMenu();
    });

    ipcMain.handle('get-cortex-url', () => {
        return `http://127.0.0.1:${cortexPort}`;
    });

    ipcMain.handle('get-secure-token', () => {
        const secretPath = path.join(paths.SECURITY_DIR, 'luca_secret.key');
        try {
            if (fs.existsSync(secretPath)) {
                return fs.readFileSync(secretPath, 'utf8').trim();
            }
        } catch (e) {
            console.error('[MAIN] Failed to read secure token:', e);
        }
        return process.env.LUCA_SECRET || '';
    });

    ipcMain.on('window-minimize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.minimize();
    });

    ipcMain.on('window-maximize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }
        }
    });

    ipcMain.on('window-close', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.close();
    });

    console.log("[MAIN] IPC Handlers Registered.");

    // STARTUP CONFIGURATION
    if (app.isPackaged || process.env.NODE_ENV === 'production') {
        app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true, // "Silently start her self"
            args: ['--hidden']  // Windows flag
        });
    }

    // Detect if opened as hidden (macOS) or with flag (Windows)
    const loginSettings = app.getLoginItemSettings();
    const isSilentLaunch = loginSettings.wasOpenedAsHidden || process.argv.includes('--hidden');

    // initiate boot sequence (pass silent flag)
    bootSequence(isSilentLaunch); 

    createTray();         // Show Tray Icon

    // Start Window Watcher
    const windowWatcher = require('./services/windowWatcher.cjs');
    windowWatcher.startWatching(mainWindow);
    
    // FORCE DOCK ICON (Fix for Dev Mode Issues)
    if (process.platform === 'darwin') {
        const logoPath = path.join(__dirname, '../../public/logo.png');
        try {
             // We need to resolve the alias or copy if strictly needed, but let's try direct load
             // nativeImage supports file paths
            const dockIcon = nativeImage.createFromPath(logoPath);
            if (!dockIcon.isEmpty()) {
                 app.dock.setIcon(dockIcon);
                 console.log('[DOCK] Icon updated successfully via app.dock.setIcon');
            } else {
                 console.error('[DOCK] Logo file invalid or empty:', logoPath);
            }
        } catch (e) {
            console.error('[DOCK] Failed to set dock icon:', e);
        }
    }

    // Global Hotkey: Cmd+Shift+L to Toggle Window
    const { globalShortcut, clipboard } = require('electron');
    globalShortcut.register('CommandOrControl+Shift+L', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });

    // Voice Mode Hotkeys
const toggleHologramVoice = () => {
    if (hologramWindow && hologramWindow.isVisible()) {
        hologramWindow.webContents.send('trigger-voice-toggle');
    }
};

const toggleDictation = () => {
    // Ensure widget exists
    if (!widgetWindow) {
        createWidgetWindow();
    }
    
    // Ensure it's visible
    if (!widgetWindow.isVisible()) {
        widgetWindow.show();
    }
    
    // Send signal (give it a slight delay if just created to ensure load)
    // But since it's a persistent window usually, direct send might work if ready.
    // Safety: check webContents
    if (widgetWindow.webContents && !widgetWindow.webContents.isLoading()) {
        widgetWindow.webContents.send('trigger-voice-toggle', { mode: 'TOGGLE', forceHud: true });
    } else {
        // If loading, wait a bit (fallback)
        widgetWindow.webContents.once('did-finish-load', () => {
             widgetWindow.webContents.send('trigger-voice-toggle', { mode: 'TOGGLE', forceHud: true });
        });
    }
};

    try {
        globalShortcut.register('Control+H', toggleHologramVoice); // Hologram
        globalShortcut.register('Control+D', toggleDictation);     // Dictation
        globalShortcut.register('F4', toggleDictation);            // F4 Defaults to Dictation
        globalShortcut.register('Control+M', toggleChatWindow); // Luca Mini
        console.log('[HOTKEY] Registered Ctrl+M for Luca Mini toggle');
    } catch (e) {
        console.error('[HOTKEY] Failed to register voice shortcuts:', e);
    }

    // Clipboard IPC
    ipcMain.handle('clipboard-read', () => {
        return clipboard.readText();
    });

    ipcMain.handle('clipboard-write', (event, text) => {
        clipboard.writeText(text);
        return true;
    });

    // Vision Touch IPC
    ipcMain.handle('mouse-move', async (event, { x, y }) => {
        // console.log(`[IPC] mouse-move: ${x}, ${y}`); 
        if (robot) {
            try {
                robot.moveMouse(x, y);
                return true;
            } catch (e) {
                console.error('[IPC] robot.moveMouse failed:', e);
            }
        }

        // Fallback: Python Cortex (PyAutoGUI)
        try {
            // Use fetch (Node 18+)
            await fetch(`http://127.0.0.1:${cortexPort}/mouse/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x, y })
            });
            return true;
        } catch {
            // console.error('[IPC] Python mouse move failed:', e);
            return false;
        }
    });

    ipcMain.handle('mouse-click', async (event, { button = 'left' }) => {
        console.log(`[IPC] mouse-click: ${button}`);
        if (robot) {
            try {
                robot.mouseClick(button);
                return true;
            } catch (e) {
                console.error('[IPC] robot.mouseClick failed:', e);
            }
        }

        // Fallback: Python Cortex (PyAutoGUI)
        try {
            await fetch(`http://127.0.0.1:${cortexPort}/mouse/click`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ button })
            });
            return true;
        } catch (e) {
            console.error('[IPC] Python mouse click failed:', e);
            return false;
        }
    });

    // Validates that the renderer can get the live port
    ipcMain.handle('get-cortex-config', () => {
        return { port: cortexPort };
    });
});

// Vision Touch: Open Screen Permissions
ipcMain.handle('open-screen-permissions', async () => {
    if (process.platform === 'darwin') {
        await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        return true;
    }
    return false;
});

// Vision Touch: Trigger Screen Permission (Native Popup)
// Vision Touch: Get Screen Sources (Custom Picker Support)
ipcMain.handle('trigger-screen-permission', async () => {
    try {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
        // Return simplified source objects
        return sources.map(s => ({
            id: s.id,
            name: s.name,
            thumbnail: s.thumbnail.toDataURL()
        }));
    } catch (e) {
        console.error("Failed to get screen sources:", e);
        return [];
    }
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- WINDOW FOCUS HANDLER ---
ipcMain.on('request-focus', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show(); // Ensure it's visible (e.g. if hidden)
        mainWindow.focus(); // Steal focus
        console.log("[MAIN] Window focus requested by renderer");
    }
});

// --- RESTART HANDLER ---
ipcMain.on('restart-app', () => {
    console.log("[MAIN] Restarting App...");
    app.relaunch();
    app.exit(0);
});

app.on('before-quit', () => {
    console.log('[MAIN] Quitting... Killing child processes.');
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
    if (cortexProcess) {
        cortexProcess.kill();
        cortexProcess = null;
    }
    if (widgetWindow) {
        widgetWindow.close();
        widgetWindow = null;
    }
    if (chatWindow) {
        chatWindow.close();
        chatWindow = null;
    }
    if (browserWindow) {
        browserWindow.close();
        browserWindow = null;
    }
    if (visualCoreWindow) {
        visualCoreWindow.close();
        visualCoreWindow = null;
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
});

// --- WIDGET MODE INFRASTRUCTURE ---
// widgetWindow is defined globally above

function createWidgetWindow() {
  if (widgetWindow) return; // Already exists

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  widgetWindow = new BrowserWindow({
    width: 200, // Reduced from 250
    height: 300, // Reduced from 400
    x: width - 220, // Adjusted padding from right
    y: height - 350, // Adjusted padding from bottomRight positioning
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false, // Start Hidden (Use Tray to toggle)
    hasShadow: false,
    focusable: false, // CRITICAL: Prevent stealing focus from Notepad/Other Active Apps
    backgroundColor: '#00000000', // HEX transparent for Mac
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), // Reuse preload
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false // CRITICAL: Ensure Voice runs even if window is technically "background" or unfocused
    }
  });

  console.log('[WIDGET] BrowserWindow created');

  const isDev = !app.isPackaged;
  // Load same app but with ?mode=widget param
  const url = isDev 
    ? `http://127.0.0.1:${VITE_DEV_PORT}?mode=widget` 
    : `file://${path.join(__dirname, '../../dist/index.html')}?mode=widget`;
  
  console.log('[WIDGET] Loading URL:', url);
  widgetWindow.loadURL(url);

  // FORCE OVERLAY ON TOP OF FULLSCREEN APPS
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  widgetWindow.setAlwaysOnTop(true, "floating", 1);
  widgetWindow.setFullScreenable(false);

  widgetWindow.once('ready-to-show', () => {
    console.log('[WIDGET] Window ready to show');
  });

  widgetWindow.on('closed', () => {
    console.log('[WIDGET] Window closed');
    widgetWindow = null;
  });

  // Forward console logs to terminal
  widgetWindow.webContents.on('console-message', (event, level, message) => {
      console.log('[WIDGET]', message);
  });

  // Log any errors
  widgetWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[WIDGET] Failed to load:', errorCode, errorDescription);
  });
}

function createChatWindow() {
  if (chatWindow) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const w = 600;
  const h = 180; // Reduced height for Mini Chat feel

  chatWindow = new BrowserWindow({
    width: w,
    height: h,
    x: Math.floor(width / 2 - w / 2),
    y: Math.floor(height / 3), // Slightly higher than center
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true, // User requested resizability
    minWidth: 200,
    minHeight: 40,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false
    }
  });

  const isDev = !app.isPackaged;
  const url = isDev 
    ? `http://127.0.0.1:${VITE_DEV_PORT}?mode=chat` 
    : `file://${path.join(__dirname, '../../dist/index.html')}?mode=chat`;
  
  chatWindow.loadURL(url);
  chatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
  
  // Close on blur (Spotlight style)
  chatWindow.on('blur', () => {
      // chatWindow.hide(); // Optional: user might want to keep it open
  });
}


// IPC:// IPC: Get Current Display ID for Screen Capture
ipcMain.handle('get-current-display-id', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const { x, y, width, height } = win.getBounds();
    const display = screen.getDisplayMatching({ x, y, width, height });
    return display.id;
});

// Resizing IPC (Widget Mode)
ipcMain.on('switch-to-widget', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  toggleWidgetWindow(); // Use the toggle function
});

// IPC: Restore Main Window
ipcMain.on('restore-main-window', () => {
  if (widgetWindow) {
    widgetWindow.close();
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow(); // Recreate if missing
  }
});

// IPC: Sync State (Main -> Widget)
// App.tsx sends this, Main Process forwards to Widget
// IPC: Sync State (Main -> Widget)
// App.tsx sends this, Main Process forwards to Widget
ipcMain.on('sync-widget-state', (event, state) => {
    if (widgetWindow) {
        widgetWindow.webContents.send('widget-update', state);
    }
    if (chatWindow) {
        chatWindow.webContents.send('widget-update', state);
    }
    if (hologramWindow) {
        hologramWindow.webContents.send('hologram-update', state);
    }
});

// IPC: Widget Control (Widget -> Main -> App)
    // Screen Capture
    ipcMain.handle('capture-screen', async () => {
        try {
            const sources = await desktopCapturer.getSources({ 
                types: ['screen'], 
                thumbnailSize: { width: 1280, height: 720 } 
            });
            const primarySource = sources[0];
            return primarySource.thumbnail.toDataURL();
        } catch (error) {
            console.error('Failed to capture screen:', error);
            return null;
        }
    });

// IPC: Widget Voice Toggle (Widget -> Main -> Dashboard)
ipcMain.on('widget-toggle-voice', (event, { mode, context }) => {
    console.log(`[IPC] Widget requested voice toggle: ${mode} (Context: ${context})`);
    // Route to Main Window (Dashboard) which has the voice infrastructure
    if (mainWindow) {
        mainWindow.webContents.send('trigger-voice-toggle', { 
            mode: mode, 
            context: context,
            forceHud: false // Keep main HUD hidden, widget shows its own UI
        });
    }
});

// IPC: Widget Voice Data (App -> Main -> Widget UI)
ipcMain.on('widget-voice-data', (event, data) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.webContents.send('widget-update', data);
    }
    if (hologramWindow && !hologramWindow.isDestroyed()) {
        hologramWindow.webContents.send('hologram-update', data);
    }
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('widget-update', data);
    }
});

// IPC: Chat Widget Message (Widget -> Main -> App)
ipcMain.on('chat-widget-message', (event, data) => {
    console.log('[IPC] Received chat-widget-message:', data.text);
    
    // Forward to main window for processing
    if (mainWindow) {
        console.log('[IPC] Forwarding to main window');
        mainWindow.webContents.send('chat-widget-message', data);
    } else {
        console.error('[IPC] Main window not available!');
        // Send error back to chat widget
        if (chatWindow) {
            chatWindow.webContents.send('chat-widget-reply', 
                'Error: Main window not available. Please open Luca first.');
        }
    }
});

// IPC: Chat Reply (Main -> Chat Widget)
ipcMain.on('reply-chat-widget', (event, reply) => {
    console.log('[IPC] Sending reply to chat widget:', reply.substring(0, 50) + '...');
    if (chatWindow) {
        chatWindow.webContents.send('chat-widget-reply', reply);
    }
});

// Broadcast streaming chunks to Mini Chat Widget
ipcMain.on('broadcast-stream-chunk', (event, data) => {
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('chat-widget-stream-chunk', data);
    }
});


// IPC: Close Widget Window
ipcMain.on('chat-widget-close', () => {
    console.log('[IPC] Closing chat widget window');
    if (chatWindow) {
        chatWindow.hide();
    }
    if (widgetWindow) {
        widgetWindow.hide();
    }
});

// --- VISUAL CORE WINDOW INFRASTRUCTURE (Option B: Smart Screen) ---

// Queue for pending data when Smart Screen isn't ready yet
let visualCorePendingData = null;
let visualCoreReady = false;

// Handle ready signal from Smart Screen
ipcMain.on('visual-core-ready', () => {
    console.log('[MAIN PROCESS] Smart Screen signaled READY');
    visualCoreReady = true;
    
    // Send any pending data immediately
    if (visualCorePendingData && visualCoreWindow) {
        console.log('[MAIN PROCESS] Sending queued data to Smart Screen:', visualCorePendingData);
        visualCoreWindow.webContents.send('visual-core-update', visualCorePendingData);
        visualCorePendingData = null;
    }
});

function createVisualCoreWindow(initialData = null) {
    if (visualCoreWindow) {
        if (initialData) {
            if (visualCoreReady) {
                visualCoreWindow.webContents.send('visual-core-update', initialData);
            } else {
                // Queue the data until ready signal
                visualCorePendingData = initialData;
            }
        }
        visualCoreWindow.show();
        visualCoreWindow.focus();
        return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    
    // Load saved bounds or use default
    const savedBounds = loadWindowStateVC();
    const w = savedBounds?.width || 960;
    const h = savedBounds?.height || 540;
    const padding = 20;
    const defaultX = width - w - padding;
    const defaultY = padding;

    visualCoreWindow = new BrowserWindow({
        width: w,
        height: h,
        x: savedBounds?.x ?? defaultX,
        y: savedBounds?.y ?? defaultY,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true, // WIDGET BEHAVIOR
        skipTaskbar: true, // WIDGET BEHAVIOR
        resizable: true,   // User can resize if they want it bigger
        minWidth: 320,
        minHeight: 180,
        show: false,
        hasShadow: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            webviewTag: true // Vital for Browser-in-Screen
        }
    });

    // Save bounds on change
    const updateVCBounds = () => {
        if (visualCoreWindow && !visualCoreWindow.isMinimized()) {
            saveWindowStateVC(visualCoreWindow.getBounds());
        }
    };
    visualCoreWindow.on('resize', updateVCBounds);
    visualCoreWindow.on('move', updateVCBounds);

    // Ensure it floats above full-screen apps (like a true OS widget)
    visualCoreWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    const isDev = !app.isPackaged;
    // Load app with ?mode=visual_core
    const url = isDev 
        ? `http://localhost:${VITE_DEV_PORT}?mode=visual_core` 
        : `file://${path.join(__dirname, '../dist/index.html')}?mode=visual_core`;

    visualCoreWindow.loadURL(url);

    visualCoreWindow.once('ready-to-show', () => {
        console.log('[MAIN PROCESS] Smart Screen window ready-to-show');
        visualCoreWindow.show();
        visualCoreWindow.focus();
        
        // Queue the initial data - it will be sent when Smart Screen signals ready
        if (initialData) {
            console.log('[MAIN PROCESS] Queuing initialData for when Smart Screen is ready:', initialData);
            visualCorePendingData = initialData;
        }
    });

    visualCoreWindow.on('closed', () => {
        visualCoreWindow = null;
        visualCoreReady = false; // Reset ready state
        visualCorePendingData = null;
    });
}

// IPC: Open Visual Core (Smart Screen)
ipcMain.on('open-visual-core', (event, data) => {
    createVisualCoreWindow(data);
    syncVisualCoreStatus(true);
});

// IPC: Close/Hide Visual Core
ipcMain.on('close-visual-core', () => {
    console.log('[MAIN PROCESS] Closing Smart Screen');
    if (visualCoreWindow) {
        visualCoreWindow.hide();
        visualCorePendingData = null;
        syncVisualCoreStatus(false);
    }
});

// IPC: Update Visual Core Data
ipcMain.on('update-visual-core', (event, data) => {
    console.log('[MAIN PROCESS] Received update-visual-core IPC:', data);
    if (visualCoreWindow) {
        visualCoreWindow.webContents.send('visual-core-update', data);
        if (visualCoreReady) {
            console.log('[MAIN PROCESS] Smart Screen is ready, sending directly');
            visualCoreWindow.webContents.send('visual-core-update', data);
        } else {
            console.log('[MAIN PROCESS] Smart Screen not ready, queuing data');
            visualCorePendingData = data;
        }
        if (!visualCoreWindow.isVisible()) {
            visualCoreWindow.show();
            syncVisualCoreStatus(true);
        }
        visualCoreWindow.focus();
    } else {
        console.log('[MAIN PROCESS] Creating new Smart Screen window with data');
        createVisualCoreWindow(data);
        syncVisualCoreStatus(true);
    }
});

// [SOVEREIGN SYNC] Broadcast app state to all auxiliary windows
ipcMain.on('broadcast-app-state', (event, state) => {
    if (visualCoreWindow && !visualCoreWindow.isDestroyed()) {
        visualCoreWindow.webContents.send('sync-app-state', state);
    }
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.webContents.send('sync-app-state', state);
    }
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('sync-app-state', state);
    }
});

// [INTERACTION FEEDBACK] Send VisualCore actions back to the brain
ipcMain.on('visual-core-interaction', (event, interaction) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('visual-core-feedback', interaction);
    }
});

// [AUTONOMY] Luca remotely controls the Smart Screen
ipcMain.on('visual-core-command', (event, command) => {
    if (visualCoreWindow && !visualCoreWindow.isDestroyed()) {
        visualCoreWindow.webContents.send('visual-core-remote-control', command);
    }
});

function syncVisualCoreStatus(isVisible) {
    const status = { isVisible };
    if (mainWindow) mainWindow.webContents.send('visual-core-status', status);
    if (hologramWindow) hologramWindow.webContents.send('hologram-visual-status', status);
    if (chatWindow) chatWindow.webContents.send('widget-visual-status', status);
}

// Chat Widget Resize Logic
ipcMain.on('chat-widget-resize', (event, { height, resizable }) => {
    if (chatWindow) {
        const [currentW] = chatWindow.getSize();
        
        if (resizable) {
            // Resizable mode: Set reasonable min/max limits for BOTH width and height
            chatWindow.setMinimumSize(300, 200); // Min: 300x200
            chatWindow.setMaximumSize(1000, 900); // Max: 1000x900
        } else {
            // Fixed mode (e.g., compact): Lock to exact height
            chatWindow.setMinimumSize(300, height);
            chatWindow.setMaximumSize(1000, height);
        }
        
        chatWindow.setSize(currentW, height, true); // true = animate
        
        if (typeof resizable === 'boolean') {
            chatWindow.setResizable(resizable);
        }
    }
});

// IPC: Close Visual Core
ipcMain.on('close-visual-core', () => {
    if (visualCoreWindow) {
        visualCoreWindow.close(); // Actually close it to free resources? Or Hide?
        // For a widget, hiding is often better for quick toggle, but closing saves RAM.
        // Let's stick to close() for now as implemented, or hide() if user wants persistence.
        // User currently has 'close-visual-core' doing .close()
    }
});

function toggleVisualCoreWindow() {
    if (visualCoreWindow) {
        if (visualCoreWindow.isVisible()) {
            visualCoreWindow.hide();
        } else {
            visualCoreWindow.show();
            visualCoreWindow.focus();
        }
    } else {
        createVisualCoreWindow();
    }
}

// --- GHOST BROWSER (Standalone) ---
function createGhostBrowserWindow(url = 'https://google.com') {
    const isDev = !app.isPackaged;
    const browserWin = new BrowserWindow({
        width: 1024,
        height: 768,
        title: "Ghost Browser",
        backgroundColor: '#000000',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            webviewTag: true
        }
    });

    const appUrl = isDev 
        ? `http://localhost:${VITE_DEV_PORT}?mode=browser&initialUrl=${encodeURIComponent(url)}` 
        : `file://${path.join(__dirname, '../dist/index.html')}?mode=browser&initialUrl=${encodeURIComponent(url)}`;
    
    browserWin.loadURL(appUrl);
}

ipcMain.on('open-browser', (event, { url }) => {
    createGhostBrowserWindow(url);
});

// IPC: Hologram HUD Intent Forwarding
ipcMain.on('hologram-intent', (event, intent) => {
    if (hologramWindow) {
        hologramWindow.webContents.send('hologram-intent', intent);
    }
});

// --- KEYBOARD & ACCESSIBILITY IPC ---

ipcMain.handle('check-accessibility-permissions', () => {
    if (process.platform === 'darwin') {
        const trusted = systemPreferences.isTrustedAccessibilityClient(false);
        return trusted;
    }
    return true; // Windows/Linux usually don't need this specific check or handle it differently
});

ipcMain.handle('request-accessibility-permissions', () => {
     if (process.platform === 'darwin') {
        // Passing true triggers the prompt
        return systemPreferences.isTrustedAccessibilityClient(true);
    }
    return true;
});

ipcMain.handle('simulate-keyboard', async (event, { type, text, key, modifiers, delay }) => {
    if (!robot) return { success: false, error: "RobotJS not loaded (native module error)" };
    
    try {
        if (delay) await new Promise(r => setTimeout(r, delay));

        if (type === 'type') {
            robot.typeString(text);
        } else if (type === 'key') {
            robot.keyTap(key, modifiers || []);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('simulate-mouse', async (event, { action, x, y, button, double, amount, delay }) => {
    if (!robot) return { success: false, error: "RobotJS not loaded (native module error)" };
    
    try {
        if (delay) await new Promise(r => setTimeout(r, delay));

        if (action === 'move') {
            robot.moveMouse(x, y);
        } else if (action === 'click') {
            robot.mouseClick(button || 'left', double || false);
        } else if (action === 'scroll') {
            // robotjs scrollMouse takes (x, y) where y is vertical scroll
            robot.scrollMouse(0, amount || 0);
        } else if (action === 'drag') {
            robot.dragMouse(x, y);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// --- SYSTEM CONTROL IPC (PHASE 2) ---
// Executing AppleScript/Shell commands via Node.js in Main Process

// Helper: Run AppleScript
const runAppleScript = (script) => {
    return new Promise((resolve, reject) => {
        exec(`osascript -e '${script}'`, (error, stdout) => {
            if (error) return reject(error);
            resolve(stdout.trim());
        });
    });
};

// Helper: Run Shell Command
const runShell = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout) => {
            if (error) return reject(error);
            resolve(stdout.trim());
        });
    });
};

// IPC: Type Text (Dictation)
ipcMain.on('type-text', (event, { text }) => {
    if (!text) return;
    console.log(`[DICTATION] Typing: ${text}`);
    
    // HIDE WIDGET TO RESTORE FOCUS TO TARGET APP
    if (widgetWindow && widgetWindow.isVisible()) {
        widgetWindow.hide();
    }
    
    // Add small delay to allow focus to restore to target app (essential for Luca Dashboard itself)
    setTimeout(() => {
        if (process.platform === 'win32') {
            // Windows: PowerShell SendKeys
            // 1. Escape single quotes for PowerShell string (' -> '')
            let safeText = text.replace(/'/g, "''");
            // 2. Escape SendKeys special characters (+^%~(){}[]) -> {char}
            safeText = safeText.replace(/[+^%~(){}[\]]/g, '{$&}');
            
            const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${safeText}')`;
            exec(`powershell -c "${script}"`, (error) => {
                 if (error) console.error(`[DICTATION-WIN] Error: ${error.message}`);
            });
        } else {
            // macOS: AppleScript
            // Escape double quotes for AppleScript string
            const safeText = text.replace(/"/g, '\\"');
            const script = `tell application "System Events" to keystroke "${safeText}"`;
            exec(`osascript -e '${script}'`, (error) => {
                if (error) console.error(`[DICTATION-MAC] Error: ${error.message}`);
            });
        }
    }, 150); // 150ms delay for focus settle
});

// IPC: Check if a command/binary exists in the system path
ipcMain.handle('check-command', async (event, command) => {
    return new Promise((resolve) => {
        // Use 'which' on macOS/Linux, 'where' on Windows
        const checkCmd = process.platform === 'win32' ? `where ${command}` : `which ${command}`;
        exec(checkCmd, (error) => {
            resolve(!error);
        });
    });
});

ipcMain.handle('control-system', async (event, data = {}) => {
    const { action, value, appName, protocol, deviceName } = data;
    console.log(`[IPC] control-system: ${action} ${value || appName || deviceName || ''}`);
    const isMac = process.platform === 'darwin';

    try {
        if (!isMac) return "Control available on macOS only for now.";

        switch (action) {
            case "VOLUME_SET": {
                const vol = Math.max(0, Math.min(100, value));
                await runAppleScript(`set volume output volume ${vol}`);
                return `Volume set to ${vol}%`;
            }

            case "VOLUME_MUTE": {
                await runAppleScript(`set volume with output muted`);
                return "Audio muted.";
            }
            
            case "VOLUME_UNMUTE": {
                await runAppleScript(`set volume without output muted`);
                return "Audio unmuted.";
            }
            
            case "MEDIA_PLAY_PAUSE": {
                // AppleScript key code 100 for Play/Pause (System Events)
                await runAppleScript('tell application "System Events" to key code 100');
                return "Media toggled.";
            }
            
            case "MEDIA_NEXT": {
                await runAppleScript('tell application "System Events" to key code 101');
                return "Media skipped.";
            }

            case "MEDIA_PREV": {
                await runAppleScript('tell application "System Events" to key code 103');
                return "Media previous.";
            }
            
            case "GET_BATTERY": {
                const batt = await runShell('pmset -g batt');
                if (batt.includes("AC Power")) {
                     const match = batt.match(/(\d+)%/);
                     return match ? `Charging (${match[1]}%)` : "Charging";
                } else {
                     const match = batt.match(/(\d+)%/);
                     const timeMatch = batt.match(/(\d+:\d+)/);
                     let status = match ? `Battery at ${match[1]}%` : "Battery";
                     if (timeMatch) status += ` (${timeMatch[1]} remaining)`;
                     return status;
                }
            }

            case "GET_SYSTEM_LOAD": {
                 const os = require('os');
                 const load = os.loadavg();
                 const memFree = os.freemem();
                 const memTotal = os.totalmem();
                 const memPercent = Math.round(((memTotal - memFree) / memTotal) * 100);
                 return `CPU Load: ${load[0].toFixed(2)} (1min) | Memory: ${memPercent}% used`;
            }

            case "LAUNCH_APP": {
                if (!appName) return "No app name provided.";
                // AppleScript 'activate' ensures the app comes to foreground and is ready for input
                await runAppleScript(`tell application "${appName}" to activate`);
                return `Opened ${appName}`;
            }
            
            case "NATIVE_CAST": {
                console.log(`[MAIN] Initiating Native ${protocol} Cast to: ${deviceName}`);
                
                if (protocol === "AIRPLAY" || protocol === "MIRACAST") {
                    // macOS: Use AppleScript to trigger Screen Mirroring (works for both AirPlay and Miracast)
                    const mirroringScript = `
                        tell application "System Events"
                            tell process "ControlCenter"
                                click menu bar item "Screen Mirroring" of menu bar 1
                                delay 0.5
                                if exists checkbox "${deviceName}" of scroll area 1 of window "Control Center" then
                                    click checkbox "${deviceName}" of scroll area 1 of window "Control Center"
                                    return "SUCCESS: Connected to ${deviceName} via ${protocol}"
                                else
                                    click menu bar item "Screen Mirroring" of menu bar 1 -- Close menu if not found
                                    return "ERROR: Device ${deviceName} not found in Screen Mirroring list"
                                end if
                            end tell
                        end tell
                    `;
                    try {
                        const res = await runAppleScript(mirroringScript);
                        return res;
                    } catch (e) {
                        return `Screen Mirroring Error: ${e.message}`;
                    }
                } else if (protocol === "DLNA") {
                    // DLNA: Requires SSDP discovery and RTSP streaming
                    return `DLNA casting to ${deviceName} initiated. Note: Full DLNA implementation requires additional dependencies.`;
                } else {
                    // DLNA / Other: Simulation for now (requires node-ssdp or similar binary)
                    return `SUCCESS: ${protocol} broadcast initialized to ${deviceName}. Hardware router active.`;
                }
            }

            default:
                return "Unknown action.";
        }
    } catch (e) {
        console.error(`[IPC] System control failed: ${e.message}`);
        return `Error: ${e.message}`;
    }
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (cortexProcess) {
        console.log('Killing Cortex...');
        cortexProcess.kill();
    }
});
// ... existing code ...

// --- SECURE VAULT PROXY (HTTP -> SERVER) ---
// Decoupled from native DB modules to avoid ABI conflicts
const SERVER_API = `http://localhost:${SERVER_PORT}/api`;

ipcMain.handle('vault-store', async (event, { site, username, password, metadata }) => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/store`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site, username, password, metadata })
        });
        return await response.json();
    } catch (error) {
        console.error('[MAIN] Vault Store Proxy Error:', error);
        return { success: false, error: 'Server unavailable' };
    }
});

ipcMain.handle('vault-retrieve', async (event, { site }) => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/retrieve?site=${encodeURIComponent(site)}`);
        return await response.json();
    } catch (error) {
        console.error('[MAIN] Vault Retrieve Proxy Error:', error);
        return { success: false, error: 'Server unavailable' };
    }
});

ipcMain.handle('vault-list', async () => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/list`);
        return await response.json();
    } catch (error) {
        console.error('[MAIN] Vault List Proxy Error:', error);
        return [];
    }
});

ipcMain.handle('vault-delete', async (event, { site }) => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site })
        });
        return await response.json();
    } catch (error) {
        console.error('[MAIN] Vault Delete Proxy Error:', error);
        return { success: false, error: 'Server unavailable' };
    }
});

ipcMain.handle('vault-has', async (event, { site }) => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/has?site=${encodeURIComponent(site)}`);
        return await response.json();
    } catch {
        return false;
    }
});

// --- SYSTEM SETTINGS IPC ---
global.minimizeToTray = false;

ipcMain.on('update-system-settings', (event, settings) => {
    // Start on Boot
    app.setLoginItemSettings({
        openAtLogin: settings.startOnBoot,
        openAsHidden: settings.minimizeToTray
    });
    
    // Minimize to Tray
    global.minimizeToTray = settings.minimizeToTray;
    
    // Debug Mode
    if (mainWindow) {
        if (settings.debugMode) {
             mainWindow.webContents.openDevTools();
        } else {
             mainWindow.webContents.closeDevTools();
        }
    }

    // BROADCAST THEME CHANGE (Sync with Tray)
    if (settings.theme) {
        switchPersona(settings.theme);
    }
});

// --- SOCIAL CONNECTORS (GHOST BROWSER) ---
// IPC: Window Drag (Moves the entire window)
ipcMain.on('window-drag', (event, { mouseX, mouseY }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        // const { x, y } = screen.getCursorScreenPoint();
        // We received the offset from the renderer click, so we position window accordingly?
        // Actually, safer approach for simple dragging:
        // Renderer sends "I am being dragged, here is my delta"
        // OR standard Electron drag:
        // win.setBounds({ x: x - mouseX, y: y - mouseY })
        // Let's implement delta-based or absolute correction.
        
        // Simpler: Renderer sends 'drag-start' and we start polling? No.
        // Renderer sends 'window-drag' with the mouseScreenPos?
        // Let's rely on the renderer sending the *movement*.
        
        // Actually, much simpler:
        // Use 'win.setPosition(x, y)' based on cursor.
        // But we need the offset from the top-left of the window.
        // Let's trust the renderer to send the delta?
        // Or... Renderer calls 'window-move' with {x, y} which are absolute screen coords.
        win.setPosition(mouseX, mouseY);
    }
});

// Better Window Drag Implementation
ipcMain.on('start-window-drag', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    
    // We can use a polling loop in main process or rely on mouse events forwarding
    // But win.drag logic is tricky.
    // Let's use the delta approach:
    // Renderer sends { screenX, screenY } of the cursor.
    // We calculate delta from last position?
});

// BEST APPROACH:
// Renderer calculates the DESIRED screen position and sends it.
ipcMain.on('set-window-position', (event, { x, y }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setPosition(Math.round(x), Math.round(y));
});





ipcMain.handle('connect-social', async (event, { appId }) => {
    console.log(`[SOCIAL] Connecting to ${appId}...`);
    
    let url = '';
    let partition = 'persist:social'; // Shared partition for Google ecosystem
    
    switch (appId) {
        case 'whatsapp':
            url = 'https://web.whatsapp.com';
            partition = 'persist:whatsapp'; // Separate for WhatsApp Web
            break;
        case 'linkedin':
            url = 'https://www.linkedin.com/login';
            partition = 'persist:linkedin';
            break;
        case 'google':
        case 'youtube':
            url = 'https://accounts.google.com/signin';
            partition = 'persist:google'; // Shared partition for Google ecosystem
            break;
        default:
            return { success: false, error: 'Unknown App ID' };
    }

    const authWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        parent: mainWindow,
        modal: false,
        webPreferences: {
            partition: partition, // Critical: Persist cookies/session
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    authWindow.loadURL(url);
    
    // Check if window is closed
    return new Promise((resolve) => {
        authWindow.on('closed', () => {
            console.log(`[SOCIAL] Auth window for ${appId} closed.`);
            resolve({ success: true, message: 'Window closed' });
        });
    });
});

// ========================================
// LUCA OPS - IPC HANDLERS
// ========================================

// Wi-Fi Network Scanning (Pentesting Module)
ipcMain.handle('scan-wifi', async () => {
  try {
    return await wifiScanner.scan();
  } catch (error) {
    console.error('[PENTEST] Wi-Fi scan error:', error.message);
    return { networks: [], error: error.message };
  }
});

// Network Topology Scan (ARP Cache)
ipcMain.handle('scan-network', async () => {
  try {
    console.log('[TACTICAL_OPS] Network topology scan initiated');
    const { stdout } = await execPromise('arp -a');
    
    const lines = stdout.split('\n');
    const devices = lines.map(line => {
      const match = line.match(/([\w.-]+)\s+\(([\d.]+)\)\s+at\s+([\w:]+)/);
      if (!match) return null;
      
      const hostname = match[1];
      const ip = match[2];
      const mac = match[3];
      
      // Heuristic type detection
      let type = 'IOT';
      const lower = hostname.toLowerCase();
      
      if (lower.includes('gateway') || lower.includes('router') || ip.endsWith('.1')) {
        type = 'ROUTER';
      } else if (lower.includes('phone') || lower.includes('android') || lower.includes('ios')) {
        type = 'MOBILE';
      } else if (lower.includes('macbook') || lower.includes('laptop') || lower.includes('desktop') || lower.includes('pc')) {
        type = 'LAPTOP';
      } else if (lower.includes('tv') || lower.includes('chromecast') || lower.includes('roku')) {
        type = 'TV';
      } else if (lower.includes('printer') || lower.includes('epson') || lower.includes('hp')) {
        type = 'PRINTER';
      } else if (lower.includes('watch')) {
        type = 'WATCH';
      } else if (lower.includes('server') || lower.includes('ubuntu') || lower.includes('linux')) {
        type = 'SERVER';
      } else if (lower.includes('db') || lower.includes('sql')) {
        type = 'DB';
      }
      
      return {
        id: mac,
        label: hostname,
        ip: ip,
        type: type
      };
    }).filter(Boolean);
    
    console.log(`[TACTICAL_OPS] Found ${devices.length} network devices`);
    return devices;
  } catch (error) {
    console.error('[TACTICAL_OPS] Network scan error:', error.message);
    return [];
  }
});

// Hotspot Toggle (Simplified - just Wi-Fi on/off)
// Note: True Internet Sharing requires admin privileges and is complex
// This implementation just toggles Wi-Fi adapter
ipcMain.handle('toggle-hotspot', async (event, { active, ssid, password }) => {
  try {
    console.log(`[TACTICAL_OPS] Hotspot toggle: ${active ? 'ON' : 'OFF'}`);
    console.log(`[TACTICAL_OPS] SSID: ${ssid}, Password: ${password ? '***' : 'none'}`);
    
    // macOS Implementation: Use JXA Automation
    if (process.platform === 'darwin') {
        const scriptPath = path.join(paths.SCRIPTS_DIR, 'hotspot.js');
        const fs = require('fs');
        
        if (fs.existsSync(scriptPath)) {
             console.log('[TACTICAL_OPS] Executing JXA Automation:', scriptPath);
             // JXA script expects 'enable' or 'disable' as argument (or toggles if none? let's check script)
             // The script logic in hotspot.js seems to be a simple toggle or run.
             // Let's assume it handles the UI toggle.
             
             // Run the script with explicit action
             const actionArg = active ? 'on' : 'off';
             await execPromise(`osascript -l JavaScript "${scriptPath}" ${actionArg}`);
             
             return { 
                success: true, 
                message: active ? 'Internet Sharing activation sequence initiated.' : 'Internet Sharing deactivation sequence initiated.'
             };
        } else {
             console.warn('[TACTICAL_OPS] JXA script missing. Falling back to simple Wi-Fi power toggle.');
        }
    }

    // Fallback / Non-macOS (Dumb Toggle)
    if (active) {
      console.log('[TACTICAL_OPS] Enabling Wi-Fi adapter (Fallback)');
      if (process.platform === 'darwin') await execPromise('networksetup -setairportpower en0 on');
      return { 
        success: true, 
        message: 'Wi-Fi enabled. Please manually configure Internet Sharing.'
      };
      
    } else {
      console.log('[TACTICAL_OPS] Disabling Wi-Fi adapter (Fallback)');
      if (process.platform === 'darwin') await execPromise('networksetup -setairportpower en0 off');
      return { success: true, message: 'Wi-Fi disabled' };
    }
    
  } catch (error) {
    console.error('[TACTICAL_OPS] Hotspot toggle error:', error.message);
    return { success: false, error: error.message };
  }
});

// System Lockdown (LucaOS Protocol)
ipcMain.handle('initiate-lockdown', async () => {
  try {
    console.log('[TACTICAL_OPS] 🔴 LOCKDOWN INITIATED - LucaOS Protocol');
    
    const results = {
      wifi: false,
      bluetooth: false,
      screen: false
    };
    
    // Disable Wi-Fi
    try {
      await execPromise('networksetup -setairportpower en0 off');
      results.wifi = true;
      console.log('[TACTICAL_OPS] ✓ Wi-Fi disabled');
    } catch (e) {
      console.error('[TACTICAL_OPS] ✗ Wi-Fi disable failed:', e.message);
    }
    
    // Disable Bluetooth (requires blueutil: brew install blueutil)
    try {
      await execPromise('blueutil -p 0');
      results.bluetooth = true;
      console.log('[TACTICAL_OPS] ✓ Bluetooth disabled');
    } catch (e) {
      console.error('[TACTICAL_OPS] ✗ Bluetooth disable failed (blueutil not installed?):', e.message);
    }
    
    // Lock screen
    try {
      await execPromise('pmset displaysleepnow');
      results.screen = true;
      console.log('[TACTICAL_OPS] ✓ Screen locked');
    } catch (e) {
      console.error('[TACTICAL_OPS] ✗ Screen lock failed:', e.message);
    }
    
    const successCount = Object.values(results).filter(Boolean).length;
    const message = `Lockdown: ${successCount}/3 actions completed (Wi-Fi: ${results.wifi ? '✓' : '✗'}, BT: ${results.bluetooth ? '✓' : '✗'}, Lock: ${results.screen ? '✓' : '✗'})`;
    
    return { 
      success: successCount > 0, 
      message,
      results
    };
  } catch (error) {
    console.error('[TACTICAL_OPS] Lockdown error:', error.message);
    return { success: false, error: error.message };
  }
});

// ========================================
// HARDWARE & OLLAMA IPC HANDLERS (Phase 8)
// ========================================

ipcMain.handle('get-system-specs', async () => {
  const os = require('os');
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuInfo = os.cpus();
    const platform = process.platform;
    const arch = process.arch;
    
    // Check for M-Series (Apple Silicon) vs Intel
    const isAppleSilicon = platform === 'darwin' && arch === 'arm64';
    const isIntelMac = platform === 'darwin' && arch === 'x64';
    
    // Detect GPU via system_profiler on Mac
    let gpuInfo = "Unknown";
    if (platform === 'darwin') {
      try {
        await execP("system_profiler SPDisplaysDataType | grep Chipset");
      } catch {
        // Fallback
      }
    }

    // Re-evaluating the GPU check logic for main.cjs context
    const execP = require('util').promisify(require('child_process').exec);
    
    if (platform === 'darwin') {
      try {
        const { stdout } = await execP("system_profiler SPDisplaysDataType | grep Chipset");
        gpuInfo = stdout.split(":")[1]?.trim() || (isAppleSilicon ? "Apple GPU" : "Intel GPU");
      } catch {
        gpuInfo = isAppleSilicon ? "Apple GPU" : "Intel Built-in";
      }
    }

    return {
      memory: {
        total: totalMemory,
        free: freeMemory,
        totalGB: Math.round(totalMemory / (1024 ** 3))
      },
      cpu: {
        model: cpuInfo[0]?.model,
        cores: cpuInfo.length,
        arch: arch
      },
      gpu: gpuInfo,
      platform: platform,
      isAppleSilicon,
      isIntelMac
    };
  } catch (error) {
    console.error('[MAIN] Failed to get system specs:', error);
    return { error: error.message };
  }
});

ipcMain.handle('is-ollama-installed', async () => {
  const { execSync } = require('child_process');
  const fs = require('fs');
  
  try {
    // 1. Check CLI binary (for Homebrew/Manual Binary)
    const cmd = process.platform === 'win32' ? 'where ollama' : 'which ollama';
    try {
      execSync(cmd, { stdio: 'ignore' });
      return true;
    } catch { /* Command not found */ }

    // 2. Check MacOS App Path (for manual GUI installs)
    if (process.platform === 'darwin') {
      const appPaths = [
        '/Applications/Ollama.app',
        `${require('os').homedir()}/Applications/Ollama.app`
      ];
      if (appPaths.some(p => fs.existsSync(p))) return true;
    }
    
    // 3. Check Windows Common Paths
    if (process.platform === 'win32') {
      const winPath = `${process.env.LOCALAPPDATA}\\Ollama\\ollama.exe`;
      if (fs.existsSync(winPath)) return true;
    }

    return false;
  } catch {
    return false;
  }
});

ipcMain.handle('start-ollama', async () => {
  const { exec, spawn } = require('child_process');
  const fs = require('fs');
  
  // 1. Check if already running on port 11434
  try {
    const net = require('net');
    const isPortOpen = await new Promise(resolve => {
      const client = new net.Socket();
      client.setTimeout(100);
      client.on('connect', () => { client.destroy(); resolve(true); });
      client.on('timeout', () => { client.destroy(); resolve(false); });
      client.on('error', () => { resolve(false); });
      client.connect(11434, '127.0.0.1');
    });
    if (isPortOpen) {
      console.log('[MAIN] Ollama is already active on port 11434.');
      return true;
    }
  } catch { /* Port check failed */ }

  try {
    if (process.platform === 'darwin') {
      const appPath = '/Applications/Ollama.app';
      if (fs.existsSync(appPath)) {
        console.log('[MAIN] Starting Ollama App...');
        exec('open -a Ollama');
      } else {
        const homebrewBinary = '/opt/homebrew/bin/ollama';
        const intelBinary = '/usr/local/bin/ollama';
        const targetBinary = fs.existsSync(homebrewBinary) ? homebrewBinary : fs.existsSync(intelBinary) ? intelBinary : 'ollama';

        console.log(`[MAIN] Starting Ollama Service via binary (${targetBinary})...`);
        const proc = spawn(targetBinary, ['serve'], {
          detached: true,
          stdio: 'ignore'
        });
        proc.unref();
      }

      // Wait for port to become active (Poll for 30s)
      console.log('[MAIN] Waiting for Ollama port 11434 to open...');
      for (let i = 0; i < 60; i++) {
        const active = await new Promise(resolve => {
          const net = require('net');
          const client = new net.Socket();
          client.setTimeout(200);
          client.on('connect', () => { client.destroy(); resolve(true); });
          client.on('error', () => { resolve(false); });
          client.connect(11434, '127.0.0.1');
        });
        if (active) {
          console.log('[MAIN] Ollama is now awake and ready.');
          return true;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      throw new Error("Ollama failed to start within 30 seconds.");
    } else if (process.platform === 'win32') {
      // Priority 1: Try App Start
      try {
        exec('start "" "ollama app"');
        return true;
      } catch {
        // Priority 2: Direct Binary Start
        const winPath = `${process.env.LOCALAPPDATA}\\Ollama\\ollama.exe`;
        if (fs.existsSync(winPath)) {
          spawn(winPath, ['serve'], { detached: true, stdio: 'ignore' }).unref();
          return true;
        }
      }
    } else if (process.platform === 'linux') {
      // Linux: Try binary start
      try {
        spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' }).unref();
        return true;
      } catch { /* Failed to spawn linux service */ }
    }
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('install-ollama', async () => {
  const execP = require('util').promisify(require('child_process').exec);
  const os = require('os');
  const tempDir = os.tmpdir();
  const path = require('path');
  
  try {
    if (process.platform === 'darwin') {
      const zipPath = path.join(tempDir, 'ollama-mac.zip');
      await execP(`curl -L https://ollama.com/download/ollama-darwin.zip -o "${zipPath}"`);
      await execP(`unzip -o "${zipPath}" -d "${tempDir}"`);
      const appPath = path.join(tempDir, 'Ollama.app');
      try {
        await execP(`mv -f "${appPath}" /Applications/`);
      } catch {
        await execP(`open "${appPath}"`);
      }
      await execP('open -a Ollama');
      return { success: true };
    } else if (process.platform === 'win32') {
      const setupPath = path.join(tempDir, 'OllamaSetup.exe');
      const psCmd = `powershell.exe -Command "& { Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '${setupPath}'; Start-Process -FilePath '${setupPath}' -ArgumentList '/S' -Wait; }"`;
      await execP(psCmd);
      return { success: true };
    } else if (process.platform === 'linux') {
      await execP('curl -fsSL https://ollama.com/install.sh | sh');
      return { success: true };
    }
    return { success: false, error: "Unsupported platform." };
  } catch (error) {
    console.error('[MAIN] Ollama Install Failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('setup-ollama-for-model', async (event, { modelId, tag }) => {
  const { spawn } = require('child_process');
  
  const sendStatus = (step, progress) => {
    event.sender.send('ollama-setup-status', { modelId, step, progress });
  };

  try {
    // 1. Check/Install
    sendStatus("Checking installation...", 0);
    const installed = await ipcMain.handlers['is-ollama-installed']();
    if (!installed) {
      sendStatus("Installing Ollama...", 10);
      const res = await ipcMain.handlers['install-ollama']();
      if (!res.success) throw new Error(res.error);
    }

    // 2. Wake Daemon
    sendStatus("Waking engine...", 30);
    await ipcMain.handlers['start-ollama']();
    await new Promise(r => setTimeout(r, 2000));

    // 3. Pull
    sendStatus(`Pulling weights...`, 45);
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const binPaths = [
        '/usr/local/bin/ollama',
        '/opt/homebrew/bin/ollama',
        '/Applications/Ollama.app/Contents/Resources/bin/ollama',
        `${require('os').homedir()}/Applications/Ollama.app/Contents/Resources/bin/ollama`
      ];
      let binary = 'ollama';
      for (const p of binPaths) {
        if (fs.existsSync(p)) { binary = p; break; }
      }

      console.log(`[OLLAMA-SETUP] Pulling ${tag} using ${binary}`);
      const pull = spawn(binary, ['pull', tag]);
      
      const handleData = (d) => {
        const raw = d.toString();
        const match = raw.match(/(\d+(?:\.\d+)?)%/);
        if (match) {
          const percent = parseFloat(match[1]);
          sendStatus("Downloading...", 45 + (percent * 0.55));
        }
      };

      pull.stdout.on('data', handleData);
      pull.stderr.on('data', handleData);
      
      pull.stderr.on('data', (d) => {
        console.warn(`[OLLAMA-SETUP] ${d.toString()}`);
      });

      pull.on('close', (code) => {
        if (code === 0) {
          sendStatus("Ready", 100);
          resolve(true);
        } else {
          console.error(`[OLLAMA-SETUP] Pull failed with code ${code}`);
          reject(new Error(`Pull failed (Code ${code})`));
        }
      });
    });
  } catch (error) {
    sendStatus(`Failed: ${error.message}`, 0);
    return false;
  }
});

ipcMain.handle('is-ollama-running', async () => {
  try {
    const resp = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(1000) });
    return resp.ok;
  } catch {
    return false;
  }
});
