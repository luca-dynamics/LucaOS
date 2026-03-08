import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Bootstrap Service
 * Handles first-run Python environment setup for production installs.
 * Creates venv and installs dependencies automatically.
 */
class BootstrapService {
    constructor() {
        this.isBootstrapping = false;
        this.listeners = [];
    }

    /**
     * Get platform-specific paths for venv executables
     */
    getPaths() {
        const cwd = process.cwd();
        const pythonDir = path.join(cwd, 'cortex/python');
        const venvDir = path.join(pythonDir, 'venv');
        const isWindows = os.platform() === 'win32';

        return {
            pythonDir,
            venvDir,
            venvPython: isWindows 
                ? path.join(venvDir, 'Scripts', 'python.exe')
                : path.join(venvDir, 'bin', 'python'),
            venvPip: isWindows
                ? path.join(venvDir, 'Scripts', 'pip.exe')
                : path.join(venvDir, 'bin', 'pip'),
            // Use requirements.local.txt for desktop (has faster-whisper, torch, etc.)
            // Railway cloud uses requirements.txt (lightweight)
            requirementsFile: path.join(pythonDir, 'requirements.local.txt'),
            requirementsFallback: path.join(pythonDir, 'requirements.txt'),
        };
    }

    /**
     * Check if Python environment is ready
     */
    isEnvironmentReady() {
        const paths = this.getPaths();
        return fs.existsSync(paths.venvPython);
    }

    /**
     * Subscribe to bootstrap progress events
     */
    onProgress(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Emit progress to all listeners
     */
    emit(event, data) {
        this.listeners.forEach(l => l(event, data));
    }

    /**
     * Run a command and return a promise
     */
    runCommand(cmd, args, options = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn(cmd, args, {
                ...options,
                shell: os.platform() === 'win32',
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data) => {
                const msg = data.toString();
                stdout += msg;
                this.emit('log', { type: 'stdout', message: msg.trim() });
            });

            child.stderr?.on('data', (data) => {
                const msg = data.toString();
                stderr += msg;
                this.emit('log', { type: 'stderr', message: msg.trim() });
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });

            child.on('error', reject);
        });
    }

    /**
     * Ensure Python environment exists. Creates it if missing.
     * @returns {Promise<{status: string, message: string}>}
     */
    async ensurePythonEnvironment() {
        const paths = this.getPaths();

        // Already ready
        if (this.isEnvironmentReady()) {
            console.log('[BOOTSTRAP] Python environment already exists.');
            return { status: 'EXISTS', message: 'Python environment ready.' };
        }

        // Prevent concurrent bootstrap attempts
        if (this.isBootstrapping) {
            console.log('[BOOTSTRAP] Bootstrap already in progress.');
            return { status: 'IN_PROGRESS', message: 'Bootstrap already running.' };
        }

        this.isBootstrapping = true;
        this.emit('start', { message: 'Starting Python environment setup...' });

        try {
            // 1. Check if Python3 is available
            console.log('[BOOTSTRAP] Checking Python3 availability...');
            this.emit('progress', { step: 1, total: 3, message: 'Checking Python installation...' });
            
            const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3';
            await this.runCommand(pythonCmd, ['--version']);

            // 2. Create virtual environment
            console.log('[BOOTSTRAP] Creating virtual environment...');
            this.emit('progress', { step: 2, total: 3, message: 'Creating virtual environment...' });
            
            await this.runCommand(pythonCmd, ['-m', 'venv', paths.venvDir]);

            // 3. Install dependencies
            console.log('[BOOTSTRAP] Installing dependencies...');
            this.emit('progress', { step: 3, total: 3, message: 'Installing dependencies (this may take a few minutes)...' });
            
            // Use requirements.local.txt if it exists (has faster-whisper)
            // Otherwise fall back to requirements.txt
            const reqFile = fs.existsSync(paths.requirementsFile) 
                ? paths.requirementsFile 
                : paths.requirementsFallback;

            console.log(`[BOOTSTRAP] Using requirements file: ${reqFile}`);
            
            await this.runCommand(paths.venvPip, ['install', '--upgrade', 'pip']);
            await this.runCommand(paths.venvPip, ['install', '-r', reqFile]);

            this.isBootstrapping = false;
            this.emit('complete', { message: 'Python environment ready!' });
            
            console.log('[BOOTSTRAP] Environment setup complete!');
            return { status: 'CREATED', message: 'Python environment created successfully.' };

        } catch (error) {
            this.isBootstrapping = false;
            this.emit('error', { message: error.message });
            
            console.error('[BOOTSTRAP] Setup failed:', error);
            return { 
                status: 'ERROR', 
                message: error.message,
                fix: 'Ensure Python 3.9+ is installed. On macOS: brew install python. On Windows: Download from python.org.'
            };
        }
    }

    /**
     * Get the correct Python executable path
     * Returns venv Python if available, otherwise system Python
     */
    getPythonExecutable() {
        const paths = this.getPaths();
        if (fs.existsSync(paths.venvPython)) {
            return paths.venvPython;
        }
        return os.platform() === 'win32' ? 'python' : 'python3';
    }
}

export const bootstrapService = new BootstrapService();
