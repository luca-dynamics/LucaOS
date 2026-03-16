import { exec, spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import iotManager from '../../../src/services/iot/IoTManager.js';

// --- SECURITY CONSTANTS ---
const ADB_COMMAND_WHITELIST = ['input', 'shell', 'am', 'pm', 'screencap', 'ip', 'uiautomator', 'pull', 'push', 'cat', 'rm', 'devices', 'connect', 'pair', 'tcpip', 'install', 'uninstall', 'dumpsys'];
const SYSTEM_COMMAND_WHITELIST = {
    darwin: ['osascript', 'top', 'ps', 'df', 'ifconfig', 'pmset', 'screencapture', 'pkill', 'pbpaste', 'pbcopy', 'networksetup', 'blueutil', 'python3'],
    win32: ['powershell', 'wmic', 'nircmd.exe', 'start', 'taskkill', 'explorer.exe', 'shutdown']
};

/**
 * SYSTEM CONTROL SERVICE
 * Centralizes cross-platform execution logic for macOS, Windows, and Mobile.
 * This service allows for direct function calls instead of internal HTTP requests.
 */
class SystemControlService {
    constructor() {
        this.lucaLinkManager = null;
        this.status = 'initializing';
        this.currentWorkingDirectory = process.cwd();
        this.dependencies = {
            darwin: [
                { id: 'python3', cmd: 'python3 --version', fix: 'Install Python 3' },
                { id: 'quartz', cmd: 'python3 -c "import Quartz.CoreGraphics"', fix: 'pip3 install pyobjc' },
                { id: 'osascript', cmd: 'osascript -e "return"', fix: 'System utility missing' },
                { id: 'cliclick', cmd: 'cliclick --version', fix: 'brew install cliclick (optional for legacy support)' }
            ],
            win32: [
                { id: 'powershell', cmd: 'powershell -Command "return"', fix: 'System utility missing' },
                { id: 'nircmd', cmd: 'nircmd.exe /?', fix: 'Ensure nircmd.exe is in PATH or luca folder' }
            ],
            mobile: [
                { id: 'adb', cmd: 'adb version', fix: 'Install Android SDK Platform Tools' }
            ]
        };
        this.readiness = { status: 'unknown', missing: [] };
        this._initService();
    }

    async _initService() {
        this.status = 'checking_dependencies';
        await this.verifySystemReadiness();
        await this._initLucaLink();
    }

    async verifySystemReadiness() {
        const platform = os.platform();
        const deps = [...(this.dependencies[platform] || []), ...(this.dependencies.mobile || [])];
        const results = await Promise.all(deps.map(d => this._checkDep(d)));
        
        this.readiness.missing = results.filter(r => !r.present);
        this.readiness.status = this.readiness.missing.length === 0 ? 'ready' : 'degraded';
        
        if (this.readiness.status === 'degraded') {
            console.warn('[SYSTEM_CONTROL_SERVICE] Dependencies missing:', this.readiness.missing.map(m => m.id).join(', '));
        } else {
            console.log('[SYSTEM_CONTROL_SERVICE] All system dependencies verified');
        }
        return this.readiness;
    }

    _checkDep(dep) {
        return new Promise((resolve) => {
            exec(dep.cmd, (err) => {
                resolve({ id: dep.id, present: !err, fix: dep.fix });
            });
        });
    }

    /**
     * SAFE PROCESS SPAWNING
     * Uses spawn() instead of exec() to prevent shell injection.
     */
    spawnPromise(bin, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const platform = os.platform();
            
            // 1. Whitelist Check
            const isAdb = bin === 'adb';
            const allowedBins = isAdb ? ['adb'] : (SYSTEM_COMMAND_WHITELIST[platform] || []);
            
            if (!allowedBins.includes(bin)) {
                return reject(new Error(`Security Block: Binary "${bin}" is not whitelisted for execution.`));
            }

            // 2. Extra ADB Sanitization
            if (isAdb && args.length > 0) {
                const subCommand = args[0];
                if (!ADB_COMMAND_WHITELIST.includes(subCommand)) {
                    // Check if it's a shell subcommand
                    if (subCommand === 'shell' && args.length > 1) {
                        const shellCmd = args[1];
                        if (!ADB_COMMAND_WHITELIST.includes(shellCmd)) {
                             return reject(new Error(`Security Block: ADB shell command "${shellCmd}" is not whitelisted.`));
                        }
                    } else if (subCommand !== 'shell') {
                        return reject(new Error(`Security Block: ADB subcommand "${subCommand}" is not whitelisted.`));
                    }
                }
            }

            console.log(`[SPAWN] Executing: ${bin} ${args.join(' ')}`);

            const proc = spawn(bin, args, {
                ...options,
                env: { ...process.env, ...options.env },
                shell: false // CRITICAL: Disable shell to prevent injection
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => stdout += data.toString());
            proc.stderr.on('data', (data) => stderr += data.toString());

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(stderr || `Process exited with code ${code}`));
                }
            });

            proc.on('error', (err) => reject(err));
        });
    }

    async _initLucaLink() {
        try {
            const module = await import('../../../src/services/lucaLinkManager.server.js');
            this.lucaLinkManager = module.lucaLinkManager;
            console.log('[SYSTEM_CONTROL_SERVICE] Luca Link Manager integrated');
            this.status = 'ready';
        } catch {
            console.warn('[SYSTEM_CONTROL_SERVICE] Luca Link Manager not available, ADB-only mode');
            this.status = 'degraded';
        }
    }

    /**
     * REAL-TIME SYSTEM MONITOR
     * Returns CPU, RAM, and Uptime for the HUD.
     */
    async getRealtimeStats() {
        return new Promise((resolve) => {
            const platform = os.platform();
            
            // Baseline (Fast)
            const stats = {
                hostname: os.hostname(),
                platform: platform,
                arch: os.arch(),
                uptime: os.uptime(),
                totalMem: os.totalmem(),
                freeMem: os.freemem(),
                cpuLoad: 0,
                topProc: []
            };

            if (platform === 'darwin') {
                // macOS: Use top -l 1 for CPU load
                exec('top -l 1 | grep -E "^CPU usage|^PhysMem"', (err, stdout) => {
                    if (!err && stdout) {
                        // Parse CPU: "CPU usage: 10.5% user, 20.2% sys, 69.3% idle"
                        const cpuMatch = stdout.match(/CPU usage:.*?(\d+\.\d+)% user,\s+(\d+\.\d+)% sys/);
                        if (cpuMatch) {
                            stats.cpuLoad = parseFloat(cpuMatch[1]) + parseFloat(cpuMatch[2]);
                        }
                    }
                    // Fetch generic top processes (lightweight) aka "Steps"
                    exec('ps -Ao comm,pcpu --sort=-pcpu | head -n 6', (err2, stdout2) => {
                         if (!err2 && stdout2) {
                             stats.topProc = stdout2.trim().split('\n').slice(1).map(l => {
                                 const parts = l.trim().split(/\s+/);
                                 return parts[0].split('/').pop(); // Just the name
                             });
                         }
                         resolve(stats);
                    });
                });
            } else if (platform === 'win32') {
                 // Windows: WMIC
                 exec('wmic cpu get loadpercentage', (err, stdout) => {
                    if (!err && stdout) {
                        const lines = stdout.trim().split('\n');
                        if (lines.length > 1) stats.cpuLoad = parseFloat(lines[1].trim());
                    }
                    resolve(stats);
                 });
            } else {
                // Linux / Other fallback
                const cpus = os.cpus();
                // Rough estimate from tick count (not accurate instantaneous but fast)
                const idle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
                const total = cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);
                stats.cpuLoad = 100 - ((idle / total) * 100);
                resolve(stats);
            }
        });
    }

    /**
     * MACOS ACTION DISPATCHER
     */
    async executeMacOSAction(params) {
        const { action, type, value, level, appName, title, message, path: filePath, x, y, x2, y2, key, payload } = params;
        const actionType = action || type;
        
        // Pre-flight check for automation actions
        if (['MOVE', 'DRAG', 'CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK'].includes(actionType)) {
            const quartz = this.readiness.missing.find(m => m.id === 'quartz');
            if (quartz) {
                return { success: false, result: `Action "${actionType}" requires Quartz. Fix: ${quartz.fix}`, missing: 'quartz' };
            }
        }

        // Logic extracted from macos-control.routes.js
        return new Promise((resolve) => {
            // Audio & Media
            if (action === 'VOLUME_MUTE') {
                this.spawnPromise('osascript', ['-e', 'set volume with output muted']).then(() => resolve({ success: true, result: 'Audio muted' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'VOLUME_UNMUTE') {
                this.spawnPromise('osascript', ['-e', 'set volume without output muted']).then(() => resolve({ success: true, result: 'Audio unmuted' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'MEDIA_PLAY_PAUSE') {
                this.spawnPromise('osascript', ['-e', 'tell application "System Events" to keystroke space using {command down}']).then(() => resolve({ success: true, result: 'Play/Pause toggled' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'MEDIA_NEXT') {
                this.spawnPromise('osascript', ['-e', 'tell application "System Events" to keystroke "right" using {command down, shift down}']).then(() => resolve({ success: true, result: 'Next track' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'MEDIA_PREV') {
                this.spawnPromise('osascript', ['-e', 'tell application "System Events" to keystroke "left" using {command down, shift down}']).then(() => resolve({ success: true, result: 'Previous track' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'MEDIA_STOP') {
                this.spawnPromise('osascript', ['-e', 'tell application "Music" to stop']).then(() => resolve({ success: true, result: 'Media stopped' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }

            // System Info
            if (action === 'GET_DISK_SPACE') {
                this.spawnPromise('df', ['-h', '/']).then(stdout => {
                    const parts = stdout.trim().split('\n').pop().split(/\s+/);
                    resolve({ 
                        success: true, 
                        result: `Disk: ${parts[2]} used of ${parts[1]} (${parts[4]} full)`,
                        data: { total: parts[1], used: parts[2], available: parts[3], percentage: parts[4] }
                    });
                }).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'GET_NETWORK_INFO') {
                this.spawnPromise('ifconfig').then(stdout => {
                    const filtered = stdout.split('\n').filter(line => line.includes('inet ') && !line.includes('127.0.0.1')).join('\n');
                    resolve({ success: true, result: `Network interfaces:\n${filtered}` });
                }).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'GET_SYSTEM_LOAD') {
                this.spawnPromise('top', ['-l', '1']).then(stdout => {
                    const cpuLine = stdout.split('\n').find(l => l.includes('CPU usage')) || '';
                    resolve({ success: true, result: `CPU: ${cpuLine.trim()}` });
                }).catch(err => resolve({ success: false, result: err.message }));
                return;
            }

            // Display & Screen
            if (action === 'SET_BRIGHTNESS') {
                const brightness = (value || level) / 100;
                this.spawnPromise('osascript', ['-e', `tell application "System Events" to tell appearance preferences to set dark mode to ${brightness}`])
                    .then(() => resolve({ success: true, result: `Brightness set to ${value || level}%` }))
                    .catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'TOGGLE_DARK_MODE') {
                this.spawnPromise('osascript', ['-e', 'tell application "System Events" to tell appearance preferences to set dark mode to not dark mode'])
                    .then(() => resolve({ success: true, result: 'Dark mode toggled' }))
                    .catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'LOCK_SCREEN') {
                this.spawnPromise('/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession', ['-suspend'])
                    .then(() => resolve({ success: true, result: 'Screen locked' }))
                    .catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'SLEEP_DISPLAY') {
                this.spawnPromise('pmset', ['displaysleepnow'])
                    .then(() => resolve({ success: true, result: 'Display sleeping' }))
                    .catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'TAKE_SCREENSHOT') {
                const timestamp = Date.now();
                const screenshotPath = path.join(os.homedir(), 'Desktop', `screenshot_${timestamp}.png`);
                this.spawnPromise('screencapture', ['-x', screenshotPath])
                    .then(() => resolve({ success: true, result: `Screenshot saved to ${screenshotPath}`, path: screenshotPath }))
                    .catch(err => resolve({ success: false, result: err.message }));
                return;
            }

            // App Management
            if (action === 'LAUNCH_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                this.spawnPromise('osascript', ['-e', `tell application "${appName}" to activate`]).then(() => resolve({ success: true, result: `${appName} launched` })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'QUIT_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                this.spawnPromise('osascript', ['-e', `tell application "${appName}" to quit`]).then(() => resolve({ success: true, result: `${appName} quit` })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'FORCE_QUIT_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                this.spawnPromise('pkill', ['-9', appName]).then(() => resolve({ success: true, result: `${appName} force quit` })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'GET_RUNNING_APPS') {
                this.spawnPromise('osascript', ['-e', 'tell application "System Events" to get name of every process whose background only is false']).then(stdout => {
                    const apps = stdout.trim().split(', ');
                    resolve({ success: true, result: `Running apps: ${apps.join(', ')}`, data: { apps } });
                }).catch(err => resolve({ success: false, result: err.message }));
                return;
            }

            // App Management (Continued)
            if (action === 'GET_FRONTMOST_APP') {
                this.spawnPromise('osascript', ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true']).then(stdout => {
                    resolve({ success: true, result: `Frontmost app: ${stdout.trim()}`, data: { app: stdout.trim() } });
                }).catch(err => resolve({ success: false, result: err.message }));
                return;
            }

            // Window Control
            if (action === 'MINIMIZE_WINDOW') {
                this.spawnPromise('osascript', ['-e', 'tell application "System Events" to tell (first process whose frontmost is true) to set value of attribute "AXMinimized" of window 1 to true']).then(() => resolve({ success: true, result: 'Window minimized' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'CLOSE_WINDOW') {
                this.spawnPromise('osascript', ['-e', 'tell application "System Events" to keystroke "w" using command down']).then(() => resolve({ success: true, result: 'Window closed' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }

            // Notifications
            if (action === 'SEND_NOTIFICATION') {
                const notifTitle = title || 'Luca';
                const notifMessage = message || 'Notification from Luca';
                this.spawnPromise('osascript', ['-e', `display notification "${notifMessage}" with title "${notifTitle}"`]).then(() => resolve({ success: true, result: 'Notification sent' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'TOGGLE_DND') {
                this.spawnPromise('osascript', ['-e', 'tell application "System Events" to keystroke "d" using {command down, shift down, option down, control down}']).then(() => resolve({ success: true, result: 'Do Not Disturb toggled' })).catch(err => resolve({ success: false, result: err.message }));
                return;
            }

            // Clipboard
            if (action === 'GET_CLIPBOARD') {
                this.spawnPromise('pbpaste').then(stdout => {
                    resolve({ success: true, result: stdout, data: { clipboard: stdout } });
                }).catch(err => resolve({ success: false, result: err.message }));
                return;
            }
            if (action === 'SET_CLIPBOARD') {
                if (!message) return resolve({ success: false, result: 'message required for clipboard content' });
                // pbcopy doesn't take args, it reads from stdin
                const proc = spawn('pbcopy');
                proc.stdin.write(message);
                proc.stdin.end();
                proc.on('close', (code) => {
                    resolve({ success: code === 0, result: code === 0 ? 'Clipboard updated' : 'pbcopy failed' });
                });
                return;
            }

            // Finder & Files
            if (action === 'OPEN_FINDER') {
                exec(`osascript -e 'tell application "Finder" to activate'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Finder opened' }));
                return;
            }
            if (action === 'REVEAL_IN_FINDER') {
                if (!filePath) return resolve({ success: false, result: 'path required' });
                exec(`osascript -e 'tell application "Finder" to reveal POSIX file "${filePath}"'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `Revealed ${filePath} in Finder` }));
                return;
            }
            if (action === 'EMPTY_TRASH') {
                exec(`osascript -e 'tell application "Finder" to empty trash'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Trash emptied' }));
                return;
            }
            if (action === 'NEW_FINDER_WINDOW') {
                exec(`osascript -e 'tell application "Finder" to make new Finder window'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'New Finder window opened' }));
                return;
            }

            // System Preferences
            if (action === 'OPEN_SYSTEM_PREFERENCES') {
                exec(`osascript -e 'tell application "System Preferences" to activate'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'System Preferences opened' }));
                return;
            }
            if (action === 'TOGGLE_WIFI') {
                exec('networksetup -setairportpower en0 off && sleep 1 && networksetup -setairportpower en0 on', (err) =>
                    resolve({ success: !err, result: err ? err.message : 'WiFi toggled' }));
                return;
            }
            if (action === 'TOGGLE_BLUETOOTH') {
                exec('blueutil -p toggle', (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Bluetooth toggled (requires blueutil)' }));
                return;
            }
            if (action === 'EJECT_ALL') {
                exec(`osascript -e 'tell application "Finder" to eject (every disk whose ejectable is true)'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'All ejectable disks ejected' }));
                return;
            }

            // Power
            if (action === 'RESTART') {
                exec(`osascript -e 'tell application "System Events" to restart'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'System restarting...' }));
                return;
            }
            if (action === 'SHUTDOWN') {
                exec(`osascript -e 'tell application "System Events" to shut down'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'System shutting down...' }));
                return;
            }
            if (action === 'SLEEP') {
                exec(`osascript -e 'tell application "System Events" to sleep'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'System sleeping...' }));
                return;
            }
            if (action === 'LOG_OUT') {
                exec(`osascript -e 'tell application "System Events" to log out'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Logging out...' }));
                return;
            }

            // AUTOMATION / INPUTS
            if (actionType === 'MOVE' || actionType === 'DRAG') {
                const pyScript = actionType === 'MOVE' 
                    ? `
import Quartz.CoreGraphics as CG
e = CG.CGEventCreateMouseEvent(None, CG.kCGEventMouseMoved, (${x}, ${y}), 0)
CG.CGEventPost(CG.kCGHIDEventTap, e)
`
                    : `
import Quartz.CoreGraphics as CG
import time
def post_event(type, pos, button=0):
    e = CG.CGEventCreateMouseEvent(None, type, pos, button)
    CG.CGEventPost(CG.kCGHIDEventTap, e)

post_event(CG.kCGEventMouseMoved, (${x}, ${y}))
post_event(CG.kCGEventLeftMouseDown, (${x}, ${y}))
time.sleep(0.1)
post_event(CG.kCGEventLeftMouseDragged, (${x2}, ${y2}))
time.sleep(0.1)
post_event(CG.kCGEventLeftMouseUp, (${x2}, ${y2}))
`;
                const tempPy = path.join(os.tmpdir(), `mouse_${actionType.toLowerCase()}_${Date.now()}.py`);
                fs.writeFileSync(tempPy, pyScript);
                exec(`python3 "${tempPy}"`, (err) => {
                    fs.unlinkSync(tempPy);
                    if (err) console.error(`Mouse ${actionType} Failed (Quartz/PyObjC missing?)`);
                    resolve({ success: !err, result: err ? err.message : `Mouse ${actionType.toLowerCase()} complete` });
                });
                return;
            }
            if (actionType === 'CLICK' || actionType === 'DOUBLE_CLICK' || actionType === 'RIGHT_CLICK') {
                let script = '';
                if (actionType === 'CLICK') {
                    script = (x !== undefined && y !== undefined) 
                        ? `tell application "System Events" to click at {${x}, ${y}}`
                        : `tell application "System Events" to click`;
                } else if (actionType === 'DOUBLE_CLICK') {
                    script = (x !== undefined && y !== undefined)
                        ? `tell application "System Events" to click at {${x}, ${y}}\\ndelay 0.1\\ntell application "System Events" to click at {${x}, ${y}}`
                        : `tell application "System Events" to click\\ndelay 0.1\\ntell application "System Events" to click`;
                } else { // RIGHT_CLICK
                    script = (x !== undefined && y !== undefined)
                        ? `tell application "System Events" to click at {${x}, ${y}} using control down`
                        : `tell application "System Events" to click using control down`;
                }
                exec(`osascript -e '${script}'`, (err) => resolve({ success: !err, result: err ? err.message : 'Click sent' }));
                return;
            }
            if (actionType === 'TYPE' || actionType === 'text') {
                const textToType = key || payload || message || value;
                const keyMap = { 'Enter': 36, 'Return': 36, 'Backspace': 51, 'Delete': 51, 'Tab': 48, 'Space': 49, ' ': 49, 'Escape': 53, 'Esc': 53, 'Up': 126, 'Down': 125, 'Left': 123, 'Right': 124 };
                let script = '';
                if (textToType.toLowerCase().includes('cmd+') || textToType.toLowerCase().includes('command+')) {
                    script = `tell application "System Events" to keystroke "${textToType.split('+')[1]}" using command down`;
                } else if (textToType.toLowerCase().includes('ctrl+') || textToType.toLowerCase().includes('control+')) {
                    script = `tell application "System Events" to keystroke "${textToType.split('+')[1]}" using control down`;
                } else if (keyMap[textToType]) {
                    script = `tell application "System Events" to key code ${keyMap[textToType]}`;
                } else {
                    script = `tell application "System Events" to keystroke "${textToType.replace(/"/g, '\\"')}"`;
                }
                exec(`osascript -e '${script}'`, (err) => resolve({ success: !err, result: err ? err.message : 'Text typed' }));
                return;
            }

            // Default
            resolve({ success: false, result: `Action "${actionType}" not implemented or unrecognized in MacOS service` });
        });
    }

    /**
     * WINDOWS ACTION DISPATCHER
     */
    async executeWindowsAction(params) {
        const { action, type, value, level, appName, title, message, path: filePath, x, y, x2, y2, key, payload } = params;
        const actionType = action || type;
        const platform = os.platform();
        
        if (platform !== 'win32') {
            return { success: false, result: 'Action requires Windows platform' };
        }

        // Pre-flight check for automation actions
        if (['MOVE', 'CLICK', 'RIGHT_CLICK', 'DOUBLE_CLICK', 'DRAG'].includes(actionType)) {
            const nircmd = this.readiness.missing.find(m => m.id === 'nircmd');
            if (nircmd) {
                return { success: false, result: `Action "${actionType}" requires NirCmd. Fix: ${nircmd.fix}`, missing: 'nircmd' };
            }
        }

        return new Promise((resolve) => {
            // AUDIO & MEDIA
            if (action === 'VOLUME_MUTE') {
                this.spawnPromise('nircmd.exe', ['mutesysvolume', '1']).then(() => 
                    resolve({ success: true, result: 'Audio muted' })).catch(err => resolve({ success: false, result: err.message }));
            }
            else if (action === 'VOLUME_UNMUTE') {
                this.spawnPromise('nircmd.exe', ['mutesysvolume', '0']).then(() => 
                    resolve({ success: true, result: 'Audio unmuted' })).catch(err => resolve({ success: false, result: err.message }));
            }
            else if (action === 'MEDIA_PLAY_PAUSE') {
                this.spawnPromise('nircmd.exe', ['sendkeypress', '0xB3']).then(() => 
                    resolve({ success: true, result: 'Play/Pause toggled' })).catch(err => resolve({ success: false, result: err.message }));
            }
            else if (action === 'MEDIA_NEXT') {
                this.spawnPromise('nircmd.exe', ['sendkeypress', '0xB0']).then(() => 
                    resolve({ success: true, result: 'Next track' })).catch(err => resolve({ success: false, result: err.message }));
            }
            else if (action === 'MEDIA_PREV') {
                this.spawnPromise('nircmd.exe', ['sendkeypress', '0xB1']).then(() => 
                    resolve({ success: true, result: 'Previous track' })).catch(err => resolve({ success: false, result: err.message }));
            }
            // SYSTEM INFO
            else if (action === 'GET_BATTERY') {
                this.spawnPromise('wmic', ['Path', 'Win32_Battery', 'Get', 'EstimatedChargeRemaining,BatteryStatus']).then(stdout => {
                    const lines = stdout.trim().split('\n');
                    if (lines.length > 1) {
                        const data = lines[1].trim().split(/\s+/);
                        const status = data[0] === '2' ? 'Charging' : 'Discharging';
                        resolve({ success: true, result: `Battery: ${data[1]}% (${status})` });
                    } else {
                        resolve({ success: false, result: 'Could not parse battery info' });
                    }
                }).catch(err => resolve({ success: false, result: err.message }));
            }
            // DISPLAY & SCREEN
            else if (action === 'SET_BRIGHTNESS') {
                const brightness = value || level;
                this.spawnPromise('powershell', ['(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,' + brightness + ')'])
                    .then(() => resolve({ success: true, result: `Brightness set to ${brightness}%` }))
                    .catch(err => resolve({ success: false, result: err.message }));
            }
            else if (action === 'TAKE_SCREENSHOT') {
                const timestamp = Date.now();
                const screenshotPath = path.join(os.homedir(), 'Desktop', `screenshot_${timestamp}.png`);
                this.spawnPromise('nircmd.exe', ['savescreenshot', screenshotPath])
                    .then(() => resolve({ success: true, result: `Screenshot saved to ${screenshotPath}`, path: screenshotPath }))
                    .catch(err => resolve({ success: false, result: err.message }));
            }
            // APP MANAGEMENT
            else if (action === 'LAUNCH_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                this.spawnPromise('start', ['', appName])
                    .then(() => resolve({ success: true, result: `${appName} launched` }))
                    .catch(err => resolve({ success: false, result: err.message }));
            }
            else if (action === 'QUIT_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                this.spawnPromise('taskkill', ['/IM', `${appName}.exe`, '/F'])
                    .then(() => resolve({ success: true, result: `${appName} quit` }))
                    .catch(err => resolve({ success: false, result: err.message }));
            }
            // NOTIFICATIONS
            else if (action === 'SEND_NOTIFICATION') {
                const notifTitle = title || 'Luca';
                const notifMessage = message || 'Notification from Luca';
                const psScript = `
                    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
                    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
                    $template = @"
                    <toast><visual><binding template="ToastText02"><text id="1">${notifTitle}</text><text id="2">${notifMessage}</text></binding></visual></toast>
"@
                    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
                    $xml.LoadXml($template)
                    $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
                    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Luca").Show($toast)
                `;
                exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Notification sent' }));
            }
            // POWER
            else if (action === 'RESTART') {
                exec('shutdown /r /t 0', (err) => resolve({ success: !err, result: 'Restarting...' }));
            }
            else if (action === 'SHUTDOWN') {
                exec('shutdown /s /t 0', (err) => resolve({ success: !err, result: 'Shutting down...' }));
            }
            // WINDOW CONTROL
            else if (action === 'MINIMIZE_WINDOW') {
                exec('nircmd.exe win min foreground', (err) => resolve({ success: !err, result: 'Window minimized' }));
            }
            else if (action === 'MAXIMIZE_WINDOW') {
                exec('nircmd.exe win max foreground', (err) => resolve({ success: !err, result: 'Window maximized' }));
            }
            else if (action === 'CLOSE_WINDOW') {
                exec('nircmd.exe win close foreground', (err) => resolve({ success: !err, result: 'Window closed' }));
            }
            // CLIPBOARD
            else if (action === 'GET_CLIPBOARD') {
                exec('powershell Get-Clipboard', (err, stdout) => resolve({ success: !err, result: stdout }));
            }
            else if (action === 'SET_CLIPBOARD') {
                exec(`powershell Set-Clipboard -Value "${message.replace(/"/g, '\\"')}"`, (err) => resolve({ success: !err, result: 'Clipboard updated' }));
            }
            // EXPLORER & FILES
            else if (action === 'OPEN_FINDER') {
                exec('explorer.exe', (err) => resolve({ success: !err, result: 'Explorer opened' }));
            }
            else if (action === 'REVEAL_IN_FINDER') {
                if (!filePath) return resolve({ success: false, result: 'path required' });
                exec(`explorer.exe /select,"${filePath}"`, (err) => resolve({ success: !err, result: `Revealed ${filePath} in Explorer` }));
            }
            // AUTOMATION / INPUTS
            else if (['MOVE', 'CLICK', 'RIGHT_CLICK', 'DOUBLE_CLICK', 'DRAG'].includes(actionType)) {
                let psScript = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing;`;
                if (actionType === 'MOVE') {
                    psScript += `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`;
                } else if (actionType === 'CLICK' || actionType === 'RIGHT_CLICK' || actionType === 'DOUBLE_CLICK') {
                    if (x !== undefined && y !== undefined) psScript += `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});`;
                    const mCode = actionType === 'RIGHT_CLICK' ? '0x08, 0x10' : '0x02, 0x04';
                    psScript += `
                        $code = @"
                        [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
"@
                        $mouse = Add-Type -MemberDefinition $code -Name "Mouse" -Namespace "Win32" -PassThru
                        ${actionType === 'DOUBLE_CLICK' ? `$mouse::mouse_event(0x02,0,0,0,0); $mouse::mouse_event(0x04,0,0,0,0); Start-Sleep -Milliseconds 100; $mouse::mouse_event(0x02,0,0,0,0); $mouse::mouse_event(0x04,0,0,0,0);` : `$mouse::mouse_event(${mCode.split(',')[0]},0,0,0,0); $mouse::mouse_event(${mCode.split(',')[1]},0,0,0,0);`}
                    `;
                } else if (actionType === 'DRAG') {
                    psScript += `
                        $code = @"
                        [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
"@
                        $mouse = Add-Type -MemberDefinition $code -Name "Mouse" -Namespace "Win32" -PassThru
                        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});
                        $mouse::mouse_event(0x02, 0, 0, 0, 0); Start-Sleep -Milliseconds 200;
                        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x2}, ${y2}); Start-Sleep -Milliseconds 200;
                        $mouse::mouse_event(0x04, 0, 0, 0, 0);
                    `;
                }
                const tempPath = path.join(os.tmpdir(), `input_${Date.now()}.ps1`);
                fs.writeFileSync(tempPath, psScript);
                exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`, (err) => {
                    fs.unlinkSync(tempPath);
                    resolve({ success: !err, result: err ? err.message : 'Action sent' });
                });
            }
            else if (actionType === 'TYPE' || actionType === 'text') {
                const textToType = key || payload || message || value;
                const map = { 'Enter': '{ENTER}', 'Backspace': '{BACKSPACE}', 'Tab': '{TAB}', 'Space': ' ', 'Escape': '{ESC}', 'Esc': '{ESC}', 'Up': '{UP}', 'Down': '{DOWN}', 'Left': '{LEFT}', 'Right': '{RIGHT}' };
                let keys = map[textToType] || textToType;
                if (textToType.toLowerCase().includes('ctrl+')) keys = '^' + textToType.split('+')[1];
                const safeKeys = keys.replace(/'/g, "''");
                exec(`powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${safeKeys}')"`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Text typed' }));
            }
            else {
                resolve({ success: false, result: `Action "${actionType}" not implemented for Windows service` });
            }
        });
    }

    /**
     * GENERIC COMMAND DISPATCHER
     */
    async executeCommand(params) {
        let { tool, action, args } = params;
        const cmdType = tool || action;
        if (!args || Object.keys(args).length === 0) args = params;

        return new Promise((resolve) => {
            (async () => {
                if (cmdType === 'executeTerminalCommand') {
                    exec(args.command, { cwd: this.currentWorkingDirectory }, (error, stdout, stderr) => {
                        resolve({ success: !error, result: stdout || stderr || (error ? error.message : "Executed") });
                    });
                }
                else if (cmdType === 'runDiagnostics') {
                    const stats = {
                        Hostname: os.hostname(),
                        Platform: os.platform(),
                        CPU: os.cpus()[0].model,
                        Memory_Total: `${(os.totalmem() / 1e9).toFixed(2)} GB`,
                        Uptime: `${(os.uptime() / 3600).toFixed(1)} Hours`
                    };
                    resolve({ success: true, result: JSON.stringify(stats, null, 2) });
                }
                else if (cmdType === 'controlSmartTV') {
                    try {
                        const result = await iotManager.controlDevice(args.deviceId || args.id || args.device?.id, args.action, args);
                        resolve({ success: !!result, result: result ? "Command Sent" : "Device not found" });
                    } catch (err) {
                        resolve({ success: false, result: err.message });
                    }
                }
                else {
                    resolve({ success: false, result: `Tool "${cmdType}" not implemented` });
                }
            })();
        });
    }

    /**
     * MOBILE ACTION DISPATCHER (Android & iOS)
     */
    async executeMobileAction(params) {
        const { action, value, level, appName, title, message, deviceId, platform } = params;
        const isAndroid = platform === 'android' || !platform;
        
        // 1. Try Luca Link (AI Wireless)
        let lucaDevice = null;
        if (this.lucaLinkManager && this.lucaLinkManager.devices) {
            for (const [id, device] of this.lucaLinkManager.devices) {
                if (id === deviceId || device.metadata?.deviceId === deviceId) {
                    lucaDevice = device;
                    break;
                }
            }
        }

        if (lucaDevice) {
            try {
                const response = await this.lucaLinkManager.delegateTool(lucaDevice.id, 'controlSystem', {
                    action, value, level, appName, title, message
                });
                return { success: true, result: response, method: 'luca-link' };
            } catch (error) {
                const msg = error.message.toLowerCase();
                let fix = "Ensure Luca Link app is open and connected on the mobile device.";
                
                // Granular Permission Detection
                if (msg.includes('accessibility')) {
                    fix = isAndroid ? 
                        "adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS" : 
                        "open 'prefs:root=ACCESSIBILITY'";
                } else if (msg.includes('permission') || msg.includes('overlay')) {
                    fix = isAndroid ? 
                        "adb shell am start -a android.settings.ACTION_MANAGE_OVERLAY_PERMISSION" : 
                        "open 'prefs:root=Privacy'";
                }

                return { 
                    success: false, 
                    result: error.message, 
                    method: 'luca-link',
                    fix
                };
            }
        }

        // 2. Fallback to ADB (Standard Debugging)
        return new Promise((resolve) => {
            if (isAndroid) {
                if (action === 'VOLUME_SET') {
                    const vol = Math.round((value || level || 50) / 100 * 15);
                    this.spawnPromise('adb', deviceId ? ['-s', deviceId, 'shell', 'media', 'volume', '--stream', '3', '--set', vol.toString()] : ['shell', 'media', 'volume', '--stream', '3', '--set', vol.toString()])
                        .then(() => resolve({ 
                            success: true, 
                            result: 'Volume set', 
                            method: 'adb'
                        }))
                        .catch(err => resolve({ 
                            success: false, 
                            result: err.message, 
                            method: 'adb',
                            fix: "Ensure device is connected and 'USB Debugging' is enabled. Run 'adb devices' to check."
                        }));
                }
                else if (action === 'SWIPE') {
                    const { x1, y1, x2, y2, duration } = params;
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    this.spawnPromise('adb', [...adbArgs, 'shell', 'input', 'swipe', x1.toString(), y1.toString(), x2.toString(), y2.toString(), (duration || 300).toString()])
                        .then(() => resolve({ 
                            success: true, 
                            result: `Swiped from ${x1},${y1} to ${x2},${y2}`, 
                            method: 'adb' 
                        }))
                        .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                }
                else if (action === 'TYPE' || action === 'TEXT') {
                    const text = value || params.text;
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    // ADB input text doesn't like spaces, usually needs to be replaced with %s or quoted
                    // But with spawn, we can just pass the argument
                    this.spawnPromise('adb', [...adbArgs, 'shell', 'input', 'text', text.toString()])
                        .then(() => resolve({ 
                            success: true, 
                            result: `Typed text: ${text}`, 
                            method: 'adb' 
                        }))
                        .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                }
                else if (action === 'OPEN_URL') {
                    const url = value || params.url;
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    this.spawnPromise('adb', [...adbArgs, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url])
                        .then(() => resolve({ 
                            success: true, 
                            result: `Opened URL: ${url}`, 
                            method: 'adb' 
                        }))
                        .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                }
                else if (action === 'GET_UI_TREE') {
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    const dumpPath = `/sdcard/view_${Date.now()}.xml`;
                    const localPath = path.join(os.tmpdir(), `view_${Date.now()}.xml`);
                    
                    this.spawnPromise('adb', [...adbArgs, 'shell', 'uiautomator', 'dump', dumpPath])
                        .then(() => this.spawnPromise('adb', [...adbArgs, 'pull', dumpPath, localPath]))
                        .then(() => {
                            const xml = fs.readFileSync(localPath, 'utf8');
                            fs.unlinkSync(localPath);
                            this.spawnPromise('adb', [...adbArgs, 'shell', 'rm', dumpPath]).catch(() => {});
                            resolve({ success: true, xml, method: 'adb' });
                        })
                        .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                }
                else if (action === 'SCREEN_CAPTURE' || action === 'TAKE_SCREENSHOT') {
                    const ts = Date.now();
                    const rPath = `/sdcard/screen_${ts}.png`;
                    // Use a temporary path for the pulled image
                    const lPath = path.join(os.tmpdir(), `mobile_screen_${ts}.png`);
                    
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    
                    this.spawnPromise('adb', [...adbArgs, 'shell', 'screencap', '-p', rPath])
                        .then(() => this.spawnPromise('adb', [...adbArgs, 'pull', rPath, lPath]))
                        .then(() => {
                            const buffer = fs.readFileSync(lPath);
                            const base64 = buffer.toString('base64');
                            // Clean up
                            fs.unlinkSync(lPath);
                            this.spawnPromise('adb', [...adbArgs, 'shell', 'rm', rPath]).catch(() => {}); // Async cleanup
                            
                            resolve({ 
                                success: true, 
                                image: base64, 
                                path: lPath,
                                method: 'adb' 
                            });
                        })
                        .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                }
                else if (action === 'TAP') {
                    const { x, y } = params;
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    this.spawnPromise('adb', [...adbArgs, 'shell', 'input', 'tap', x.toString(), y.toString()])
                        .then(() => resolve({ 
                            success: true, 
                            result: `Tapped at ${x},${y}`, 
                            method: 'adb' 
                        }))
                        .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                }
                else if (action === 'KEY') {
                    const { keyCode } = params;
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    this.spawnPromise('adb', [...adbArgs, 'shell', 'input', 'keyevent', keyCode.toString()])
                        .then(() => resolve({ 
                            success: true, 
                            result: `Key event ${keyCode} sent`, 
                            method: 'adb' 
                        }))
                        .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                }
                else if (action === 'LIST_PACKAGES') {
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    this.spawnPromise('adb', [...adbArgs, 'shell', 'pm', 'list', 'packages'])
                        .then(stdout => {
                            const packages = stdout.split('\n')
                                .map(line => line.replace('package:', '').trim())
                                .filter(p => p.length > 0);
                            resolve({ success: true, packages, method: 'adb' });
                        })
                        .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                }
                else if (action === 'KILL_PACKAGE') {
                    const pkg = appName || params.package;
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    this.spawnPromise('adb', [...adbArgs, 'shell', 'am', 'force-stop', pkg])
                        .then(() => resolve({ 
                            success: true, 
                            result: `Force-stopped ${pkg}`, 
                            method: 'adb' 
                        }))
                        .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                }
                else if (action === 'EXFILTRATE') {
                    const { type } = params; // SMS, CALLS, etc.
                    const adbArgs = deviceId ? ['-s', deviceId] : [];
                    // This is highly dependent on device state and root. 
                    // Implementing a "dump" placeholder using content providers.
                    let contentUri = "";
                    if (type === 'SMS') contentUri = "content://sms/inbox";
                    else if (type === 'CALLS') contentUri = "content://call_log/calls";
                    
                    if (contentUri) {
                        this.spawnPromise('adb', [...adbArgs, 'shell', 'content', 'query', '--uri', contentUri])
                            .then(stdout => {
                                resolve({ success: true, data: stdout, type, method: 'adb' });
                            })
                            .catch(err => resolve({ success: false, result: err.message, method: 'adb' }));
                    } else {
                        resolve({ success: false, result: `Exfiltration type ${type} not supported`, method: 'adb' });
                    }
                }
                else {
                    resolve({ 
                        success: false, 
                        result: `Action "${action}" not implemented for ADB`, 
                        method: 'adb',
                        fix: "Valid actions: VOLUME_SET, TAKE_SCREENSHOT, SCREEN_CAPTURE, TAP, KEY, LIST_PACKAGES, KILL_PACKAGE, EXFILTRATE, GET_BATTERY, LAUNCH_APP, RESTART, ACCESSIBILITY."
                    });
                }
            } else {
                // iOS Support (requires libimobiledevice)
                if (action === 'GET_BATTERY') {
                    exec('ideviceinfo -k BatteryCurrentCapacity', (err, stdout) => resolve({ 
                        success: !err, 
                        result: err ? `iOS Error: ${err.message}` : `Battery: ${stdout.trim()}%`, 
                        method: 'libimobiledevice',
                        fix: err ? "Install libimobiledevice: 'brew install libimobiledevice' and ensure you 'Trust' this computer on the iPhone." : null
                    }));
                } else if (action === 'SETTINGS') {
                    resolve({
                        success: true,
                        result: "iOS Deep Link Generated",
                        fix: "open 'prefs:root=ACCESSIBILITY'"
                    });
                }
                else {
                    resolve({ 
                        success: false, 
                        result: 'iOS action requires libimobiledevice or Luca Link', 
                        method: 'none',
                        fix: "For physical connection, install libimobiledevice. For wireless, use the Luca Link app."
                    });
                }
            }
        });
    }

    /**
     * UNIFIED ACTION DISPATCHER
     */
    async executeAction(params) {
        const { platform, deviceId, tool } = params;

        // Global readiness check for mobile
        if (deviceId || platform === 'android') {
            const adb = this.readiness.missing.find(m => m.id === 'adb');
            if (adb) return { success: false, result: `Mobile actions require ADB. Fix: ${adb.fix}`, missing: 'adb' };
        }

        if (tool === 'executeTerminalCommand' || tool === 'runDiagnostics' || tool === 'controlSmartTV') {
            return this.executeCommand(params);
        }

        if (deviceId || platform === 'android' || platform === 'ios') {
            return this.executeMobileAction(params);
        }

        const currentPlatform = os.platform();
        if (currentPlatform === 'darwin') {
            return this.executeMacOSAction(params);
        } else if (currentPlatform === 'win32') {
            return this.executeWindowsAction(params);
        } else {
            return { success: false, result: `Platform ${currentPlatform} not supported` };
        }
    }

    getStatus() {
        return {
            service: 'SystemControlService',
            status: this.status,
            readiness: this.readiness,
            platform: os.platform(),
            uptime: os.uptime(),
            timestamp: new Date().toISOString()
        };
    }
}

export const systemControlService = new SystemControlService();
