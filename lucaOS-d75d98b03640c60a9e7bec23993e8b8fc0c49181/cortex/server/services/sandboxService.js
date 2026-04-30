import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PYTHON_BIN, VENV_DIR } from '../config/constants.js';

/**
 * Stateful Code Sandbox Service
 * Maintains a persistent Python process to execute code blocks iteratively,
 * retaining variable state in memory across multiple executions.
 */
class SandboxService {
    constructor() {
        this.process = null;
        this.isReady = false;
        this.currentQueue = [];
        this.workerPath = path.join(os.tmpdir(), `luca_sandbox_worker_${Date.now()}.py`);
        
        // Define the Python worker that reads JSON payloads from stdin, 
        // execs the code in a persistent global dict, and returns stdout/stderr as JSON.
        this.workerCode = `
import sys
import json
import traceback
from io import StringIO
import contextlib

# Global namespace dictionary to retain state between executions
_global_env = {}

def main():
    # Send ready signal
    sys.stdout.write('{"status": "READY"}\\n')
    sys.stdout.flush()

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            payload = json.loads(line)
            code = payload.get("code", "")
            
            output = StringIO()
            error = StringIO()
            
            out_str = ""
            err_str = ""
            
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(error):
                try:
                    # Try to evaluate as an expression first, to automatically returning the value
                    try:
                        _eval_code = compile(code, '<string>', 'eval')
                        _eval_result = eval(_eval_code, _global_env)
                        if _eval_result is not None:
                            print(repr(_eval_result))
                    except SyntaxError:
                        # Fallback to exec for statements
                        _exec_code = compile(code, '<string>', 'exec')
                        exec(_exec_code, _global_env)
                except Exception as e:
                    traceback.print_exc(file=error)
            
            # Matplotlib capture block
            # If matplotlib is imported and there is an active figure, capture it as base64
            images = []
            try:
                import matplotlib
                matplotlib.use('Agg') # Ensure headless backend
                import matplotlib.pyplot as plt
                if plt.get_fignums():
                    import io
                    import base64
                    buf = io.BytesIO()
                    plt.savefig(buf, format='png', bbox_inches='tight')
                    buf.seek(0)
                    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                    images.append(f"data:image/png;base64,{img_base64}")
                    plt.clf() # Clear current figure
                    plt.close('all') # Close all to prevent memory leak
            except ImportError:
                pass # matplotlib not installed/used
            except Exception as e:
                # Silently catch plt errors so we don't crash the sandbox
                print(f"Failed to capture plot: {e}", file=error)
            
            out_str = output.getvalue()
            err_str = error.getvalue()
            
            # Write response
            response = {"stdout": out_str, "stderr": err_str, "images": images}
            sys.stdout.write(json.dumps(response) + "\\n")
            sys.stdout.flush()
            
        except Exception as e:
            err_resp = {"stdout": "", "stderr": f"JSON Parsing or Fatal Error: {str(e)}", "images": []}
            sys.stdout.write(json.dumps(err_resp) + "\\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
`;

        // Node Worker Setup
        this.nodeProcess = null;
        this.isNodeReady = false;
        this.currentNodeQueue = [];
        this.nodeWorkerPath = path.join(os.tmpdir(), "luca_sandbox_worker_" + Date.now() + ".js");
        
        // Define the Node worker
        this.nodeWorkerCode = `
const vm = require('vm');
const readline = require('readline');

// The persistent context
const context = {
    console: {
        log: (...args) => process.stdout.write(args.join(' ') + '\\\\n'),
        error: (...args) => process.stderr.write(args.join(' ') + '\\\\n'),
        warn: (...args) => process.stderr.write(args.join(' ') + '\\\\n')
    },
    require: require,
    process: process,
    Buffer: Buffer,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval
};
vm.createContext(context);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Signal ready
process.stdout.write(JSON.stringify({ status: "READY" }) + "\\\\n");

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const payload = JSON.parse(line);
        const code = payload.code || "";
        
        // Capture stdout and stderr
        let outStr = '';
        let errStr = '';
        
        const originalLog = context.console.log;
        const originalError = context.console.error;
        const originalWarn = context.console.warn;
        
        context.console.log = (...args) => { outStr += args.join(' ') + '\\\\n'; };
        context.console.error = (...args) => { errStr += args.join(' ') + '\\\\n'; };
        context.console.warn = (...args) => { errStr += args.join(' ') + '\\\\n'; };
        
        let result;
        try {
            result = vm.runInContext(code, context);
            // Auto-print result if it's not undefined and nothing else was printed
            if (result !== undefined && outStr === '') {
                 outStr += String(result) + '\\\\n';
            }
        } catch (e) {
            errStr += e.stack || e.message || String(e);
        } finally {
            // Restore console
            context.console.log = originalLog;
            context.console.error = originalError;
            context.console.warn = originalWarn;
        }
        
        const response = { stdout: outStr, stderr: errStr, images: [] };
        process.stdout.write(JSON.stringify(response) + "\\\\n");
        
    } catch (e) {
        const errResp = { stdout: "", stderr: "JSON Parsing error: " + e.message, images: [] };
        process.stdout.write(JSON.stringify(errResp) + "\\\\n");
    }
});
`;
    }

