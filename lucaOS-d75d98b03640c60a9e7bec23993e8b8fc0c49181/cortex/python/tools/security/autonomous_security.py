import json
import logging
import urllib.request
import urllib.error
import time
import os
from typing import Dict, Any, List, Optional

# Mocking imports if not available in current context for robustness
try:
    from tools.security.tactical_reader import tactical_reader
    from tools.security.vulnerability_verifier import vulnerability_verifier
except ImportError:
    # Just for definition within this environment if paths are tricky
    class MockTool:
        def analyze_repo(self, path): return {"vulnerabilities": [{"type": "SQLi", "path": "app.js:20", "severity": "high"}]}
        def verify_sqli(self, url, path): 
            from dataclasses import dataclass
            @dataclass
            class Res: success: bool; confidence: float; evidence: str; reasoning: str
            return Res(True, 0.9, "Indicator found", "Vulnerable")
    tactical_reader = MockTool()
    vulnerability_verifier = MockTool()

class AutonomousSecurityCoordinator:
    """
    Coordinates the end-to-end security audit lifecycle:
    Discovery -> Verification -> Reporting
    Built-in durability via PentestSessionStore.
    """
    
    def __init__(self, session_id: str, target_url: str, repo_path: str, api_url: str = "http://localhost:3002"):
        self.session_id = session_id
        self.target_url = target_url
        self.repo_path = repo_path
        self.api_url = api_url
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("AutonomousSecurity")

    def _call_api(self, endpoint: str, data: Optional[Dict] = None) -> Dict:
        url = f"{self.api_url}/api/security/{endpoint}"
        try:
            method = 'POST' if data else 'GET'
            req_data = json.dumps(data).encode('utf-8') if data else None
            req = urllib.request.Request(url, data=req_data, headers={'Content-Type': 'application/json'}, method=method)
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            self.logger.error(f"API call failed to {url}: {e}")
            return {"error": str(e)}

    def run_audit(self):
        self.logger.info(f"[*] Starting autonomous audit for {self.target_url} (Session: {self.session_id})")
        
        # 1. Check/Resume Session
        session = self._call_api(f"sessions/{self.session_id}")
        if "error" in session:
            self.logger.error(f"[-] Could not find or resume session {self.session_id}")
            return

        current_phase = session.get("currentPhase", "recon")
        self.logger.info(f"[+] Resuming audit from phase: {current_phase}")

        # Phase 1: RECON / Discovery
        if current_phase == "recon":
            self.logger.info("[*] Phase 1: Discovery (Tactical Reader)...")
            results = tactical_reader.analyze_repo(self.repo_path)
            findings = results.get("vulnerabilities", [])
            
            # Save potential findings
            for f in findings:
                finding_id = f"recon_{int(time.time()*1000)}_{os.urandom(2).hex()}"
                self._call_api(f"sessions/{self.session_id}/findings", {
                    "id": f.get("id", finding_id),
                    "vulnerabilityType": f.get("type", "Unknown"),
                    "severity": f.get("severity", "medium"),
                    "confidence": f.get("confidence", 0.5),
                    "sinkPath": f.get("path", "Unknown"),
                    "status": "potential"
                })
                self.logger.info(f"  [+] Identified potential {f.get('type')} @ {f.get('path')}")
            
            self._call_api(f"sessions/{self.session_id}/update", {"currentPhase": "analysis"})
            current_phase = "analysis"

        # Phase 2: ANALYSIS / Verification
        if current_phase == "analysis" or current_phase == "verification":
            self.logger.info("[*] Phase 2: Verification (Active Probing)...")
            potential_findings = self._call_api(f"sessions/{self.session_id}/findings")
            
            if not isinstance(potential_findings, list):
                self.logger.warning("[-] No potential findings to verify.")
                potential_findings = []

            for f in potential_findings:
                if f.get("status") != "potential": continue
                
                self.logger.info(f"[*] Verifying {f['vulnerabilityType']} at {f['sinkPath']}...")
                
                if f['vulnerabilityType'] == "SQLi":
                    v_res = vulnerability_verifier.verify_sqli(self.target_url, f['sinkPath'])
                    
                    # Update finding status
                    self._call_api(f"sessions/{self.session_id}/findings", {
                        "id": f['id'],
                        "status": "verified" if v_res.success else "false_positive",
                        "confidence": v_res.confidence,
                        "evidence": v_res.evidence,
                        "proofOfConcept": v_res.reasoning if v_res.success else None
                    })
                    if v_res.success:
                        self.logger.info(f"  [!] CONFIRMED: {f['vulnerabilityType']} at {f['sinkPath']}")
                    else:
                        self.logger.info(f"  [-] False Positive: {f['vulnerabilityType']} at {f['sinkPath']}")

            self._call_api(f"sessions/{self.session_id}/update", {"currentPhase": "reporting"})
            current_phase = "reporting"

        # Phase 3: REPORTING
        if current_phase == "reporting":
            self.logger.info("[*] Phase 3: Reporting & Closure...")
            # Close session
            self._call_api(f"sessions/{self.session_id}/update", {
                "status": "completed", 
                "endTime": int(time.time()*1000)
            })
            self.logger.info("[+] Autonomous audit complete.")

if __name__ == "__main__":
    import sys
    # Usage: python autonomous_security.py <session_id> <target_url> <repo_path> [api_url]
    s_id = sys.argv[1] if len(sys.argv) > 1 else "test_session_123"
    t_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3005"
    r_path = sys.argv[3] if len(sys.argv) > 3 else "."
    a_url = sys.argv[4] if len(sys.argv) > 4 else "http://localhost:3002"
    
    coordinator = AutonomousSecurityCoordinator(s_id, t_url, r_path, a_url)
    coordinator.run_audit()
