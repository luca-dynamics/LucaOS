import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

router = APIRouter()

# Global in-memory state store (This would ideally be connected to a DB or the Graph)
# But for "Live Handoff", in-memory is fastest.
active_brain_state = {
    "short_term_memory": [],
    "active_goals": [],
    "current_persona": "LUCAGENT",
    "last_thought": "",
    "session_context": {}
}

class StateInjection(BaseModel):
    state: Dict[str, Any]

@router.get("/api/state/snapshot")
async def get_state_snapshot():
    """Capture the current essence of Luca's active thought process"""
    return active_brain_state

@router.post("/api/state/inject")
async def inject_state(payload: StateInjection):
    """Inject a foreign consciousness state into this local core"""
    global active_brain_state
    active_brain_state = payload.state
    print("[CORTEX] 🧠 Consciousness injection successful. Neural state synchronized.")
    return {"success": True, "message": "State injected successfully"}

# Helper to update state from other modules
def update_active_state(key: str, value: Any):
    global active_brain_state
    active_brain_state[key] = value

@router.post("/api/state/update")
async def update_state_endpoint(data: Dict[str, Any]):
    global active_brain_state
    active_brain_state.update(data)
    return {"success": True}