    initNodeProcess() {
        if (this.nodeProcess) {
            this.nodeProcess.kill();
        }

        fs.writeFileSync(this.nodeWorkerPath, this.nodeWorkerCode);

        this.nodeProcess = spawn('node', [this.nodeWorkerPath], {
            stdio: ['pipe', 'pipe', 'inherit']
        });

        let dataBuffer = "";

        this.nodeProcess.stdout.on('data', (data) => {
            dataBuffer += data.toString();
            let lines = dataBuffer.split('\n');
            dataBuffer = lines.pop(); 

            for (let line of lines) {
                if (line.trim() === '') continue;
                try {
                    const response = JSON.parse(line);
                    
                    if (response.status === "READY") {
                        this.isNodeReady = true;
                        console.log("[SANDBOX] Persistent Node Sandbox is READY.");
                        continue;
                    }

                    if (this.currentNodeQueue.length > 0) {
                        const { resolve } = this.currentNodeQueue.shift();
                        resolve({ result: response.stdout, stderr: response.stderr, images: response.images || [] });
                    } else {
                        console.warn("[SANDBOX] Received Node output but no request was pending:", response);
                    }
                } catch (e) {
                    console.error("[SANDBOX] Failed to parse Node worker response:", line, e);
                     if (this.currentNodeQueue.length > 0) {
                        const { reject } = this.currentNodeQueue.shift();
                        reject(new Error("Failed to parse Node sandbox output"));
                    }
                }
            }
        });

        this.nodeProcess.on('close', (code) => {
            console.log(`[SANDBOX] Node Worker process exited with code ${code}`);
            this.isNodeReady = false;
            while(this.currentNodeQueue.length > 0) {
                const { reject } = this.currentNodeQueue.shift();
                reject(new Error("Node Sandbox process closed unexpectedly."));
            }
        });
    }

