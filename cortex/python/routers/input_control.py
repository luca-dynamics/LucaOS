"""Direct input-control endpoints (Phase 2 extraction from cortex.py).

Mouse, keyboard, and AppleScript execution. Self-contained: owns its pyautogui
import and request models, and gates every route with verify_session
(loopback bypass for the desktop app).
"""
import subprocess
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from routers.deps import verify_session

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except Exception:
    PYAUTOGUI_AVAILABLE = False

router = APIRouter()


class MouseMoveRequest(BaseModel):
    x: int
    y: int


class KeyboardTypeRequest(BaseModel):
    text: str
    interval: float = 0.05


class KeyboardPressRequest(BaseModel):
    keys: List[str]


class SystemCommandRequest(BaseModel):
    script: str  # AppleScript or Shell depending on endpoint


@router.post("/mouse/move")
async def mouse_move(request: MouseMoveRequest, authorized: bool = Depends(verify_session)):
    if not PYAUTOGUI_AVAILABLE:
        return {"status": "error", "message": "Mouse control not available on server"}
    try:
        pyautogui.moveTo(request.x, request.y, _pause=False)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/keyboard/type")
async def keyboard_type(request: KeyboardTypeRequest, authorized: bool = Depends(verify_session)):
    if not PYAUTOGUI_AVAILABLE:
        return {"status": "error", "message": "Keyboard control not available on server"}
    try:
        pyautogui.write(request.text, interval=request.interval)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/keyboard/press")
async def keyboard_press(request: KeyboardPressRequest, authorized: bool = Depends(verify_session)):
    if not PYAUTOGUI_AVAILABLE:
        return {"status": "error", "message": "Keyboard control not available on server"}
    try:
        # Unpack list of keys e.g. ['command', 'space']
        pyautogui.hotkey(*request.keys)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/system/applescript")
async def system_applescript(request: SystemCommandRequest, authorized: bool = Depends(verify_session)):
    try:
        # Execute AppleScript via osascript
        result = subprocess.run(
            ["osascript", "-e", request.script],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return {"status": "success", "output": result.stdout.strip()}
        else:
            return {"status": "error", "message": result.stderr.strip()}
    except Exception as e:
        return {"status": "error", "message": str(e)}
