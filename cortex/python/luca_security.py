"""
Luca Cortex — security gate (Phase 1).

Honors the LucaOS Security Doctrine: sensitive actions are gated, and the
backend is not an unauthenticated network surface. This module provides:

  * the shared master token (same secret the Node relay's SecurityManager uses,
    at ~/.luca/security/luca_secret.key, env LUCA_SECRET takes priority),
  * a timing-safe validator,
  * the CORS origin allowlist (replaces the previous wildcard + credentials),
  * `require_privileged` — a FastAPI dependency for powerful routers that allows
    local desktop callers (loopback) but requires the master token for any
    non-local (remote) caller, failing closed when no secret is configured.

Threat model: the desktop app talks to Cortex over loopback and is trusted by
the OS boundary; the real risk is remote/network exposure of powerful routes
(OSINT, pentest, automation, build). This gate closes that without breaking the
local desktop flow.
"""
import os
import hmac

try:
    from fastapi import Request, HTTPException
except Exception:  # pragma: no cover - fastapi always present at runtime
    Request = None  # type: ignore
    HTTPException = Exception  # type: ignore

# Loopback hosts that represent the local desktop app itself.
_LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost"}

# Path to the shared secret written by the Node relay's SecurityManager.
_SECRET_FILE = os.path.join(
    os.path.expanduser("~"), ".luca", "security", "luca_secret.key"
)


def get_master_token():
    """Resolve the shared master token. Priority: env LUCA_SECRET > disk file.

    Returns None when no secret is configured (in which case remote access is
    denied — fail closed)."""
    env_token = os.environ.get("LUCA_SECRET")
    if env_token:
        return env_token.strip()
    try:
        if os.path.exists(_SECRET_FILE):
            with open(_SECRET_FILE, "r", encoding="utf-8") as fh:
                token = fh.read().strip()
                return token or None
    except OSError:
        pass
    return None


def validate_token(received):
    """Timing-safe comparison of a received token against the master token."""
    token = get_master_token()
    if not token or not received:
        return False
    return hmac.compare_digest(token, received)


def is_loopback(request) -> bool:
    """True when the request originates from the local machine (desktop app)."""
    client = getattr(request, "client", None)
    host = getattr(client, "host", None) if client else None
    return host in _LOOPBACK_HOSTS


def _bearer_token(request):
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth:
        # Fall back to the relay's header convention.
        return request.headers.get("x-luca-token") or request.headers.get("X-Luca-Token")
    parts = auth.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return auth.strip()


def require_privileged(request: "Request"):
    """FastAPI dependency for powerful routers.

    Local desktop (loopback) callers pass. Remote callers must present a valid
    master token. If no secret is configured, remote callers are denied."""
    if is_loopback(request):
        return True
    if validate_token(_bearer_token(request)):
        return True
    raise HTTPException(
        status_code=403,
        detail="Privileged Cortex route requires the Luca master token for remote access.",
    )


def allowed_origins():
    """CORS origin allowlist. Override with LUCA_CORTEX_ALLOWED_ORIGINS
    (comma-separated). Defaults to the local Electron/Vite origins."""
    raw = os.environ.get("LUCA_CORTEX_ALLOWED_ORIGINS")
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    # Vite dev server, Electron file origin, and loopback API hosts.
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "app://.",
        "file://",
    ]
