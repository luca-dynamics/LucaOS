"""
Quality Gate Tool Endpoints - Phase 6
Backend APIs for linter, test runner, security scanner
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import subprocess
import json
import os

# Create router
router = APIRouter()

# === MODELS ===

class LintRequest(BaseModel):
    files: List[str]

class TestRequest(BaseModel):
    testPattern: Optional[str] = None

class VisionAnalysisRequest(BaseModel):
    image: str
    task: str

class SecurityScanRequest(BaseModel):
    files: List[str]

# === HELPER FUNCTIONS ===

def run_command(cmd: List[str], cwd: str = ".") -> Dict[str, Any]:
    """Run shell command and return result"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Command timeout"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# === ENDPOINTS ===

@router.post("/api/tools/lint")
async def lint_code(request: LintRequest):
    """Run ESLint on specified files"""
    try:
        # Check if eslint is available
        check_result = run_command(["which", "eslint"])
        if not check_result["success"]:
            return {
                "errors": [],
                "warnings": [],
                "message": "ESLint not installed"
            }
        
        # Run eslint
        files_str = " ".join(request.files) if request.files else "src/**/*.{ts,tsx,js,jsx}"
        result = run_command(["npx", "eslint", "--format", "json", files_str])
        
        if result.get("stdout"):
            lint_results = json.loads(result["stdout"])
            
            errors = []
            warnings = []
            
            for file_result in lint_results:
                for message in file_result.get("messages", []):
                    msg = f"{file_result['filePath']}:{message['line']} - {message['message']}"
                    if message['severity'] == 2:
                        errors.append(msg)
                    else:
                        warnings.append(msg)
            
            return {
                "errors": errors,
                "warnings": warnings,
                "filesChecked": len(lint_results)
            }
        
        return {"errors": [], "warnings": [], "filesChecked": 0}
        
    except Exception as e:
        print(f"[TOOLS] Lint error: {str(e)}")
        return {"errors": [str(e)], "warnings": []}


@router.post("/api/tools/typecheck")
async def typecheck_code():
    """Run TypeScript type checking"""
    try:
        # Check if tsc is available
        check_result = run_command(["which", "tsc"])
        if not check_result["success"]:
            return {
                "errors": [],
                "warnings": [],
                "message": "TypeScript not installed"
            }
        
        # Run tsc --noEmit
        result = run_command(["npx", "tsc", "--noEmit"])
        
        errors = []
        warnings = []
        
        if result.get("stderr"):
            # Parse TypeScript errors
            for line in result["stderr"].split("\n"):
                if "error TS" in line:
                    errors.append(line.strip())
                elif "warning TS" in line:
                    warnings.append(line.strip())
        
        return {
            "errors": errors,
            "warnings": warnings,
            "success": len(errors) == 0
        }
        
    except Exception as e:
        print(f"[TOOLS] TypeCheck error: {str(e)}")
        return {"errors": [str(e)], "warnings": []}


@router.post("/api/tools/test")
async def run_tests(request: TestRequest = None):
    """Run test suite"""
    try:
        # Check if test runner is available
        pkg_json_path = "package.json"
        if not os.path.exists(pkg_json_path):
            return {
                "passed": False,
                "message": "No package.json found"
            }
        
        # Run npm test
        result = run_command(["npm", "test", "--", "--run"])
        
        # Parse test results
        passed = result.get("success", False)
        output = result.get("stdout", "")
        
        # Simple parsing (depends on test framework)
        total = 0
        passed_count = 0
        failed_count = 0
        failures = []
        
        for line in output.split("\n"):
            if "passed" in line.lower():
                # Extract numbers
                import re
                numbers = re.findall(r'\d+', line)
                if numbers:
                    passed_count = int(numbers[0])
            if "failed" in line.lower():
                numbers = re.findall(r'\d+', line)
                if numbers:
                    failed_count = int(numbers[0])
            if "FAIL" in line or "✗" in line:
                failures.append(line.strip())
        
        total = passed_count + failed_count
        
        return {
            "passed": passed,
            "total": total,
            "passedCount": passed_count,
            "failed": failed_count,
            "failures": failures
        }
        
    except Exception as e:
        print(f"[TOOLS] Test error: {str(e)}")
        return {
            "passed": False,
            "error": str(e)
        }


