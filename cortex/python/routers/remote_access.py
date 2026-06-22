"""Remote-access PIN subsystem (extracted from cortex.py, Phase 2).

Manages the optional PIN that gates non-local access, plus in-memory validated
sessions. Behaviour is byte-for-byte identical to the previous inline routes;
this module just gives the subsystem a home. cortex.py imports `get_stored_pin`
and `validated_sessions` from here for its verify_session dependency.
"""
import os
import sys
import secrets
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

import state

router = APIRouter(tags=["remote-access"])

# Validated session tokens (in memory, cleared on restart).
validated_sessions = set()


# --- PIN persistence (file-backed, survives restarts) ---
def get_pin_file_path():
    """Get the path to the PIN file."""
    if getattr(sys, "frozen", False):
        base_path = Path(sys.executable).parent / "models"
    else:
        base_path = Path(__file__).parent.parent.parent.parent / "models"
    return base_path / ".remote_access_pin"


def get_stored_pin():
    """Get the stored PIN, or None if not set."""
    pin_file = get_pin_file_path()
    if pin_file.exists():
        return pin_file.read_text().strip()
    return None


def set_stored_pin(pin: str):
    """Store the PIN."""
    pin_file = get_pin_file_path()
    pin_file.parent.mkdir(parents=True, exist_ok=True)
    pin_file.write_text(pin)


def clear_stored_pin():
    """Clear the stored PIN."""
    pin_file = get_pin_file_path()
    if pin_file.exists():
        pin_file.unlink()


def _remote_access_enabled() -> bool:
    return os.environ.get("ENABLE_REMOTE_ACCESS", "false").lower() == "true"


def _local_ip() -> str:
    return getattr(state, "LOCAL_IP", None) or "127.0.0.1"


@router.get("/api/remote-access/info")
async def get_remote_access_info():
    """Get information for remote access (QR code generation)."""
    port = int(os.environ.get("CORTEX_PORT", 8000))
    has_pin = get_stored_pin() is not None
    return {
        "enabled": _remote_access_enabled(),
        "ip": _local_ip(),
        "port": port,
        "url": f"http://{_local_ip()}:{port}",
        "pinRequired": has_pin,
        "features": ["chat", "voiceHUD", "settings"],
    }


class SetPinRequest(BaseModel):
    pin: str  # 4-6 digit PIN
    currentPin: str = None  # Required if already set


@router.post("/api/remote-access/set-pin")
async def set_remote_access_pin(request: SetPinRequest):
    """Set or update the remote access PIN."""
    current_pin = get_stored_pin()

    # If PIN already set, verify current PIN
    if current_pin and request.currentPin != current_pin:
        return {"success": False, "error": "Current PIN is incorrect"}

    # Validate new PIN (4-6 digits)
    if not request.pin.isdigit() or len(request.pin) < 4 or len(request.pin) > 6:
        return {"success": False, "error": "PIN must be 4-6 digits"}

    set_stored_pin(request.pin)
    return {"success": True, "message": "PIN set successfully"}


@router.post("/api/remote-access/clear-pin")
async def clear_remote_access_pin(request: SetPinRequest):
    """Clear the remote access PIN."""
    current_pin = get_stored_pin()

    if current_pin and request.currentPin != current_pin:
        return {"success": False, "error": "Current PIN is incorrect"}

    clear_stored_pin()
    validated_sessions.clear()
    return {"success": True, "message": "PIN cleared"}


class VerifyPinRequest(BaseModel):
    pin: str
    sessionId: str = None


@router.post("/api/remote-access/verify-pin")
async def verify_remote_access_pin(request: VerifyPinRequest):
    """Verify PIN and create validated session."""
    stored_pin = get_stored_pin()

    # No PIN set = always valid
    if not stored_pin:
        return {"success": True, "message": "No PIN required"}

    if request.pin != stored_pin:
        return {"success": False, "error": "Invalid PIN"}

    # Create session token
    session_id = request.sessionId or secrets.token_hex(16)
    validated_sessions.add(session_id)

    return {"success": True, "sessionId": session_id}