    initProcess() {
        if (this.process) {
            this.process.kill();
        }

        fs.writeFileSync(this.workerPath, this.workerCode);

        let commandPath = fs.existsSync(PYTHON_BIN) ? PYTHON_BIN : 'python3';
        
        // Match existing python.routes.js venv logic if needed, but for sandbox we'll stick to the base or local python
        if (fs.existsSync(VENV_DIR)) {
            const platform = os.platform();
            if (platform === 'win32') {
                commandPath = path.join(VENV_DIR, 'Scripts', 'python.exe');
            } else {
                commandPath = path.join(VENV_DIR, 'bin', 'python');
            }
        }

        this.process = spawn(commandPath, [this.workerPath], {
            stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin and stdout, inherit stderr for critical fatal errors
        });

        let dataBuffer = "";

        this.process.stdout.on('data', (data) => {
            dataBuffer += data.toString();
            
            // Note: The Python script ends responses with a newline
            let lines = dataBuffer.split('\n');
            
            // Keep the last incomplete line in the buffer
            dataBuffer = lines.pop(); 

            for (let line of lines) {
                if (line.trim() === '') continue;
                try {
                    const response = JSON.parse(line);
                    
                    if (response.status === "READY") {
                        this.isReady = true;
                        console.log("[SANDBOX] Persistent Python Sandbox is READY.");
                        continue;
                    }

                    if (this.currentQueue.length > 0) {
                        const { resolve } = this.currentQueue.shift();
                        resolve({ result: response.stdout, stderr: response.stderr, images: response.images || [] });
                    } else {
                        console.warn("[SANDBOX] Received output but no request was pending:", response);
                    }
                } catch (e) {
                    console.error("[SANDBOX] Failed to parse worker response:", line, e);
                     if (this.currentQueue.length > 0) {
                        const { reject } = this.currentQueue.shift();
                        reject(new Error("Failed to parse sandbox output"));
                    }
                }
            }
        });

        this.process.on('close', (code) => {
            console.log(`[SANDBOX] Worker process exited with code ${code}`);
            this.isReady = false;
            
            // Fail any pending requests
            while(this.currentQueue.length > 0) {
                const { reject } = this.currentQueue.shift();
                reject(new Error("Sandbox process closed unexpectedly."));
            }
        });
    }

    /**
     * Restart both processes
     */
    reset() {
        console.log("[SANDBOX] Resetting sandbox environments...");
        this.initProcess();
        this.initNodeProcess();
        return { success: true, message: "Sandbox states cleared and restarted." };
    }

    /**
     * Execute a block of python code inside the persistent sandbox
     */
    async execute(code) {
        // Automatically restart if process died
        if (!this.process || this.process.killed) {
             this.initProcess();
             // wait a brief moment for it to be ready
             await new Promise(r => setTimeout(r, 500)); 
        }

        return new Promise((resolve, reject) => {
            this.currentQueue.push({ resolve, reject });
            const payload = JSON.stringify({ code }) + "\n";
            
            try {
                this.process.stdin.write(payload);
            } catch (e) {
                // If writing fails, reject immediately and remove from queue
                this.currentQueue.pop();
                reject(e);
            }
        });
    }

    /**
     * Execute a block of JS code inside the persistent Node.js sandbox
     */
    async executeNode(code) {
        // Automatically restart if process died
        if (!this.nodeProcess || this.nodeProcess.killed) {
             this.initNodeProcess();
             await new Promise(r => setTimeout(r, 500)); 
        }

        return new Promise((resolve, reject) => {
            this.currentNodeQueue.push({ resolve, reject });
            const payload = JSON.stringify({ code }) + "\n";
            
            try {
                this.nodeProcess.stdin.write(payload);
            } catch (e) {
                this.currentNodeQueue.pop();
                reject(e);
            }
        });
    }

    cleanup() {
        if (this.process) {
            this.process.kill();
        }
        if (this.nodeProcess) {
            this.nodeProcess.kill();
        }
        if (fs.existsSync(this.workerPath)) {
            try {
                fs.unlinkSync(this.workerPath);
            } catch (e) {
                console.warn("[SANDBOX] Cleanup unlink failed for Python worker:", e.message);
            }
        }
        if (fs.existsSync(this.nodeWorkerPath)) {
            try {
                fs.unlinkSync(this.nodeWorkerPath);
            } catch (e) {
                console.warn("[SANDBOX] Cleanup unlink failed for Node worker:", e.message);
            }
        }
    }
}

export const sandboxService = new SandboxService();

// Clean up temp file on exit
process.on('exit', () => sandboxService.cleanup());
process.on('SIGINT', () => {
    sandboxService.cleanup();
    process.exit();
});
