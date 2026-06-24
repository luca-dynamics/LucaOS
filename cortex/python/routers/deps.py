"""Shared FastAPI dependencies for the extracted Cortex routers (Phase 2).

Hosts the cross-router primitives that several route groups need, so those
groups can live in their own modules without importing cortex.py (no circular
import):

  * verify_session   — PIN/session guard (loopback bypass for the desktop app).
  * lazy_import_automation — lazy loader for the hybrid automation backends.
"""
from fastapi import Header, HTTPException, Request

from routers.remote_access import get_stored_pin, validated_sessions

_AUTOMATION_CACHE = None


def verify_session(request: Request, x_session_token: str = Header(None)):
    """dependency to verify session token if PIN is set"""
    # Allow localhost (Desktop App) to always bypass PIN
    if request.client.host in ["127.0.0.1", "localhost", "::1"]:
        return True

    stored_pin = get_stored_pin()
    if not stored_pin:
        return True

    if not x_session_token or x_session_token not in validated_sessions:
        raise HTTPException(status_code=401, detail="Invalid or missing session token")
    return True


def lazy_import_automation():
    global _AUTOMATION_CACHE
    if _AUTOMATION_CACHE:
        return _AUTOMATION_CACHE
    try:
        from universal_automation import automate, play_music, send_message, open_url
        from hybrid_file_operations import file_operation, open_file, create_folder, delete_file
        from hybrid_file_editor import edit_file
        _AUTOMATION_CACHE = {
            "automate": automate, "play_music": play_music, "send_message": send_message, "open_url": open_url,
            "file_operation": file_operation, "open_file": open_file, "create_folder": create_folder, "delete_file": delete_file,
            "edit_file": edit_file
        }
        # Plain ASCII — emoji crashes on Windows cp1252 stdout (UnicodeEncodeError).
        print("[CORTEX] [OK] Loaded hybrid automation systems")
        return _AUTOMATION_CACHE
    except ImportError as e:
        print(f"[CORTEX] [WARN] Hybrid systems not available: {e}")
        return None