@router.post("/api/tools/screenshot")
async def capture_screenshot():
    """Capture screenshot (requires pyautogui)"""
    try:
        if not PYAUTOGUI_AVAILABLE:
            return {"error": "Screenshot not available"}
        
        import base64
        from io import BytesIO
        
        # Take screenshot
        screenshot = pyautogui.screenshot()
        
        # Convert to base64
        buffered = BytesIO()
        screenshot.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "data": f"data:image/png;base64,{img_str}",
            "width": screenshot.width,
            "height": screenshot.height
        }
        
    except Exception as e:
        print(f"[TOOLS] Screenshot error: {str(e)}")
        return {"error": str(e)}


@router.get("/api/tools/check/{tool}")
async def check_tool_available(tool: str):
    """Check if a tool is available"""
    tools_map = {
        "eslint": ["which", "eslint"],
        "tsc": ["which", "tsc"],
        "npm": ["which", "npm"],
        "pytest": ["which", "pytest"]
    }
    
    if tool not in tools_map:
        return {"available": False, "message": "Unknown tool"}
    
    result = run_command(tools_map[tool])
    
    return {
        "available": result.get("success", False),
        "path": result.get("stdout", "").strip() if result.get("success") else None
    }


# === SECURITY ENDPOINTS ===

@router.post("/api/security/scan-secrets")
async def scan_for_secrets(request: SecurityScanRequest):
    """Scan files for secrets/credentials"""
    try:
        secrets_found = []
        
        # Simple pattern matching for common secrets
        secret_patterns = [
            "api_key",
            "apikey",
            "secret",
            "password",
            "token",
            "private_key",
            "aws_access_key"
        ]
        
        for file_path in request.files:
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    content = f.read().lower()
                    for pattern in secret_patterns:
                        if pattern in content:
                            secrets_found.append(f"{file_path}: Potential {pattern} found")
        
        return {
            "secrets": secrets_found,
            "filesScanned": len(request.files)
        }
        
    except Exception as e:
        print(f"[SECURITY] Secret scan error: {str(e)}")
        return {"secrets": [], "error": str(e)}


@router.post("/api/security/scan-vulnerabilities")
async def scan_for_vulnerabilities(request: SecurityScanRequest):
    """Scan for known vulnerabilities"""
    try:
        # Run npm audit if package.json exists
        if any("package.json" in f for f in request.files):
            result = run_command(["npm", "audit", "--json"])
            
            if result.get("stdout"):
                audit_data = json.loads(result["stdout"])
                
                critical = []
                medium = []
                
                for vuln_id, vuln_data in audit_data.get("vulnerabilities", {}).items():
                    severity = vuln_data.get("severity", "")
                    title = vuln_data.get("title", vuln_id)
                    
                    if severity == "critical":
                        critical.append(title)
                    elif severity in ["high", "moderate"]:
                        medium.append(title)
                
                return {
                    "critical": critical,
                    "medium": medium,
                    "total": len(critical) + len(medium)
                }
        
        return {"critical": [], "medium": [], "total": 0}
        
    except Exception as e:
        print(f"[SECURITY] Vulnerability scan error: {str(e)}")
        return {"critical": [], "medium": [], "error": str(e)}


@router.post("/api/osint/check-dependencies")
async def check_dependencies():
    """OSINT check for dependencies"""
    try:
        # Read package.json
        if not os.path.exists("package.json"):
            return {"warnings": [], "checked": 0}
        
        with open("package.json", 'r') as f:
            pkg = json.load(f)
        
        dependencies = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        
        warnings = []
        checked = len(dependencies)
        
        # Simple checks (Phase 6 - can be enhanced with real OSINT)
        for dep_name in dependencies.keys():
            # Check for suspicious patterns
            if "test" in dep_name or "debug" in dep_name:
                continue
            
            # Could integrate with npm registry API here
            # For now, just basic checks
            if len(dep_name) < 3:
                warnings.append(f"Suspicious short package name: {dep_name}")
        
        return {
            "warnings": warnings,
            "checked": checked
        }
        
    except Exception as e:
        print(f"[OSINT] Dependency check error: {str(e)}")
        return {"warnings": [], "checked": 0, "error": str(e)}
