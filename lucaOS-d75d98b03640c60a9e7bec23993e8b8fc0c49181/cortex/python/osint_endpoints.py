from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from tools.osint.osint_service import identity_service

router = APIRouter(prefix="/api/osint", tags=["osint"])

class IdentitySearchRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    method: str = "quick" # quick, deep

@router.post("/identity")
async def search_identity(request: IdentitySearchRequest):
    """
    Search for identity across social networks.
    """
    results = {}
    
    # 1. Username Search
    if request.username:
        print(f"[OSINT] Searching username: {request.username} (Method: {request.method})")
        username_results = await identity_service.search_username(request.username, request.method)
        results["username_scan"] = username_results

    # 2. Email Search
    if request.email:
         print(f"[OSINT] Searching email: {request.email}")
         email_results = await identity_service.check_email(request.email)
         results["email_scan"] = email_results
         
    return {"status": "success", "data": results}

@router.get("/status")
async def osint_status():
    return {"status": "active", "tools": ["blackbird", "maigret", "holehe", "ghunt", "dnspython", "python-whois"]}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOOL INSTALLATION MANAGER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OSINT_PACKAGES = {
    "holehe": "holehe",
    "maigret": "maigret",
    "dnspython": "dnspython",
    "whois": "python-whois",
    "tor": "pysocks"
}

@router.get("/tools/status")
async def check_osint_tools():
    """Check installation status of OSINT tools"""
    tools_status = {}
    
    # Check each tool by trying to import
    try:
        import holehe
        tools_status["holehe"] = True
    except ImportError:
        tools_status["holehe"] = False
    
    try:
        import maigret
        tools_status["maigret"] = True
    except ImportError:
        tools_status["maigret"] = False
    
    try:
        import dns.resolver
        tools_status["dnspython"] = True
    except ImportError:
        tools_status["dnspython"] = False
    
    try:
        import whois
        tools_status["whois"] = True
    except ImportError:
        tools_status["whois"] = False
    
    try:
        import socks
        tools_status["tor"] = True
    except ImportError:
        tools_status["tor"] = False
    
    return {
        "status": "success",
        "tools": tools_status
    }

class InstallToolRequest(BaseModel):
    tool_name: str

@router.post("/tools/install")
async def install_osint_tool(request: InstallToolRequest):
    """Install an OSINT tool via pip"""
    tool = request.tool_name.lower()
    
    if tool not in OSINT_PACKAGES:
        raise HTTPException(status_code=400, detail=f"Unknown tool: {tool}")
    
    package_name = OSINT_PACKAGES[tool]
    
    try:
        # Use sys.executable to ensure we use the venv's pip
        process = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "pip", "install", package_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            return {
                "status": "success",
                "message": f"Successfully installed {package_name}",
                "output": stdout.decode()
            }
        else:
            return {
                "status": "error",
                "message": f"Failed to install {package_name}",
                "output": stderr.decode()
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOMAIN INTELLIGENCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class DomainRequest(BaseModel):
    domain: str

@router.post("/domain")
async def osint_domain_intel(request: DomainRequest):
    """Gather DNS and WHOIS intelligence on a domain."""
    intel = {"domain": request.domain, "dns": {}, "whois": None}

    # DNS Lookups
    try:
        import dns.resolver
        resolver = dns.resolver.Resolver()
        resolver.timeout = 5
        resolver.lifetime = 5
        
        for record_type in ["A", "MX", "TXT", "NS"]:
            try:
                answers = resolver.resolve(request.domain, record_type)
                intel["dns"][record_type] = [str(rdata) for rdata in answers]
            except dns.resolver.NoAnswer:
                pass
            except dns.resolver.NXDOMAIN:
                intel["dns"]["error"] = "Domain does not exist"
                break
            except Exception:
                pass
    except ImportError:
        intel["dns"]["error"] = "dnspython not installed. Run: pip install dnspython"

    # WHOIS Lookup
    try:
        import whois
        w = whois.whois(request.domain)
        intel["whois"] = {
            "source": "python-whois",
            "data": {
                "registrar": w.registrar,
                "creation_date": str(w.creation_date) if w.creation_date else None,
                "expiration_date": str(w.expiration_date) if w.expiration_date else None,
                "name_servers": w.name_servers if hasattr(w, 'name_servers') else None,
            }
        }
    except ImportError:
        intel["whois"] = {"error": "python-whois not installed. Run: pip install python-whois"}
    except Exception as e:
        intel["whois"] = {"error": str(e)}

    return {"status": "success", "intel": intel}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GOOGLE DORK
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class DorkRequest(BaseModel):
    query: str
    engine: str = "google"

@router.post("/dork")
async def osint_google_dork(request: DorkRequest):
    """Execute a Google Dork search. Returns constructed URL."""
    dork_templates = {
        "google": f"https://www.google.com/search?q={request.query.replace(' ', '+')}",
        "bing": f"https://www.bing.com/search?q={request.query.replace(' ', '+')}",
        "duckduckgo": f"https://duckduckgo.com/?q={request.query.replace(' ', '+')}"
    }
    return {
        "status": "success",
        "query": request.query,
        "engine": request.engine,
        "search_url": dork_templates.get(request.engine, dork_templates["google"]),
        "note": "Execute this URL in a browser or use SerpApi for automated results."
    }

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DARK WEB SCAN (REAL - REQUIRES TOR)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DARKWEB_DISCLAIMER = """
⚠️ LEGAL DISCLAIMER ⚠️
This tool accesses the Tor network to search .onion sites.
- You are solely responsible for ensuring your use complies with local laws.
- This tool is intended for authorized security research only.
- The developers assume no liability for misuse.
"""

class DarkWebRequest(BaseModel):
    query: str
    accept_disclaimer: bool = False

@router.post("/darkweb")
async def osint_darkweb_scan(request: DarkWebRequest):
    """Search .onion sites via Tor proxy. REQUIRES: Tor running on localhost:9050"""
    
    if not request.accept_disclaimer:
        return {
            "status": "disclaimer_required",
            "disclaimer": DARKWEB_DISCLAIMER,
            "message": "You must accept the disclaimer to proceed. Set 'accept_disclaimer: true'."
        }
    
    # Check if Tor is running
    try:
        import socks
        import socket
        
        test_socket = socks.socksocket()
        test_socket.set_proxy(socks.SOCKS5, "127.0.0.1", 9050)
        test_socket.settimeout(5)
        try:
            test_socket.connect(("check.torproject.org", 80))
            test_socket.close()
        except Exception as e:
            return {
                "status": "error",
                "message": f"Tor proxy not available at 127.0.0.1:9050. Error: {e}",
                "disclaimer": DARKWEB_DISCLAIMER
            }
    except ImportError:
        return {
            "status": "error",
            "message": "PySocks not installed. Run: pip install pysocks",
            "disclaimer": DARKWEB_DISCLAIMER
        }

    # Perform search via Tor
    try:
        import requests
        
        proxies = {
            "http": "socks5h://127.0.0.1:9050",
            "https": "socks5h://127.0.0.1:9050"
        }
        
        # Search ahmia.fi (clearnet gateway to .onion search)
        search_url = f"https://ahmia.fi/search/?q={request.query.replace(' ', '+')}"
        response = requests.get(search_url, proxies=proxies, timeout=30)
        
        return {
            "status": "success",
            "query": request.query,
            "search_engine": "ahmia.fi",
            "results_preview": response.text[:2000] if response.ok else "No results",
            "disclaimer": DARKWEB_DISCLAIMER
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "disclaimer": DARKWEB_DISCLAIMER
        }
