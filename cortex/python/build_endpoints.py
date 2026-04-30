import os
import subprocess
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# Track build status globally
build_status = {
    "status": "idle",
    "progress": 0,
    "last_build": None,
    "error": None
}

class BuildRequest(BaseModel):
    platform: Optional[str] = "web"

@router.post("/api/build/compile")
async def compile_self(request: BuildRequest):
    global build_status
    
    if build_status["status"] == "running":
        return {"success": False, "message": "Build already in progress"}
    
    # Start build in background
    asyncio.create_task(run_build_process())
    
    return {"success": True, "message": "Self-compilation started in background"}

@router.get("/api/build/status")
async def get_build_status():
    return build_status

async def run_build_process():
    global build_status
    build_status["status"] = "running"
    build_status["progress"] = 10
    build_status["error"] = None
    
    try:
        # 1. Install dependencies if needed (optional but safe)
        # build_status["progress"] = 20
        
        # 2. Run build
        # We assume we are in the root or cortex/python dir. 
        # The frontend is in the root.
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        
        build_status["progress"] = 30
        
        process = await asyncio.create_subprocess_exec(
            "npm", "run", "build",
            cwd=root_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        build_status["progress"] = 50
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            build_status["status"] = "success"
            build_status["progress"] = 100
            build_status["last_build"] = os.popen("date").read().strip()
        else:
            build_status["status"] = "failed"
            build_status["error"] = stderr.decode()
            
    except Exception as e:
        build_status["status"] = "failed"
        build_status["error"] = str(e)
