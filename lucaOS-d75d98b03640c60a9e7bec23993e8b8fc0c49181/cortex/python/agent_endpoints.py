"""
Agent Mode API Endpoints - Phase 4
ISOLATED - No modifications to existing endpoints
Settings-based control (no environment variables)
"""

import time
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

# Create router
router = APIRouter()


# Agent Reason Request Model
class AgentReasonRequest(BaseModel):
    prompt: str
    context: Optional[dict] = {}
    modelConfig: Optional[dict] = {"provider": "google", "model": "gemini-2.0-flash"}

@router.post("/api/agent/reason")
async def agent_reason(request: AgentReasonRequest):
    """
    Autonomous Agent Brain
    Decides next steps using the configured model (Local vs Cloud)
    """
    try:
        provider = request.modelConfig.get("provider", "google")
        model = request.modelConfig.get("model", "gemini-2.0-flash")
        
        print(f"[AGENT] Reasoning with {provider}/{model}")
        
        if provider == "local" or provider == "ollama":
            return await reason_with_local(request.prompt, model)
        else:
            return await reason_with_gemini(request.prompt, model)
            
    except Exception as e:
        print(f"[AGENT] Reasoning Error: {e}")
        # Fallback to simple completion if JSON parsing fails? 
        # For now, return error so Node knows to retry or fail
        raise HTTPException(500, f"Reasoning failed: {str(e)}")

# --- LLM HELPERS ---

async def reason_with_gemini(prompt: str, model_name: str):
    """Call Google Gemini for reasoning"""
    import os
    from google import genai
    from google.genai import types
    
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise Exception("Missing GEMINI_API_KEY")
        
    client = genai.Client(api_key=api_key)
    
    # Use the requested model or fallback
    target_model = model_name if "gemini" in model_name else "gemini-2.0-flash"
    
    config = types.GenerateContentConfig(
        temperature=0.2,
        max_output_tokens=1024,
        response_mime_type="application/json"
    )
    
    # Use to_thread since the current genai client is primarily blocking
    import asyncio
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=target_model,
        contents=prompt,
        config=config
    )
    return {"text": response.text}

async def reason_with_local(prompt: str, model_name: str):
    """Call Ollama for reasoning"""
    import aiohttp
    import json
    
    # Default to llama3 if not specified or "gemini" requests leaked here
    target_model = model_name if not "gemini" in model_name else "llama3"
    
    # Ollama is typically at localhost:11434
    url = "http://localhost:11434/api/generate"
    
    payload = {
        "model": target_model,
        "prompt": prompt,
        "stream": False,
        "format": "json" # Force JSON mode if supported
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise Exception(f"Ollama Error ({resp.status}): {text}")
            
            data = await resp.json()
            return {"text": data.get("response", "")}

# Keep existing stubs for compatibility if needed, or remove them. 
# Since this is a "Phase 4 Stub" file, we can overwrite the stubs or keep them.
# I will keep the router definitions but essentially the rest is replaced by this new logic above.
# Wait, I am replacing the *entire file content* in this block? 
# The instruction says "EndLine: 166", which is the whole file. 
# I should re-include the imports and the router setup.

