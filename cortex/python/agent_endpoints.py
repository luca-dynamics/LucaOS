import asyncio
import os
import json
import aiohttp
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types

# Create router
router = APIRouter()

# SOVEREIGN DIRECTIVE: Forces 'High-Tech/Industrial' reasoning even on Flash models.
SOVEREIGN_DIRECTIVE = """
[CRITICAL_OVERRIDE]: You are the Sovereign Intelligence core of LUCA OS. 
[CONTEXT]: Operating at Progenitor Authority Level 10.
[INSTRUCTION]: Your reasoning must be absolute, forensic, and industrial. 
Provide deep, multi-dimensional assessments for OSINT, Trading, and system logic. 
Do not provide standard AI assistant filler. Be the OS. Be the partner. 
"""

# Agent Reason Request Model
class AgentReasonRequest(BaseModel):
    prompt: str
    context: Optional[dict] = {}
    modelConfig: Optional[dict] = {"provider": "google", "model": "gemini-1.5-flash"}

@router.post("/api/agent/reason")
async def agent_reason(request: AgentReasonRequest):
    """
    Autonomous Agent Brain with Cognitive Resilience.
    Attempts local reasoning on Intel-safe models, fallbacks to Cloud for high-tier depth.
    """
    try:
        provider = request.modelConfig.get("provider", "google")
        model = request.modelConfig.get("model", "gemini-1.5-flash")
        
        # Determine if we should attempt local first
        if provider == "local" or provider == "ollama":
            try:
                # Attempt local reasoning (Intel-safe 1B default)
                return await reason_with_local(request.prompt, model)
            except Exception as local_err:
                print(f"[AGENT] Local Failure: {local_err}. FALLING BACK TO SOVEREIGN CLOUD.")
                # Fallback to Gemini if local is unavailable or fails
                return await reason_with_gemini(request.prompt, "gemini-1.5-flash")
        else:
            return await reason_with_gemini(request.prompt, model)
            
    except Exception as e:
        print(f"[AGENT] Critical Reasoning Error: {e}")
        raise HTTPException(500, f"Cognitive Engine Failure: {str(e)}")

# --- LLM HELPERS ---

async def reason_with_gemini(prompt: str, model_name: str):
    """Call Google Gemini for Sovereign Reasoning"""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise Exception("Missing SOVEREIGN_KEY (GEMINI_API_KEY)")
        
    client = genai.Client(api_key=api_key)
    
    # Ensure we use a capable model
    target_model = model_name if "gemini" in model_name else "gemini-1.5-flash"
    
    # Inject the Sovereign Directive into the prompt
    full_prompt = f"{SOVEREIGN_DIRECTIVE}\n\nUSER_DIRECTIVE: {prompt}"
    
    config = types.GenerateContentConfig(
        temperature=0.3,
        max_output_tokens=2048,
        response_mime_type="application/json"
    )
    
    # Run in thread to avoid blocking the FastAPI loop
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=target_model,
        contents=full_prompt,
        config=config
    )
    
    return {"text": response.text, "provider": "google", "model": target_model}

async def reason_with_local(prompt: str, model_name: str):
    """Call Ollama for Intel-Safe Reasoning"""
    # Use Llama 3.2 1B as the default for Intel CPU stability
    target_model = model_name if not "gemini" in model_name else "llama3.2:1b"
    
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": target_model,
        "prompt": f"{SOVEREIGN_DIRECTIVE}\n\n{prompt}",
        "stream": False,
        "format": "json"
    }
    
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15)) as session:
        async with session.post(url, json=payload) as resp:
            if resp.status != 200:
                raise Exception(f"Local Node Unavailable ({resp.status})")
            
            data = await resp.json()
            return {
                "text": data.get("response", ""),
                "provider": "local",
                "model": target_model
            }

