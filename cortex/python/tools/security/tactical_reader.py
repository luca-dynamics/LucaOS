import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any

class TacticalReader:
    """
    Tactical Code Reader - Source Awareness Module
    Scans repositories for attack surfaces to auto-configure hacking tools.
    """
    
    def __init__(self):
        # High-Speed Regex Patterns for "Attack Surface" Mapping
        self.PATTERNS = {
            "node": {
                "route": [
                    r'app\.(?:get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]',  # app.get('/route')
                    r'router\.(?:get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]', # router.get('/route')
                ],
                "sink_sql": [
                    r'(?:execute|query|get|run|all)\s*\(\s*.*[\'"]SELECT.*[\'"]\s*\+', # Concatenation inside call
                    r'[\'"]SELECT.*[\'"]\s*\+\s*\w+',                              # Concatenation outside call
                    r'\.query\s*\(\s*[\'"].*\$\{',                                 # Template literal
                ],
                "sink_exec": [
                    r'exec\s*\(([^,]+)\)',
                    r'spawn\s*\(([^,]+)\)',
                    r'eval\s*\(([^,]+)\)'
                ],
                "secret": [
                    r'[\'"](AWS|API|SECRET)_[A-Z_]+[\'"]\s*[:=]\s*[\'"]([A-Za-z0-9+/=]+)[\'"]',
                ]
            },
            "python": {
                "route": [
                    r'@(?:app|router)\.(?:route|get|post|put|delete)\s*\(\s*[\'"]([^\'"]+)[\'"]', # Combined Flask/FastAPI
                ],
                "sink_sql": [
                    r'execute\s*\(\s*f[\'"]SELECT',             # f-string SQL
                    r'execute\s*\(\s*[\'"]SELECT.*%\s',         # % formatting SQL
                ],
                "sink_exec": [
                    r'os\.system\s*\((.*)\)',
                    r'subprocess\.call\s*\((.*)\)',
                    r'eval\s*\((.*)\)'
                ]
            }
        }

    def analyze_repo(self, repo_path: str) -> Dict[str, Any]:
        """
        Scans a repository path and returns an 'Attack Config' object.
        """
        repo = Path(repo_path)
        if not repo.exists():
            return {"error": "Path not found"}

        results = {
            "metadata": {"path": str(repo), "languages": []},
            "attack_surface": {
                "routes": set(),
                "potential_sqli": [],
                "potential_rce": [],
                "secrets": []
            },
            "suggested_tools": []
        }

        # Detect Language (Relaxed)
        # Just assume based on file extensions found during walk if metadata checks fail
        has_js = list(repo.glob("**/*.js")) or list(repo.glob("**/*.ts"))
        has_py = list(repo.glob("**/*.py"))
        
        langs = []
        if has_js: langs.append("node")
        if has_py: langs.append("python")
        results["metadata"]["languages"] = langs

        # Walk and Scan
        for root, dirs, files in os.walk(repo):
            # Efficiently skip excluded directories
            dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "venv", "__pycache__", "dist", "build"]]
                
            for file in files:
                file_path = Path(root) / file
                
                # Check extension matches language
                scan_mode = None
                if file.endswith(('.js', '.ts')):
                    scan_mode = "node"
                elif file.endswith('.py'):
                    scan_mode = "python"
                
                if scan_mode:
                    self._scan_file(file_path, scan_mode, results["attack_surface"])

        # Post-Process: List -> Set -> List for routes
        results["attack_surface"]["routes"] = sorted(list(results["attack_surface"]["routes"]))
        
        # Weaponize
        self._generate_tool_configs(results)
        
        return results

    def _scan_file(self, file_path: Path, mode: str, surface: Dict):
        try:
            content = file_path.read_text(errors='ignore')
            patterns = self.PATTERNS[mode]
            rel_path = file_path.name
            
            # Routes
            for p in patterns["route"]:
                matches = re.findall(p, content)
                for m in matches:
                    # re.findall returns string if 1 group, tuple if >1
                    if isinstance(m, tuple):
                         # If we added more groups later, handle it. 
                         # For now, our patterns have 1 capturing group.
                         route = m[0]
                    else:
                         route = m
                    
                    if route and len(route) > 1: # Filter empty or tiny noise
                        surface["routes"].add(route)

            # SQLi
            for p in patterns["sink_sql"]:
                for m in re.finditer(p, content):
                    line_no = content[:m.start()].count('\n') + 1
                    surface["potential_sqli"].append(f"{rel_path}:{line_no}")

            # RCE
            for p in patterns["sink_exec"]:
                for m in re.finditer(p, content):
                    line_no = content[:m.start()].count('\n') + 1
                    surface["potential_rce"].append(f"{rel_path}:{line_no}")

        except Exception as e:
            print(f"Error scanning {file_path}: {e}")

    def _generate_tool_configs(self, results: Dict):
        """
        Maps findings to actual tool commands.
        """
        surface = results["attack_surface"]
        tools = results["suggested_tools"]
        
        # 1. Weaponize Routes (Gobuster/Burp)
        if surface["routes"]:
             # Structured Config for downstream execution
             tools.append({
                 "tool": "gobuster",
                 "description": f"Found {len(surface['routes'])} valid routes in code.",
                 "command_template": "gobuster dir -u <TARGET> -w <WORDLIST> --no-error",
                 "args": {
                     "wordlist": surface["routes"]
                 }
             })
        
        # 2. Weaponize SQLi (SQLMap)
        for sqli in surface["potential_sqli"]:
            tools.append({
                "tool": "sqlmap",
                "description": f"Potential SQL Injection source at {sqli}",
                "command_template": "sqlmap -u <TARGET> --batch --forms",
                "args": {
                    "risk": 3,
                    "level": 5
                }
            })

tactical_reader = TacticalReader()
