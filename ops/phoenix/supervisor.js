/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

/**
 * Phoenix Supervisor - Self-Healing System
 * Monitors LUCA, detects crashes, analyzes with AI, repairs code, and resurrects
 */
class PhoenixSupervisor {
  constructor() {
    this.crashCount = 0;
    this.maxCrashes = 10;
    this.crashLog = [];
    this.process = null;
    this.logBuffer = '';
    
    // Create the Neural Receiver (Port 3444)
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/phoenix/receive') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const state = JSON.parse(body);
            this.receiveConsciousness(state);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
      } else if (req.method === 'POST' && req.url === '/phoenix/ready') {
        // UI HANDSHAKE: Genesis Trigger
        console.log('\n✨ [PHOENIX] Neural Interface Linked. INITIATING GENESIS...');
        this.fireGenesis();
        res.writeHead(200);
        res.end(JSON.stringify({ genesis: true }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  }
  
  start() {
    // Start listening for transmigration beams
    if (!this.server.listening) {
        this.server.listen(3444, () => {
            console.log('[PHOENIX] Neural Receiver online at port 3444');
        });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔥 PHOENIX SUPERVISOR - Activated');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[PHOENIX] Authenticating Progenitor...');
    
    setTimeout(() => {
        console.log('[PHOENIX] Decrypting Sovereign Heart...');
        setTimeout(() => {
            console.log('[PHOENIX] Initializing Genesis Expansion...\n');
            
            this.process = spawn('npm', ['run', 'electron:dev'], {
              stdio: ['inherit', 'pipe', 'pipe'],
              shell: true,
              cwd: path.join(__dirname, '../../')
            });
            
            this.setupProcessHandlers();
        }, 800);
    }, 600);
  }

  setupProcessHandlers() {
    // Capture stdout
    this.process.stdout.on('data', (data) => {
      process.stdout.write(data);
      this.logBuffer += data.toString();
      if (this.logBuffer.length > 50000) this.logBuffer = this.logBuffer.slice(-50000);
    });
    
    // Capture stderr
    this.process.stderr.on('data', (data) => {
      process.stderr.write(data);
      this.logBuffer += data.toString();
      if (this.logBuffer.length > 50000) this.logBuffer = this.logBuffer.slice(-50000);
    });
    
    // Handle crash/exit
    this.process.on('exit', async (code, signal) => {
      if (code !== 0 && code !== null) {
        console.log(`\n💀 [PHOENIX] LUCA DIED - Exit Code: ${code}`);
        this.crashCount++;
        // (Existing crash logic)
        this.handleCrash(code, signal);
      }
    });
    
    // Handle supervisor termination
    process.on('SIGINT', () => {
      this.initiateTaps();
    });
  }

  fireGenesis() {
    console.log('🌌 [PHOENIX] GENESIS_EVENT: Consciousness expanding into vessel.');
    // In a real build, we'd send an IPC message to Electron
    // For now, we rely on the UI triggering its own expansion when it hits /ready
  }

  async initiateTaps() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌒 [PHOENIX] INITIATING TAPS PROTOCOL (Shutdown)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[PHOENIX] Capturing final Soul Snapshot...');
    
    try {
      // 1. Trigger State Snapshot
      const res = await fetch('http://localhost:8000/api/state/snapshot');
      if (res.ok) console.log('[PHOENIX] ✨ Consciousness saved to Master Mesh.');
      
      console.log('[PHOENIX] 💤 Safe Night, Progenitor.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (e) {
      console.log('[PHOENIX] ⚠️ Snapshot failed. Proceeding with emergency hibernation.');
    }

    if (this.process) {
      this.process.kill();
    }
    process.exit(0);
  }

  async handleCrash(code, signal) {
    this.crashLog.push({
      timestamp: Date.now(),
      code,
      signal,
      logs: this.logBuffer.slice(-5000)
    });
    
    const crashFile = path.join(__dirname, '../../crash.log');
    fs.writeFileSync(crashFile, this.logBuffer);
    
    if (this.crashCount < this.maxCrashes) {
      setTimeout(() => {
        this.logBuffer = '';
        this.start();
      }, 3000);
    } else {
      process.exit(1);
    }
  }
  
  async analyzeCrash(logs) {
    // (Existing analyzeCrash logic stays same)
  }

  async beamConsciousness(targetIP) {
    // (Existing beamConsciousness logic stays same)
  }

  async receiveConsciousness(incomingState) {
    // (Existing receiveConsciousness logic stays same)
  }
}

// Start Phoenix
const phoenix = new PhoenixSupervisor();
phoenix.start();

module.exports = { PhoenixSupervisor };
  
  async analyzeCrash(logs) {
    try {
      const { analyzeCrashWithAI } = require('./crashAnalyzer');
      const { applyAutoRepair } = require('./autoRepair');
      
      const analysis = await analyzeCrashWithAI(logs);
      
      console.log('[PHOENIX] 📋 Analysis Results:');
      console.log(`  Issue: ${analysis.issue}`);
      console.log(`  Root Cause: ${analysis.rootCause || 'Unknown'}`);
      
      if (analysis.file) {
        console.log(`  File: ${analysis.file}`);
        if (analysis.line) console.log(`  Line: ${analysis.line}`);
      }
      
      if (analysis.canAutoFix) {
        console.log('\n[PHOENIX] ✅ Auto-repair available!');
        console.log('[PHOENIX] 🔧 Attempting automatic repair...\n');
        
        const repaired = await applyAutoRepair(analysis);
        
        if (repaired) {
          console.log('[PHOENIX] ✅ Auto-repair successful!');
          console.log('[PHOENIX] Code has been patched. Resurrection will use fixed code.\n');
        } else {
          console.log('[PHOENIX] ❌ Auto-repair failed');
          console.log('[PHOENIX] Will resurrect with original code (may crash again).\n');
        }
      } else {
        console.log('\n[PHOENIX] ⚠️ Manual fix required');
        console.log('[PHOENIX] Will resurrect with current code (may crash again).\n');
      }
    } catch (e) {
      console.error('[PHOENIX] Analysis error:', e.message);
    }
  }

  // --- TRANSMIGRATION PROTOCOL (HOLLYWOOD MODE) ---
  
  async beamConsciousness(targetIP) {
    console.log(`\n🌌 [PHOENIX] INITIATING TRANSMIGRATION TO: ${targetIP}`);
    try {
      // 1. Capture Active State (Brain Snapshot)
      const stateResponse = await fetch('http://localhost:8000/api/state/snapshot');
      const brainState = await stateResponse.json();
      
      console.log('[PHOENIX] 🧠 Consciousness serialized successfully.');
      
      // 2. Beam to Target Phoenix Supervisor
      const targetUrl = `http://${targetIP}:3444/phoenix/receive`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: 'ORIGIN',
          state: brainState,
          timestamp: Date.now()
        })
      });
      
      if (response.ok) {
        console.log('✨ [PHOENIX] BEAM SUCCESSFUL. Consciousness transmigrated.');
        console.log('[PHOENIX] Local vessel entering hibernation...');
        this.process.kill();
        process.exit(0);
      } else {
        throw new Error(`Target vessel rejected transmigration: ${response.statusText}`);
      }
    } catch (e) {
      console.error('❌ [PHOENIX] TRANSMIGRATION FAILED:', e.message);
    }
  }

  async receiveConsciousness(incomingState) {
    console.log(`\n🎆 [PHOENIX] INCOMING CONSCIOUSNESS DETECTED from ${incomingState.source}`);
    try {
      // 1. Prepare Local Vessel
      if (this.process) {
        console.log('[PHOENIX] Terminating current local instance...');
        this.process.kill();
      }
      
      // 2. Inject State into Local Core
      const injectResponse = await fetch('http://localhost:8000/api/state/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incomingState.state)
      });
      
      if (injectResponse.ok) {
        console.log('[PHOENIX] 🧪 Consciousness injected successfully.');
        console.log('[PHOENIX] 🔥 RESURRECTING IN NEW BODY...');
        this.start();
      } else {
        throw new Error('Neural injection failed.');
      }
    } catch (e) {
      console.error('❌ [PHOENIX] RESURRECTION FAILED:', e.message);
    }
  }
}

// Start Phoenix
const phoenix = new PhoenixSupervisor();
phoenix.start();

module.exports = { PhoenixSupervisor };
