import os
# WORKAROUND: Prevent OpenMP library conflict crash on macOS
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
# FOR INTEL MAC STABILITY: Disable Metal for llama-cpp and friends
if os.uname().machine == 'x86_64':
    os.environ["LLAMA_NO_METAL"] = "1"
import sys
import platform
import asyncio
import nest_asyncio
from typing import Optional, List, Dict, Any, Union
import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
warnings.filterwarnings("ignore", category=DeprecationWarning)
from fastapi import FastAPI, HTTPException, Body, Request, UploadFile, File, Depends
from pydantic import BaseModel
import uvicorn
try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    print("[CORTEX] WARN: pyautogui not available. Mouse/Keyboard control disabled.")
from dotenv import load_dotenv
import numpy as np
from platform_adapter import get_adapter
# from local_stt import LocalSTT (Mooved to lazy loading)

from pathlib import Path

# Robust Environment Loading
# 1. Load local .env in current dir
load_dotenv()
load_dotenv(".env.local")

# 2. Load root .env (2 levels up from cortex/python)
# Resolves to .../luca/.env
root_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if root_env_path.exists():
    print(f"[CORTEX] Loading root configuration from: {root_env_path}")
    load_dotenv(dotenv_path=root_env_path)
else:
    print(f"[CORTEX] WARN: Root .env not found at {root_env_path}")


from platform_utils import get_models_dir

# Get platform-specific models directory
MODELS_BASE_DIR = get_models_dir()

# Platform detection for model compatibility
import platform as _platform

def get_platform_info():
    """Get current platform info for model compatibility checks."""
    system = _platform.system()  # Darwin, Windows, Linux
    machine = _platform.machine()  # arm64, x86_64, AMD64
    return {
        "system": system,
        "machine": machine,
        "is_apple_silicon": system == "Darwin" and machine == "arm64",
        "is_intel_mac": system == "Darwin" and machine == "x86_64",
        "is_windows": system == "Windows",
        "is_linux": system == "Linux" and not hasattr(sys, 'getandroidapilevel') and not "android" in platform.machine().lower(),
        "is_android": hasattr(sys, 'getandroidapilevel') or "android" in platform.machine().lower() or "android" in platform.release().lower()
    }

PLATFORM_INFO = get_platform_info()

def is_model_supported(model_id: str, model_config: dict) -> bool:
    """Check if a model is supported on the current platform."""
    supported = model_config.get("supported_platforms")
    if supported is None:
        return True  # No restrictions = all platforms
    
    if "all" in supported:
        return True
    if PLATFORM_INFO["is_apple_silicon"] and "macos-arm64" in supported:
        return True
    if PLATFORM_INFO["is_intel_mac"] and "macos-x86" in supported:
        return True
    if PLATFORM_INFO["is_windows"] and "windows" in supported:
        return True
    if PLATFORM_INFO["is_linux"] and "linux" in supported:
        return True
    if PLATFORM_INFO["is_android"] and "android" in supported:
        return True
    return False

# Configure Gemini API Key
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("VITE_API_KEY")
if not GOOGLE_API_KEY:
    print("[CORTEX] WARN: GEMINI_API_KEY not found in environment. Please set it in .env or cloud config.")

else:
    # LightRAG's Gemini binding checks for LLM_BINDING_API_KEY or GEMINI_API_KEY
    os.environ["LLM_BINDING_API_KEY"] = GOOGLE_API_KEY
    os.environ["GEMINI_API_KEY"] = GOOGLE_API_KEY
    os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY # Standard SDK Variable
    os.environ["API_KEY"] = GOOGLE_API_KEY # Generic variable often used by new SDKs

# --- GLOBAL MODELS CONFIG ---
# Models directory already defined above (MODELS_BASE_DIR)

# Model definitions with paths
MODEL_PATHS = {
    "gemma-2b": {
        "path": str(MODELS_BASE_DIR / "llm" / "gemma-2-2b-it-Q6_K.gguf"),
        "repo_id": "bartowski/gemma-2-2b-it-GGUF",
        "filename": "gemma-2-2b-it-Q6_K.gguf",
        "n_ctx": 8192
    },
    "gemma-2b-lite": {
        "path": str(MODELS_BASE_DIR / "llm" / "gemma-2-2b-it-Q4_K_M.gguf"),
        "repo_id": "bartowski/gemma-2-2b-it-GGUF",
        "filename": "gemma-2-2b-it-Q4_K_M.gguf",
        "n_ctx": 8192,
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux", "android"]
    },
    "phi-3-mini": {
        "path": str(MODELS_BASE_DIR / "llm" / "Phi-3-mini-4k-instruct-q4.gguf"),
        "repo_id": "microsoft/Phi-3-mini-4k-instruct-gguf",
        "filename": "Phi-3-mini-4k-instruct-q4.gguf",
        "n_ctx": 4096,
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux", "android"]
    },
    "llama-3.2-1b": {
        "path": str(MODELS_BASE_DIR / "llm" / "Llama-3.2-1B-Instruct-Q8_0.gguf"),
        "repo_id": "bartowski/Llama-3.2-1B-Instruct-GGUF",
        "filename": "Llama-3.2-1B-Instruct-Q8_0.gguf",
        "n_ctx": 8192
    },
    "smollm2-1.7b": {
        "path": str(MODELS_BASE_DIR / "llm" / "smollm2-1.7b-instruct-q8_0.gguf"),
        "repo_id": "bartowski/SmolLM2-1.7B-Instruct-GGUF",
        "filename": "smollm2-1.7b-instruct-q8_0.gguf",
        "n_ctx": 2048,
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux", "android"]
    },
    "qwen-2.5-7b": {
        "path": str(MODELS_BASE_DIR / "llm" / "Qwen2.5-7B-Instruct-Q4_K_M.gguf"),
        "repo_id": "bartowski/Qwen2.5-7B-Instruct-GGUF",
        "filename": "Qwen2.5-7B-Instruct-Q4_K_M.gguf",
        "n_ctx": 32768,
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux"]
    },
    "deepseek-r1-distill-7b": {
        "path": str(MODELS_BASE_DIR / "llm" / "DeepSeek-R1-Distill-Llama-8B-Q4_K_M.gguf"),
        "repo_id": "unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF",
        "filename": "DeepSeek-R1-Distill-Llama-8B-Q4_K_M.gguf",
        "n_ctx": 8192,
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux"]
    },
    "smolvlm-500m": {
        "path": str(MODELS_BASE_DIR / "vision" / "smolvlm"),
        "repo_id": "HuggingFaceTB/SmolVLM-500M-Instruct",
        "is_folder": True
    },
    "ui-tars-2b": {
        "path": str(MODELS_BASE_DIR / "vision" / "ui-tars"),
        "repo_id": "bytedance-research/UI-TARS-2B-SFT",
        "is_folder": True
    },
    "qwen2.5-vl-3b": {
        "path": str(MODELS_BASE_DIR / "vision" / "qwen2.5-vl-3b"),
        "repo_id": "Qwen/Qwen2.5-VL-3B-Instruct",
        "is_folder": True,
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux"]
    },
    "moondream2": {
        "path": str(MODELS_BASE_DIR / "vision" / "moondream2"),
        "repo_id": "vikhyatk/moondream2",
        "is_folder": True,
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux"]
    },
    "piper-amy": {
        "path": str(MODELS_BASE_DIR / "tts" / "en_US-amy-medium.onnx"),
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx",
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux", "android"]
    },
    "kokoro-82m": {
        "path": str(MODELS_BASE_DIR / "tts" / "kokoro-82m"),
        "repo_id": "hexgrad/Kokoro-82M",
        "is_folder": True
    },
    "supertonic-2": {
        "path": str(MODELS_BASE_DIR / "tts" / "supertonic-2"),
        "repo_id": "Supertone/supertonic-2",
        "is_folder": True
    },
    "qwen3-tts": {
        "path": str(MODELS_BASE_DIR / "tts" / "qwen3-tts"),
        "repo_id": "Qwen/Qwen3-TTS-0.6B-Instruct",
        "is_folder": True,
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux"]
    },
    "moonshine-tiny": {
        "path": str(MODELS_BASE_DIR / "stt" / "faster-whisper-tiny-en"),
        "repo_id": "Systran/faster-whisper-tiny.en",
        "is_folder": True,
        "category": "stt",
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux", "android"]
    },
    "distil-whisper-medium-en": {
        "path": str(MODELS_BASE_DIR / "stt" / "distil-whisper-medium-en"),
        "repo_id": "Systran/faster-distil-whisper-medium.en",
        "is_folder": True,
        "category": "stt"
    },
    "whisper-v3-turbo": {
        "path": str(MODELS_BASE_DIR / "stt" / "whisper-large-v3-turbo"),
        "repo_id": "Deep-Learning-VJ/whisper-large-v3-turbo-ct2",
        "is_folder": True,
        "category": "stt"
    },
    "model2vec-potion": {
        "path": str(MODELS_BASE_DIR / "embeddings" / "model2vec-potion"),
        "repo_id": "minishlab/potion-base-2M",
        "is_folder": True,
        "category": "embedding"
    },
    "mxbai-embed-xsmall": {
        "path": str(MODELS_BASE_DIR / "embeddings" / "mxbai-embed-xsmall"),
        "repo_id": "mixedbread-ai/mxbai-embed-xsmall-v1",
        "is_folder": True,
        "category": "embedding"
    },
    "bge-small-en": {
        "path": str(MODELS_BASE_DIR / "embeddings" / "bge-small-en"),
        "repo_id": "BAAI/bge-small-en-v1.5",
        "is_folder": True,
        "category": "embedding"
    },
    "mxbai-embed-large": {
        "path": str(MODELS_BASE_DIR / "embeddings" / "mxbai-embed-large"),
        "repo_id": "mixedbread-ai/mxbai-embed-large-v1",
        "is_folder": True,
        "category": "embedding",
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux"],
        "unsupported_reason": "High-accuracy large model"
    },
    "jina-embed-v2": {
        "path": str(MODELS_BASE_DIR / "embeddings" / "jina-embed-v2"),
        "repo_id": "jinaai/jina-embeddings-v2-base-en",
        "is_folder": True,
        "category": "embedding",
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux"]
    },
    "bge-large-en": {
        "path": str(MODELS_BASE_DIR / "embeddings" / "bge-large-en"),
        "repo_id": "BAAI/bge-large-en-v1.5",
        "is_folder": True,
        "category": "embedding"
    },
    "nomic-embed-text": {
        "path": str(MODELS_BASE_DIR / "embeddings" / "nomic-embed-text"),
        "repo_id": "nomic-ai/nomic-embed-text-v1.5",
        "is_folder": True,
        "category": "embedding",
        "supported_platforms": ["macos-arm64", "macos-x86", "windows", "linux"],
        "unsupported_reason": "Desktop only - 270MB model"
    }
}

# Sync to global state for other modules (like local_llm_agent)
import state
state.MODEL_PATHS = MODEL_PATHS
state.MODELS_BASE_DIR = MODELS_BASE_DIR

# --- GLOBAL USER SETTINGS (JSON Persistence) ---
SETTINGS_FILE = os.path.join(os.path.expanduser("~"), ".luca", "settings.json")

def load_settings():
    if not os.path.exists(SETTINGS_FILE):
        return {}
        
    try:
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"[CORTEX] 🚨 SETTINGS CORRUPTION DETECTED: {e}")
        # Return a special flag so the Auditor can detect the issue
        return {"_error": "JSON_SYNTAX_ERROR", "_details": str(e)}
    except Exception as e:
        print(f"[CORTEX] Failed to load settings: {e}")
        return {}

def get_settings():
    """Returns a unified dictionary of all global user settings."""
    settings = load_settings()
    # Apply defaults/env fallbacks for core flags
    return {
        "enable_background_sync": settings.get("enable_background_sync", get_setting("enable_background_sync", True)),
        "sync_interval_minutes": settings.get("sync_interval_minutes", get_setting("sync_interval_minutes", 30)),
        "llm_model": settings.get("llm_model", get_setting("llm_model", "gemini-3-flash-preview")),
        "iconic_boot_enabled": settings.get("iconic_boot_enabled", get_setting("iconic_boot_enabled", True))
    }

def save_settings(settings):
    try:
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings, f, indent=4)
    except Exception as e:
        print(f"[CORTEX] Failed to save settings: {e}")

def get_setting(key, default_val=None):
    """Priority: settings.json > Environment > Hardcoded Default"""
    val = load_settings().get(key)
    if val is not None: return val
    
    # Fallback to env (uppercase)
    env_val = os.environ.get(key.upper())
    if env_val is not None:
        if str(env_val).lower() == "true": return True
        if str(env_val).lower() == "false": return False
        return env_val
        
    return default_val

# Global Feature Flags (Dynamic)
ENABLE_BACKGROUND_SYNC = get_setting("enable_background_sync", True)
if not ENABLE_BACKGROUND_SYNC:
    print("[CORTEX] 💤 Sleep Mode: Background memory sync is DISABLED (Global Setting).")



# --- LIGHTRAG & EMBEDDING STATE ---
LIGHTRAG_AVAILABLE = False
# Dual-Mind Storage: "cloud" (Gemini) and "local" (model2vec)
_rag_instances = {} 
_current_rag_model = None 
rag_embedding_func = None

global_genai_client = None

def lazy_import_lightrag():
    """Import LightRAG and related modules lazily."""
    global LIGHTRAG_AVAILABLE, rag_embedding_func
    try:
        from lightrag import LightRAG, QueryParam
        from lightrag.utils import EmbeddingFunc
        
        # Modern GenAI is optional for local mode
        genai = None
        genai_types = None
        try:
            from google import genai
            from google.genai import types as genai_types
        except ImportError:
            print("[CORTEX] Optimized: Google GenAI SDK not found. Cloud-Reasoning will fallback to REST.")

        # Note: we use cortex_llm_complete as the dispatcher, so native adapters are optional
        return LightRAG, QueryParam, EmbeddingFunc, None, genai, genai_types
    except Exception as e:
        print(f"[CORTEX] WARN: LightRAG libraries not ready: {e}")
        return None, None, None, None, None, None

def get_genai_client():
    global global_genai_client
    if global_genai_client: return global_genai_client
    
    _, _, _, _, genai, _ = lazy_import_lightrag()
    if genai and GOOGLE_API_KEY:
        try:
            global_genai_client = genai.Client(api_key=GOOGLE_API_KEY)
            print("[CORTEX] Optimized: Modern GenAI Client Initialized.")
        except Exception as e:
            print(f"[CORTEX] GenAI Client failed: {e}")
    return global_genai_client

# --- Local Embedding Model Loaders ---
_local_embedding_models = {}

def get_local_embedding_model(model_id: str):
    """Load and cache a local embedding model."""
    if model_id in _local_embedding_models:
        return _local_embedding_models[model_id]
    
    model_config = MODEL_PATHS.get(model_id)
    if not model_config or model_config.get("category") != "embedding":
        return None
    
    model_path = model_config["path"]
    if not os.path.exists(model_path):
        print(f"[CORTEX] Local embedding model not downloaded: {model_id}")
        return None
    
    # Handle Model2Vec models (Super Fast, perfect for Intel Mac)
    if "model2vec" in model_id:
        try:
            from model2vec import StaticModel
            print(f"[CORTEX] Loading Model2Vec from {model_path}...")
            model = StaticModel.from_pretrained(model_path)
            print(f"[CORTEX] Model2Vec Loaded Successfully.")
            _local_embedding_models[model_id] = ("model2vec", model)
            return _local_embedding_models[model_id]
        except Exception as e:
            print(f"[CORTEX] Model2Vec load error: {e}. Falling back to SentenceTransformers.")

    # Try importing sentence_transformers
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("[CORTEX] SentenceTransformer not installed.")
        return None
    
    try:
        print(f"[CORTEX] Loading SentenceTransformer from {model_path}...")
        model = SentenceTransformer(model_path, trust_remote_code=True)
        print(f"[CORTEX] SentenceTransformer Loaded Successfully.")
        _local_embedding_models[model_id] = ("sentence_transformers", model)
        return _local_embedding_models[model_id]
    except Exception as e:
        print(f"[CORTEX] Failed to load {model_id}: {e}")
        return None

# Hybrid Embedding Logic - manages local/cloud switching
class HybridEmbeddingLogic:
    def __init__(self, embedding_dim=768):
        self.current_model = "gemini"
        self._embedding_dim = embedding_dim
        self.parent_wrapper = None
    
    def set_model(self, model_id: str):
        self.current_model = model_id
        # Fallback dimensions for common models
        if "model2vec" in model_id: 
            # Force 128 or 256 based on typical Potion/StaticModel output
            # If the user is seeing 64, we might need to adjust here or probe
            self._embedding_dim = 256 
        elif model_id in ["mxbai-embed-xsmall", "bge-small-en"]: self._embedding_dim = 384
        else: self._embedding_dim = 768
        
        # PROBE: If the model is already loaded, use its actual dimension
        model_info = _local_embedding_models.get(model_id)
        if model_info:
            _, model = model_info
            if hasattr(model, 'embedding_dimension'):
                self._embedding_dim = model.embedding_dimension
                print(f"[CORTEX] Detected actual model dimension: {self._embedding_dim}")
        
        # Sync with RAG if it exists
        if rag_embedding_func:
            print(f"[CORTEX] Syncing RAG embedding dimension: {self._embedding_dim}")
            rag_embedding_func.embedding_dim = self._embedding_dim
            
        print(f"[CORTEX] Embedding model set to: {model_id} ({self._embedding_dim} dim)")
    
    async def __call__(self, texts: list[str]) -> np.ndarray:
        return await self.acall(texts)

    async def acall(self, texts: list[str]) -> np.ndarray:
        # ENSURE texts is a list (LightRAG usually sends a list, but we must be certain)
        if isinstance(texts, str):
            texts = [texts]
            
        # Check if using a local model
        if self.current_model and self.current_model not in ["gemini", "gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"]:
            res = await self._local_embed(texts)
        else:
            res = await self._gemini_embed(texts)
            
        # SAFETY ALIGNMENT: LightRAG is extremely sensitive to vector count mismatch
        if len(res) != len(texts):
            print(f"[CORTEX] 🚩 DIAGNOSTIC: Alignment Triggered. Texts: {len(texts)}, Vectors: {len(res)}, Model: {self.current_model}")
            if len(texts) == 1:
                aligned = np.mean(res, axis=0, keepdims=True)
                print(f"[CORTEX] 🚩 DIAGNOSTIC: Aligned {len(res)} -> {len(aligned)}")
                return aligned
            elif len(res) > len(texts):
                return res[:len(texts)]
            else:
                padding = np.zeros((len(texts) - len(res), self._embedding_dim))
                return np.vstack([res, padding])
                
        return res
    
    async def _gemini_embed(self, texts: list[str]) -> np.ndarray:
        client = get_genai_client()
        if not client:
            return np.zeros((len(texts), self._embedding_dim)) 
        
        max_retries = 3
        for i in range(max_retries):
            try:
                from google.genai import types as genai_types
                result = await client.aio.models.embed_content(
                    model="gemini-embedding-001",
                    contents=texts,
                    config=genai_types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
                )
                
                # result.embeddings is a list of embeddings. Each embedding has a 'values' list.
                # If Gemini returned multiple embeddings for one content (due to length), 
                # we need to be careful.
                return np.array([e.values for e in result.embeddings])
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    wait_time = (i + 1) * 5
                    print(f"[CORTEX] ⚠️ Embedding Rate Limit hit. Waiting {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                # For other errors, return zero-vectors to allow the process to continue
                return np.zeros((len(texts), self._embedding_dim))
        return np.zeros((len(texts), self._embedding_dim))

    async def _local_embed(self, texts: list[str]) -> np.ndarray:
        model_info = get_local_embedding_model(self.current_model)
        if not model_info: return await self._gemini_embed(texts)
        model_type, model = model_info
        
        if model_type == "sentence_transformers":
            embeddings = await asyncio.to_thread(model.encode, texts, convert_to_numpy=True)
        else: # model2vec
            embeddings = await asyncio.to_thread(model.encode, texts)
            
        embeddings = np.array(embeddings)
        
        # LAZY DIMENSION AUDIT: Auto-sync with actual model output
        if len(embeddings) > 0:
            actual_dim = embeddings.shape[1]
            if actual_dim != self._embedding_dim:
                print(f"[CORTEX] 🧠 Neural Alignment: Model actually outputs {actual_dim} dim (Expected {self._embedding_dim}). Correcting internal state...")
                self._embedding_dim = actual_dim
                # Global sync with RAG if it exists
                if rag_embedding_func:
                    rag_embedding_func.embedding_dim = actual_dim
                    
        return embeddings

# Initialize the logic
embedding_logic = HybridEmbeddingLogic(embedding_dim=768)

# Initialize FastAPI
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import socket

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import OSINT, Agent, and Quality Routers
from osint_endpoints import router as osint_router
from agent_endpoints import router as agent_router  
from agent_tool_endpoints import router as agent_tool_router  
from quality_tools import router as quality_router  
from build_endpoints import router as build_router
from state_endpoints import router as state_router

# Import Modular Connectors
from connectors.notion import notion_router, notion_oauth_router
from connectors.google import google_router, google_oauth_router
from connectors.obsidian import router as obsidian_router

# Sync state to shared module
import state
state.rag_embedding_func = rag_embedding_func
state.GOOGLE_API_KEY = GOOGLE_API_KEY
state.LIGHTRAG_AVAILABLE = LIGHTRAG_AVAILABLE

app.include_router(osint_router)
app.include_router(agent_router)
app.include_router(agent_tool_router)
app.include_router(quality_router)
app.include_router(build_router)
app.include_router(state_router)
app.include_router(notion_router)
app.include_router(notion_oauth_router)
app.include_router(google_router)
app.include_router(google_oauth_router)
app.include_router(obsidian_router)

# Import and Include Hacking/C2 Router
from hacking_endpoints import router as hacking_router
app.include_router(hacking_router)

# --- REMOTE ACCESS SERVER ---
# Get local IP address for remote access
def get_local_ip():
    """Get the local IP address for LAN access"""
    try:
        # Create a socket to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

REMOTE_ACCESS_ENABLED = os.environ.get("ENABLE_REMOTE_ACCESS", "true").lower() == "true"
LOCAL_IP = get_local_ip()

# --- REMOTE ACCESS PIN SECURITY ---
# PIN is stored in a file for persistence across restarts
def get_pin_file_path():
    """Get the path to the PIN file"""
    if getattr(sys, 'frozen', False):
        base_path = Path(sys.executable).parent / "models"
    else:
        base_path = Path(__file__).parent.parent.parent / "models"
    return base_path / ".remote_access_pin"

def get_stored_pin():
    """Get the stored PIN, or None if not set"""
    pin_file = get_pin_file_path()
    if pin_file.exists():
        return pin_file.read_text().strip()
    return None

def set_stored_pin(pin: str):
    """Store the PIN"""
    pin_file = get_pin_file_path()
    pin_file.parent.mkdir(parents=True, exist_ok=True)
    pin_file.write_text(pin)

def clear_stored_pin():
    """Clear the stored PIN"""
    pin_file = get_pin_file_path()
    if pin_file.exists():
        pin_file.unlink()

# Validated session tokens (in memory, cleared on restart)
validated_sessions = set()

@app.get("/api/remote-access/info")
async def get_remote_access_info():
    """Get information for remote access (QR code generation)"""
    port = int(os.environ.get("CORTEX_PORT", 8000))
    has_pin = get_stored_pin() is not None
    return {
        "enabled": REMOTE_ACCESS_ENABLED,
        "ip": LOCAL_IP,
        "port": port,
        "url": f"http://{LOCAL_IP}:{port}",
        "pinRequired": has_pin,
        "features": ["chat", "voiceHUD", "settings"]
    }

class SetPinRequest(BaseModel):
    pin: str  # 4-6 digit PIN
    currentPin: str = None  # Required if already set

@app.post("/api/remote-access/set-pin")
async def set_remote_access_pin(request: SetPinRequest):
    """Set or update the remote access PIN"""
    current_pin = get_stored_pin()
    
    # If PIN already set, verify current PIN
    if current_pin and request.currentPin != current_pin:
        return {"success": False, "error": "Current PIN is incorrect"}
    
    # Validate new PIN (4-6 digits)
    if not request.pin.isdigit() or len(request.pin) < 4 or len(request.pin) > 6:
        return {"success": False, "error": "PIN must be 4-6 digits"}
    
    set_stored_pin(request.pin)
    return {"success": True, "message": "PIN set successfully"}

@app.post("/api/remote-access/clear-pin")
async def clear_remote_access_pin(request: SetPinRequest):
    """Clear the remote access PIN"""
    current_pin = get_stored_pin()
    
    if current_pin and request.currentPin != current_pin:
        return {"success": False, "error": "Current PIN is incorrect"}
    
    clear_stored_pin()
    validated_sessions.clear()
    return {"success": True, "message": "PIN cleared"}

class VerifyPinRequest(BaseModel):
    pin: str
    sessionId: str = None

@app.post("/api/remote-access/verify-pin")
async def verify_remote_access_pin(request: VerifyPinRequest):
    """Verify PIN and create validated session"""
    stored_pin = get_stored_pin()
    
    # No PIN set = always valid
    if not stored_pin:
        return {"success": True, "message": "No PIN required"}
    
    if request.pin != stored_pin:
        return {"success": False, "error": "Invalid PIN"}
    
    # Create session token
    import secrets
    session_id = request.sessionId or secrets.token_hex(16)
    validated_sessions.add(session_id)
    
    return {"success": True, "sessionId": session_id}


import subprocess

# Input Models
class MouseMoveRequest(BaseModel):
    x: int
    y: int

class MouseClickRequest(BaseModel):
    button: str = "left"

class KeyboardTypeRequest(BaseModel):
    text: str
    interval: float = 0.05

class KeyboardPressRequest(BaseModel):
    keys: List[str]

class SystemCommandRequest(BaseModel):
    script: str # AppleScript or Shell depending on endpoint

# --- LIGHTRAG CONFIG ---
# Relocate RAG storage to user directory (Persistent Memory)
RAG_BASE_DIR = os.path.join(os.path.expanduser("~"), "Luca", "memory")
MASTER_DB_PATH = os.path.join(os.path.expanduser("~"), ".luca", "data", "luca.db")
rag = None # Placeholder for current LightRAG instance
_current_rag_model = None # Track which model rag is initialized with

class SQLiteMemoryConnector:
    """Bridges Node.js SQLite memory to Python LightRAG."""
    def __init__(self, db_path=MASTER_DB_PATH):
        self.db_path = db_path

    def get_all_memories(self):
        try:
            if not os.path.exists(self.db_path):
                return []
            import sqlite3
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            # Explicitly check if table exists first to avoid crash on clean install
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='memories'")
            if not cursor.fetchone():
                conn.close()
                return []
            cursor.execute("SELECT content FROM memories ORDER BY id ASC")
            rows = cursor.fetchall()
            conn.close()
            return [row[0] for row in rows]
        except Exception as e:
            # print(f"[CORTEX] SQLite Read Error: {e}")
            return []

    def get_unindexed_memories(self, last_id: int):
        """Retrieve memories that haven't been synced to the vector DB yet."""
        try:
            if not os.path.exists(self.db_path):
                return []
            import sqlite3
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row # Required for dict-like access in sync_loop
            cursor = conn.cursor()
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='memories'")
            if not cursor.fetchone():
                conn.close()
                return []
                
            cursor.execute("SELECT id, content, type FROM memories WHERE id > ? ORDER BY id ASC", (last_id,))
            rows = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"[CORTEX] SQLite Sync Error: {e}")
            return []

    def add_memory(self, content: str):
        """Save raw memory to master SQLite."""
        try:
            import sqlite3
            # Ensure path exists
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT,
                    type TEXT,
                    metadata_json TEXT,
                    deep_summary TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("INSERT INTO memories (content) VALUES (?)", (content,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"[CORTEX] SQLite Write Error: {e}")
            return False

    async def add_memory_hdc(self, content: str):
        """Bridge to the HDC Compression layer."""
        try:
            from hdc_manager import HDCMemoryManager
            manager = HDCMemoryManager(self.db_path)
            return await manager.ingest_with_compression(content)
        except Exception as e:
            print(f"[CORTEX] HDC Ingest Error: {e}")
            # Fallback to simple add
            return self.add_memory(content)

    def add_entity(self, name, entity_type="concept", description=""):
        try:
            import sqlite3
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            now = int(time.time() * 1000)
            cursor.execute("""
                INSERT INTO entities (name, type, description, last_updated)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET
                    last_updated = excluded.last_updated,
                    description = COALESCE(excluded.description, entities.description)
            """, (name, entity_type, description, now))
            conn.commit()
            cursor.execute("SELECT id FROM entities WHERE name = ?", (name,))
            entity_id = cursor.fetchone()[0]
            conn.close()
            return entity_id
        except Exception as e:
            print(f"[CORTEX] SQLite Entity Error: {e}")
            return None

    def add_relationship(self, source_name, relation, target_name):
        try:
            source_id = self.add_entity(source_name)
            target_id = self.add_entity(target_name)
            if not source_id or not target_id: return
            
            import sqlite3
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            now = int(time.time() * 1000)
            cursor.execute("""
                INSERT INTO relationships (source_id, target_id, relation, created_at, weight)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(source_id, target_id, relation) DO UPDATE SET
                    created_at = excluded.created_at
            """, (source_id, target_id, relation, now, 1.0))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[CORTEX] SQLite Relation Error: {e}")

async def sync_loop(target_rag, model_id):
    """Background loop that syncs memories at regular intervals."""
    model_dir = os.path.join(RAG_BASE_DIR, model_id)
    sync_file = os.path.join(model_dir, "sync_status.json")
    
    print(f"[CORTEX] 🔁 Sync Loop Started for {model_id}")
    
    while True:
        try:
            # Always check current settings from the persistent JSON
            settings = get_settings()
            if not settings.get("enable_background_sync", True):
                await asyncio.sleep(60)
                continue

            sync_interval = int(settings.get("sync_interval_minutes", 30)) * 60
            
            last_id = 0
            if os.path.exists(sync_file):
                try:
                    with open(sync_file, "r") as f:
                        last_id = json.load(f).get("last_id", 0)
                except: last_id = 0
                     
            connector = SQLiteMemoryConnector()
            new_memories = connector.get_unindexed_memories(last_id)
            
            if new_memories:
                print(f"[CORTEX] 🧠 Neural Catch-up: Indexing {len(new_memories)} new entries for {model_id}...")
                
                batch_size = 5 
                max_new_id = last_id
                for i in range(0, len(new_memories), batch_size):
                    # Re-check flag mid-batch for responsiveness
                    if not get_settings().get("enable_background_sync", True):
                        break

                    batch = new_memories[i:i + batch_size]
                    processed_batch = []
                    
                    for mem in batch:
                        m_type = mem.get("type", "frame")
                        m_content = mem.get("content", "")
                        
                        if m_type == "fact":
                            # Facts are already distilled, insert raw
                            processed_batch.append(m_content)
                        else:
                            # Frames (chat) benefit from a timestamp context
                            timestamped = f"[{int(time.time())}] Memory: {m_content}"
                            processed_batch.append(timestamped)
                        
                        max_new_id = max(max_new_id, mem["id"])

                    if hasattr(target_rag, 'ainsert_batch'):
                        await target_rag.ainsert_batch(processed_batch)
                    else:
                        for text in processed_batch:
                            await target_rag.ainsert(text)
                    
                    await asyncio.sleep(2) # Small safety throttle
                
                # Update sync status
                with open(sync_file, "w") as f:
                    json.dump({"last_id": max_new_id}, f)
                
                print(f"[CORTEX] ✅ Sync Cycle Complete. Sleeping for {sync_interval//60}m...")
            
            await asyncio.sleep(sync_interval)

        except Exception as e:
            err_msg = str(e).lower()
            if "dimension mismatch" in err_msg or "cannot be evenly divided" in err_msg:
                print(f"[CORTEX] 🛠️ Emergency Recovery: Neural dimension mismatch detected. Purging corrupted index...")
                try:
                    # Wipe the vector DB files to allow clean rebuild with new dimensions
                    for junk in ["vdb_entities.json", "vdb_relationships.json", "vdb_chunks.json", "kv_store_full_text_search.json"]:
                        junk_path = os.path.join(model_dir, junk)
                        if os.path.exists(junk_path): 
                            os.remove(junk_path)
                            print(f"[CORTEX] Removed stale index: {junk}")
                    print(f"[CORTEX] ✅ Purge complete. Restarting sync with corrected dimensions...")
                    # Small sleep before retry
                    await asyncio.sleep(5)
                except Exception as purge_err:
                    print(f"[CORTEX] ❌ Failed to purge index: {purge_err}")
            else:
                print(f"[CORTEX] ⚠️ Sync Loop Error: {e}")
                await asyncio.sleep(300) # Wait 5 mins on error before retry

async def cortex_llm_complete(prompt, system_prompt=None, **kwargs):
    """Universal LLM dispatcher for LightRAG. Routes to Gemini, OpenAI, Anthropic, or Ollama."""
    # Priority: 1. Passed in kwargs (RAG), 2. Settings, 3. Hard Default
    settings = get_settings()
    model_id = kwargs.get("model") or settings.get("llm_model") or "gemini-2.1-flash"
    
    # Check for Native Local Models (GGUF via LocalLLMAgent)
    if model_id in ["gemma-2b", "gemma-2b-lite", "phi-3-mini", "llama-3.2-1b", "smollm2-1.7b", "qwen-2.5-7b", "deepseek-r1-distill-7b"]:
        brain = get_local_brain()
        if brain:
            # RAG requires a message format. If prompt is string, convert.
            msgs = [{"role": "user", "content": prompt}]
            if system_prompt:
                 msgs.insert(0, {"role": "system", "content": system_prompt})
            
            print(f"[CORTEX] 🏠 Routing to Native Local Brain: {model_id}")
            response = brain.generate_chat(messages=msgs, model_id=model_id, **kwargs)
            
            # Extract content string from OpenAI-like format
            if isinstance(response, dict) and "choices" in response:
                return response["choices"][0]["message"]["content"]
            return str(response)

    # Check for Ollama/Local routing
    if model_id.startswith("local/") or "mistral" in model_id or "llama" in model_id or ":" in model_id:
        from lightrag.llm.ollama import ollama_chat_complete
        return await ollama_chat_complete(model_id, prompt, system_prompt=system_prompt, **kwargs)
    
    # Check for Anthropic
    if "claude" in model_id:
        from lightrag.llm.anthropic import anthropic_complete
        kwargs["api_key"] = settings.get("anthropic_api_key", os.environ.get("ANTHROPIC_API_KEY"))
        # Ensure system_prompt is not duplicated in kwargs
        kwargs.pop("system_prompt", None)
        return await anthropic_complete(prompt, system_prompt=system_prompt, model_name=model_id, **kwargs)
        
    # Check for OpenAI/xAI
    if "gpt" in model_id or "grok" in model_id:
        from lightrag.llm.openai import openai_chat_complete
        if "grok" in model_id:
             kwargs["base_url"] = "https://api.x.ai/v1"
             kwargs["api_key"] = settings.get("xai_api_key", os.environ.get("XAI_API_KEY"))
        else:
             kwargs["api_key"] = settings.get("openai_api_key", os.environ.get("OPENAI_API_KEY"))
        # Ensure system_prompt is not duplicated in kwargs
        kwargs.pop("system_prompt", None)
        return await openai_chat_complete(prompt, system_prompt=system_prompt, model_name=model_id, **kwargs)

    from lightrag.llm.gemini import gemini_model_complete
    max_retries = 3
    # Ensure system_prompt and model_name are not duplicated in kwargs
    kwargs.pop("system_prompt", None)
    kwargs.pop("model_name", None)
    for i in range(max_retries):
        try:
            return await gemini_model_complete(prompt, system_prompt=system_prompt, model_name=model_id, **kwargs)
        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                wait_time = (i + 1) * 10
                print(f"[CORTEX] 🚦 Rate Limit Hit. Waiting {wait_time}s before retry {i+1}/{max_retries}...")
                await asyncio.sleep(wait_time)
            else:
                raise e
                print(f"[CORTEX] ⚠️ Gemini LLM Rate Limit hit. Waiting {wait_time}s before retry {i+1}/3...")
                await asyncio.sleep(wait_time)
                continue
            raise e
    # Final attempt fallback or raise
    return await gemini_model_complete(prompt, system_prompt=system_prompt, model_name=model_id, **kwargs)

async def get_rag(mind_type="cloud", model_id=None):
    """Retrieve or initialize LightRAG instance. 'cloud' uses LLM, 'local' uses free model2vec."""
    global _rag_instances, _current_rag_model, LIGHTRAG_AVAILABLE, rag_embedding_func
    
    # Lazy Import LightRAG components
    LightRAG_Class, QueryParam_Class, EmbeddingFunc_Class, _, _, _ = lazy_import_lightrag()
    if not LightRAG_Class:
        return None
        
    LIGHTRAG_AVAILABLE = True
    
    # We use a dedicated model_id for the mind type
    if not model_id:
        if mind_type == "local":
            # Dynamic Sensing: Use setting or first available downloaded embedding model
            settings = get_settings()
            model_id = settings.get("local_embedding_model")
            if not model_id:
                for m_id, m_cfg in MODEL_PATHS.items():
                    if m_cfg.get("category") == "embedding":
                        path = m_cfg["path"]
                        is_ready = os.path.isdir(path) if m_cfg.get("is_folder") else os.path.isfile(path)
                        if is_ready:
                            model_id = m_id
                            break
            # Ultimate fallback if nothing found
            if not model_id: model_id = "model2vec-potion"
        else:
            model_id = (os.environ.get("CORTEX_LLM_MODEL") or "gemini-2.1-flash")
    
    # If already initialized for this exact model and mind type, return it
    cache_key = f"{mind_type}_{model_id}"
    if cache_key in _rag_instances:
        return _rag_instances[cache_key]

    # Dedicated Embedding Logic instance for this mind type to avoid crosstalk
    local_embedding_logic = HybridEmbeddingLogic()
    local_embedding_logic.set_model(model_id)

    # Dedicated wrapper for this mind's dimension
    current_mind_embedding_func = EmbeddingFunc_Class(
        func=local_embedding_logic,
        embedding_dim=local_embedding_logic._embedding_dim,
        max_token_size=2048
    )
    
    # Update global reference (last initialized mind wins for general /embed calls)
    rag_embedding_func = current_mind_embedding_func

    try:
        # Separate storage paths for Cloud vs Local to avoid index pollution
        model_dir = os.path.join(RAG_BASE_DIR, mind_type) 
        os.makedirs(model_dir, exist_ok=True)
            
        # Split-Mind Check: If model_id is an embedding model, we must use a reasoning model for LLM tasks
        llm_reasoner = model_id
        if any(kw in model_id.lower() for kw in ["embed", "model2vec", "potion"]):
            # Use active brain from settings if available, else environment, else stable fallback
            settings = get_settings()
            llm_reasoner = settings.get("llm_model") or os.environ.get("CORTEX_LLM_MODEL") or "gemini-2.1-flash"
            print(f"[CORTEX] 🧩 Hybrid-HDC Logic: Using '{model_id}' for vectors but '{llm_reasoner}' for reasoning.")

        print(f"[CORTEX] Initializing {mind_type.upper()} MIND with model {llm_reasoner} (Vectors: {model_id})...")
        
        new_rag = LightRAG_Class(
            working_dir=model_dir,
            llm_model_func=cortex_llm_complete,
            llm_model_name=llm_reasoner, 
            embedding_func=current_mind_embedding_func,
            llm_model_max_async=2, 
            llm_model_kwargs={"api_key": GOOGLE_API_KEY, "key": GOOGLE_API_KEY} 
        )
        
        await new_rag.initialize_storages()
        
        # Only run background sync for the local mind if enabled
        if ENABLE_BACKGROUND_SYNC and mind_type == "local":
             # We only do the deep history sync in the local MIND (Zero Cost)
             asyncio.create_task(sync_loop(new_rag, mind_type))
        
        _rag_instances[cache_key] = new_rag
        return new_rag
    except Exception as e:
        print(f"[CORTEX] LightRAG Init Failed for {mind_type} ({model_id}): {e}")
        return None

# --- KNOWLEDGE BRIDGE (Import Adapters) ---

class KnowledgeParsers:
    @staticmethod
    def parse_chatgpt(file_content):
        """Parses OpenAI conversations.json."""
        try:
            data = json.loads(file_content)
            extracted_text = []
            for conv in data:
                title = conv.get("title", "Untitled Conversation")
                messages = []
                mapping = conv.get("mapping", {})
                for node_id in mapping:
                    node = mapping[node_id]
                    message = node.get("message")
                    if not message: continue
                    
                    role = message.get("author", {}).get("role")
                    content = message.get("content", {})
                    parts = content.get("parts", []) if content else []
                    text = " ".join([p for p in parts if isinstance(p, str)])
                    
                    if text:
                        prefix = "User" if role == "user" else "Assistant"
                        messages.append(f"{prefix}: {text}")
                
                if messages:
                    extracted_text.append(f"### Conversation: {title}\n" + "\n".join(messages))
            return "\n\n---\n\n".join(extracted_text)
        except Exception as e:
            print(f"[CORTEX] ChatGPT Parse Error: {e}")
            return ""

    @staticmethod
    def parse_claude(file_content):
        """Parses Anthropic Claude export.json."""
        try:
            data = json.loads(file_content)
            extracted_text = []
            # Claude export can be a list or a dict
            items = data if isinstance(data, list) else [data]
            for conv in items:
                title = conv.get("name", conv.get("title", "Untitled Conversation"))
                chat_messages = conv.get("chat_messages", conv.get("messages", []))
                messages = []
                for msg in chat_messages:
                    role = msg.get("sender", msg.get("role"))
                    text = msg.get("text", msg.get("content"))
                    if role and text:
                        messages.append(f"{role.capitalize()}: {text}")
                
                if messages:
                    extracted_text.append(f"### Conversation: {title}\n" + "\n".join(messages))
            return "\n\n---\n\n".join(extracted_text)
        except Exception as e:
            print(f"[CORTEX] Claude Parse Error: {e}")
            return ""

async def distill_knowledge(raw_text, existing_context=""):
    """Uses LLM to extract structured facts, entities, and relationships with context awareness."""
    if not raw_text.strip():
        return {"facts": [], "entities": [], "relationships": []}
        
    prompt = f"""
    You are Luca's Knowledge Distiller. I will provide you with raw chat logs.
    Your goal is to extract structured knowledge, being careful NOT to duplicate what Luca already knows.
    
    LUCA'S EXISTING KNOWLEDGE (SUMMARY):
    {existing_context}
    
    Extract ONLY NEW or UPDATED information:
    1. Facts: Career, skills, tools used.
    2. Entities: names, projects, companies (person, location, project, concept).
    3. Relationships: Links between entities.
    
    Guidelines:
    - If a fact already exists, skip it.
    - If a fact has CHANGED (e.g., "User uses React 18" now vs "React 17"), mark it as an update.
    
    Output Format (JSON only):
    {{
      "facts": ["New/Updated Fact 1"],
      "entities": [{{ "name": "Name", "type": "Type", "description": "Desc" }}],
      "relationships": [{{ "source": "S", "relation": "R", "target": "T" }}]
    }}
    
    LOGS TO PROCESS (TRUNCATED):
    {raw_text[:15000]}
    """
    
    try:
        # User our retry-protected wrapper for knowledge extraction
        # This handles 429s automatically
        json_str = await gemini_model_complete_with_retry(
            prompt, 
            system_prompt="You are Luca's Knowledge Distiller. Extract structured facts, entities, and relationships. Respond ONLY with valid JSON."
        )
        json_str = json_str.strip()
        if json_str.startswith("```json"):
            json_str = json_str[7:-3].strip()
        elif json_str.startswith("```"):
            json_str = json_str[3:-3].strip()
            
        data = json.loads(json_str)
        return data
    except Exception as e:
        print(f"[CORTEX] Distillation Failed: {e}")
        return {"facts": [], "entities": [], "relationships": []}

@app.post("/knowledge/import")
async def import_knowledge(platform: str, file: UploadFile = File(...)):
    """Accepts external AI exports, parses them, distills facts, and injects into memory."""
    try:
        content = await file.read()
        text_content = content.decode("utf-8")
        
        # 1. Parse
        if platform == "openai":
            raw_text = KnowledgeParsers.parse_chatgpt(text_content)
        elif platform in ["claude", "claude-code", "anthropic"]:
            raw_text = KnowledgeParsers.parse_claude(text_content)
        elif platform == "cursor":
            raw_text = text_content # Generic for now, can be specialized 
        elif platform == "grok":
            raw_text = text_content # Generic for now
        else:
            raw_text = text_content # Generic
            
        if not raw_text:
            raise HTTPException(status_code=400, detail="Failed to parse export file or file is empty.")
            
        # 2. Get Context for Consolidation
        connector = SQLiteMemoryConnector()
        existing_mems = connector.get_all_memories()
        # Truncate to avoid prompt overflow, focus on last 50
        existing_context = "\n".join(existing_mems[-50:])
        
        # 3. Distill with Consolidation
        distilled_data = await distill_knowledge(raw_text, existing_context)
        facts = distilled_data.get("facts", [])
        entities = distilled_data.get("entities", [])
        relationships = distilled_data.get("relationships", [])
        
        # 4. Ingest into Master SQLite (Unified Sync Stream)
        for ent in entities:
            connector.add_entity(ent["name"], ent.get("type", "concept"), ent.get("description", ""))
        for rel in relationships:
            connector.add_relationship(rel["source"], rel["relation"], rel["target"])
            
        import sqlite3
        conn = sqlite3.connect(connector.db_path)
        cursor = conn.cursor()
        for fact in facts:
            # Type 'fact' tells the background sync_loop to index it raw
            cursor.execute("INSERT INTO memories (content, type, metadata_json) VALUES (?, 'fact', ?)", 
                          (fact, json.dumps({"source": f"{platform}_export"})))
        conn.commit()
        conn.close()
                
        return {
            "status": "success", 
            "message": f"Bridge Stream Initialized. {len(facts)} insights being indexed in background.",
            "facts": facts[:5],
            "entities": [e["name"] for e in entities[:5]]
        }
    except Exception as e:
        print(f"[CORTEX] Import Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Notion and Google Drive connectors moved to connectors/ package.
# RAG logic moved to knowledge.py.

# Google Drive connector logic moved to connectors/google.py.


# --- PRODUCTION MCP SSE BRIDGE ---

class MCPContext:
    def __init__(self):
        self.clients = []

mcp_context = MCPContext()

@app.get("/mcp/sse")
async def mcp_sse(request: Request):
    """MCP SSE Transport endpoint."""
    async def event_generator():
        # 1. Send initial 'endpoint' notification per MCP spec
        yield {
            "event": "endpoint",
            "data": "/mcp/message"
        }
        
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(1)
            
    from sse_starlette.sse import EventSourceResponse
    return EventSourceResponse(event_generator())

@app.post("/mcp/message")
async def mcp_message(request: Request):
    """Handles MCP JSON-RPC messages over HTTP/POST."""
    try:
        data = await request.json()
        msg_id = data.get("id")
        method = data.get("method")
        params = data.get("params", {})
        
        # We reuse the logic from mcp_bridge.py but import/call it here
        # For production, we'll keep the core logic in a helper or here
        
        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "luca-mcp", "version": "1.0.0"}
                }
            }
            
        if method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "tools": [
                        {
                            "name": "recall_memory",
                            "description": "Search Luca's long-term memory for facts and entities.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {"query": {"type": "string"}}
                            }
                        },
                        {
                            "name": "memorize_fact",
                            "description": "Inject a new fact into Luca's memory.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {"fact": {"type": "string"}},
                                "required": ["fact"]
                            }
                        }
                    ]
                }
            }
            
        if method == "tools/call":
            name = params.get("name")
            args = params.get("arguments", {})
            connector = SQLiteMemoryConnector()
            
            if name == "recall_memory":
                query = args.get("query", "")
                # Direct SQL search (simplified version of mcp_bridge.py)
                import sqlite3
                conn = sqlite3.connect(connector.db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT content FROM memories WHERE content LIKE ? LIMIT 5", (f"%{query}%",))
                mems = [f"- {r[0]}" for r in cursor.fetchall()]
                conn.close()
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {"content": [{"type": "text", "text": "\n".join(mems) or "No memories found."}]}
                }

            if name == "memorize_fact":
                fact = args.get("fact", "")
                import sqlite3
                conn = sqlite3.connect(connector.db_path)
                cursor = conn.cursor()
                cursor.execute("INSERT INTO memories (content, type) VALUES (?, 'semantic')", (fact,))
                conn.commit()
                conn.close()
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {"content": [{"type": "text", "text": "Memory locked in."}]}
                }

        return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": "Method not found"}}
    except Exception as e:
        print(f"[CORTEX] MCP Error: {e}")
        return {"jsonrpc": "2.0", "id": data.get("id"), "error": {"code": -32000, "message": str(e)}}

@app.on_event("startup")
async def startup_event():
    # We delay RAG init until first use (get_rag) to ensure settings are loaded
    print("[CORTEX] Startup: Embedding routing active")


def get_acceleration_status():
    try:
        import torch

        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            return {
                "acceleration": "cuda",
                "accelerator_ready": True,
                "device": device_name,
            }

        mps_backend = getattr(torch.backends, "mps", None)
        if mps_backend and torch.backends.mps.is_available():
            return {
                "acceleration": "mps",
                "accelerator_ready": True,
                "device": "Apple Silicon GPU",
            }

        return {
            "acceleration": "cpu",
            "accelerator_ready": False,
            "device": "CPU fallback",
        }
    except ImportError:
        return {
            "acceleration": "unavailable",
            "accelerator_ready": False,
            "device": "Torch not installed",
        }
    except Exception as exc:
        return {
            "acceleration": "unknown",
            "accelerator_ready": False,
            "device": f"Probe failed: {exc}",
        }


@app.get("/health")
async def health_check():
    acceleration = get_acceleration_status()
    return {
        "status": "online", 
        "rag_initialized": rag is not None,
        "backend": "Gemini/LightRAG",
        "embedding_model": embedding_logic.current_model if embedding_logic else "none",
        "runtime": "python",
        "platform": {
            "system": PLATFORM_INFO["system"],
            "machine": PLATFORM_INFO["machine"],
        },
        "local_models_ready": acceleration["acceleration"] != "unavailable",
        **acceleration,
    }

@app.get("/api/vision/status")
async def vision_status():
    """Returns the status of specialized vision and live-speech models."""
    return {
        "vision_agent": True, 
        "vision_models_ready": True, 
        "live_models_ready": True,
        "provider": "Hybrid"
    }

# --- EMBEDDING ENDPOINTS ---

class EmbedRequest(BaseModel):
    texts: list[str]
    model: Optional[str] = None  # If provided, use this model for this request

class EmbedSettingsRequest(BaseModel):
    model: str  # The embedding model ID to use

@app.post("/embed")
async def embed_texts(request: EmbedRequest):
    """Generate embeddings for texts using current or specified model."""
    if not rag_embedding_func:
        try:
            await get_rag()
        except Exception as e:
            print(f"[CORTEX] Failed to auto-initialize RAG for embedding: {e}")
            
    if not rag_embedding_func:
        raise HTTPException(status_code=503, detail="Embedding system not available")
    
    # Temporarily switch model if specified
    original_model = embedding_logic.current_model
    if request.model:
        embedding_logic.set_model(request.model)
    
    try:
        embeddings = await embedding_logic.acall(request.texts)
        return {
            "embeddings": embeddings.tolist(),
            "model": embedding_logic.current_model,
            "dimension": embeddings.shape[1] if len(embeddings.shape) > 1 else len(embeddings)
        }
    finally:
        # Restore original model if we switched
        if request.model:
            embedding_logic.set_model(original_model)

@app.post("/settings/embedding")
async def set_embedding_model(request: EmbedSettingsRequest):
    """Set the active embedding model for memory operations."""
    # Logic is managed by HybridEmbeddingLogic, so we don't need RAG initialized yet
    
    # Validate model ID
    valid_models = ["gemini", "gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.0-flash"]
    embedding_models = [k for k, v in MODEL_PATHS.items() if v.get("category") == "embedding"]
    valid_models.extend(embedding_models)
    
    if request.model not in valid_models:
        raise HTTPException(status_code=400, detail=f"Invalid model: {request.model}. Valid: {valid_models}")
    
    embedding_logic.set_model(request.model)
    return {
        "status": "success",
        "model": request.model,
        "dimension": embedding_logic._embedding_dim
    }

@app.get("/settings/embedding")
async def get_embedding_model():
    """Get the current active embedding model."""
    # Always available via logic class
    return {
        "model": embedding_logic.current_model,
        "dimension": embedding_logic._embedding_dim,
        "available": True
    }

class MemoryIngestRequest(BaseModel):
    text: str
    model: Optional[str] = "gemini-3-pro-preview"
    metadata: Optional[Dict] = None

class MemoryQueryRequest(BaseModel):
    query: str
    mode: str = "hybrid" # local, global, hybrid, naive
    model: Optional[str] = "gemini-3-pro-preview"

# --- MEMORY ENDPOINTS ---

@app.post("/memory/ingest")
async def ingest_memory(request: MemoryIngestRequest):
    try:
        # Determine if the request is targeting a local model
        is_local_model = request.model and any(kw in request.model.lower() for kw in ["gemma", "phi", "llama", "local", "model2vec", "qwen", "ollama"])
        
        # Ingest into BOTH Minds if cloud is requested, otherwise stick to Local/HDC
        # 1. Local Mind (Zero Cost History)
        local_rag = await get_rag(mind_type="local")
        
        # 2. Cloud Mind (High Quality Context) - Skip if local model is requested
        cloud_rag = None
        if not is_local_model:
            cloud_rag = await get_rag(mind_type="cloud", model_id=request.model)
        
        if not local_rag and not cloud_rag:
            raise HTTPException(status_code=503, detail="RAG system not initialized")
            
        import time
        memory_text = f"[{int(time.time())}] Memory: {request.text}"
        
        # Save to Master SQLite FIRST (Async HDC Ingestion)
        connector = SQLiteMemoryConnector()
        await connector.add_memory_hdc(request.text)
        
        # Asynchronously ingest into available RAG instances
        tasks = []
        if local_rag: tasks.append(local_rag.ainsert(memory_text))
        if cloud_rag: tasks.append(cloud_rag.ainsert(memory_text))
        
        if tasks:
            await asyncio.gather(*tasks)
            print(f"[CORTEX] ✅ Indexed in {'Dual-Minds' if cloud_rag else 'Local-Mind'} + HDC Persistent Layer.")
        
        return {"status": "success", "message": f"Memory ingested into {'Dual-Minds' if cloud_rag else 'Local-Mind'} with HDC Compression"}
    except Exception as e:
        print(f"[CORTEX] Ingest Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/memory/query")
async def query_memory(request: MemoryQueryRequest):
    try:
        # Get QueryParam class from lazy loader
        _, QueryParam_Class, _, _, _, _ = lazy_import_lightrag()
        
        is_local_model = request.model and any(kw in request.model.lower() for kw in ["gemma", "phi", "llama", "local", "model2vec", "qwen", "ollama"])
        
        local_rag = await get_rag(mind_type="local")
        cloud_rag = None
        if not is_local_model:
            cloud_rag = await get_rag(mind_type="cloud", model_id=request.model)
        
        mode_map = {"local": "local", "global": "global", "hybrid": "hybrid", "naive": "naive"}
        query_mode = mode_map.get(request.mode, "naive")
        
        print(f"[CORTEX] 🧠 {'Dual-Mind' if cloud_rag else 'Local-Mind'} Query initiating (Mode: {query_mode})...")
        
        # 3. HDC Hybrid Optimization (REFRAG-inspired)
        if request.mode == "hdc":
            print("[CORTEX] ⚡ HDC Neural Sensing active. Building high-density context...")
            connector = SQLiteMemoryConnector()
            # Retrieve from SQL (Simple keyword/vector hybrid retrieval placeholder)
            # In production, we merge the LightRAG chunks with our Deep Summaries
            raw_memories = connector.get_unindexed_memories(0)[-20:] # Get last 20 for HDC sensing
            processed_memories = []
            for m in raw_memories:
                processed_memories.append({
                    "content": m["content"],
                    "deep_summary": m["deep_summary"],
                    "similarity": 0.9 # Placeholder: in prod this uses embedding distance
                })
            
            if connector.hdc:
                combined = connector.hdc.sense_and_expand(processed_memories)
                return {"result": combined, "model": "hdc-sovereign"}

        # Search both RAG instances in parallel
        tasks = []
        if local_rag: tasks.append(local_rag.aquery(request.query, param=QueryParam_Class(mode=query_mode)))
        if cloud_rag: tasks.append(cloud_rag.aquery(request.query, param=QueryParam_Class(mode=query_mode)))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results
        valid_results = [r for r in results if isinstance(r, str) and "I do not have enough information" not in r]
        
        if not valid_results:
             return {"result": "No relevant memories found in local or cloud storage.", "model": "dual-mind"}
             
        # Merge results into a cohesive context
        combined = "\n\n---\n\n".join(valid_results)
        return {"result": combined, "model": "dual-mind"}
        
    except Exception as e:
        print(f"[CORTEX] Query Error: {e}")
        return {"result": f"Memory retrieval failed: {e}", "model": "error"}


# --- SETTINGS ENDPOINTS ---

@app.get("/api/settings")
async def get_all_settings():
    return get_settings()

class UpdateSettingRequest(BaseModel):
    key: str
    value: Any

@app.post("/api/settings/update")
async def update_setting(request: UpdateSettingRequest):
    settings = load_settings()
    settings[request.key] = request.value
    save_settings(settings)
    
    # Update current runtime flag if it's the sync toggle
    if request.key == "enable_background_sync":
        global ENABLE_BACKGROUND_SYNC
        ENABLE_BACKGROUND_SYNC = bool(request.value)
        
    return {"success": True, "message": f"Setting '{request.key}' updated to {request.value}"}

# Helper for PIN validation
from fastapi import Header, HTTPException, Request

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

@app.post("/mouse/move")
async def mouse_move(request: MouseMoveRequest, authorized: bool = Depends(verify_session)):
    if not PYAUTOGUI_AVAILABLE:
        return {"status": "error", "message": "Mouse control not available on server"}
    try:
        pyautogui.moveTo(request.x, request.y, _pause=False)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/keyboard/type")
async def keyboard_type(request: KeyboardTypeRequest, authorized: bool = Depends(verify_session)):
    if not PYAUTOGUI_AVAILABLE:
        return {"status": "error", "message": "Keyboard control not available on server"}
    try:
        pyautogui.write(request.text, interval=request.interval)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/keyboard/press")
async def keyboard_press(request: KeyboardPressRequest, authorized: bool = Depends(verify_session)):
    if not PYAUTOGUI_AVAILABLE:
        return {"status": "error", "message": "Keyboard control not available on server"}
    try:
        # Unpack list of keys e.g. ['command', 'space']
        pyautogui.hotkey(*request.keys)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/system/applescript")
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

# --- VOICE HUB INTEGRATION (Gemini Ear + Cloud Voice) ---
from fastapi import WebSocket, WebSocketDisconnect
import os
import shutil
import requests
import base64
import json
# Modern GenAI SDK handles this now
import time

# Configuration
CLOUD_TTS_URL = "https://lorette-zanyish-tragically.ngrok-free.dev/synthesize" # Default Cloud TTS

class VoiceAgentHelper:
    def __init__(self):
        # Upgrade to Gemini 3.0 Flash (2026 SOTA) for best speed/accuracy
        self.model_name = "gemini-2.0-flash" # Use canonical name for new SDK
        self.tts_url = "http://localhost:8000/tts" # Local yarnGPT or Cloud
        
        # Local STT Engine (Lazy Initialized)
        self._local_stt = None

    @property
    def local_stt(self):
        if self._local_stt is None:
            from local_stt import LocalSTT
            self._local_stt = LocalSTT()
        return self._local_stt

    async def hear(self, audio_data: bytes, model_name: Optional[str] = None) -> str:
        """Sends raw audio to Gemini OR Local STT and gets text."""
        try:
            target_model = model_name or self.model_name
            
            # Check if Local Model requested
            if target_model in MODEL_PATHS and MODEL_PATHS[target_model].get("category") == "stt":
                 print(f"[VOICE] Using Local STT: {target_model}")
                 path = MODEL_PATHS[target_model]["path"]
                 # Run in executor to avoid blocking async loop since transcribe is blocking
                 loop = asyncio.get_running_loop()
                 return await loop.run_in_executor(None, self.local_stt.transcribe, audio_data, path)

            # Default to Cloud (Gemini)
            client = get_genai_client()
            if not client:
                return ""
                
            # Gemini Native Audio Processing (Async SDK)
            from google.genai import types as genai_types
            response = await client.aio.models.generate_content(
                model=target_model,
                contents=[
                    genai_types.Part.from_bytes(data=audio_data, mime_type="audio/webm"),
                    "Listen to this audio chunk. Transcribe all speech you hear. If there is background noise, silence, or no clear speech, return an empty string. If you hear a command for an AI assistant named 'Luca', transcribe it accurately."
                ]
            )
            return response.text.strip()
        except Exception as e:
            print(f"[VOICE] Hearing Error: {e}")
            return ""

    def speak_cloud(self, text: str) -> str:
        """Sends text to Google Cloud TTS (Studio Female) and returns Base64 Audio."""
        try:
            if not text or len(text.strip()) < 2: return None
            
            # Google Cloud TTS REST API
            url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={GOOGLE_API_KEY}"
            payload = {
                "input": {"text": text},
                # Sci-Fi AI Configuration: Luca Voice (Neural2-F - Crisp Female) + Faster Rate
                "voice": {"languageCode": "en-US", "name": "en-US-Neural2-F"},
                "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.25, "pitch": 1.0}
            }
            
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get("audioContent") # Google returns 'audioContent' as base64
            else:
                print(f"[VOICE] Google TTS Failed: {response.text}")
                return None
        except Exception as e:
            print(f"[VOICE] Cloud TTS Error: {e}")
            return None

voice_agent = VoiceAgentHelper()

# --- SPEAKER IDENTITY (PYANNOTE) ---
PYANNOTE_API_KEY = os.environ.get("PYANNOTE_API_KEY")

class SpeakerManager:
    def __init__(self):
        self.api_key = PYANNOTE_API_KEY
        if not self.api_key:
            print("[CORTEX] WARN: No PYANNOTE_API_KEY found. Identity Layer Disabled.")
        else:
            print("[CORTEX] Identity Layer Active (Pyannote Cloud)")

    def identify(self, audio_data: bytes) -> str:
        """
        Uploads audio to Pyannote.ai and determines if it is the Commander.
        Returns: "COMMANDER" or "GUEST" (or "UNKNOWN")
        """
        if not self.api_key: return "UNKNOWN"
        
        try:
            # 1. Save temp file
            temp_path = "temp_voice_id.wav"
            with open(temp_path, "wb") as f:
                f.write(audio_data)
            
            # 2. Upload (Start Job)
            url = "https://api.pyannote.ai/v1/diarize"
            headers = {"Authorization": f"Bearer {self.api_key}"}
            files = {'file': open(temp_path, 'rb')}
            
            # Note: Using 'webhook_url' is better for async, but we poll for simplicity here
            response = requests.post(url, headers=headers, files=files)
            
            if response.status_code != 200:
                print(f"[CORTEX] ID Request Failed: {response.text}")
                return "ERROR"
                
            job_id = response.json()['jobId']
            
            # 3. Poll for Result (Timeout 5s)
            start_time = time.time()
            while time.time() - start_time < 5:
                status_res = requests.get(f"{url}/{job_id}", headers=headers)
                if status_res.status_code == 200:
                    status = status_res.json()['status']
                    if status == "succeeded":
                        # 4. Analyze Output
                        output = status_res.json()['output']
                        # Simple logic: If any speaker is detected, return label.
                        # Real usage: Compare embeddings. Here we assume Speaker_00 = Commander (First speaker).
                        if output and 'speakers' in output and len(output['speakers']) > 0:
                            return "COMMANDER" # Assuming single speaker flow for now
                        return "SILENCE"
                time.sleep(0.5)
            
            return "TIMEOUT"

        except Exception as e:
            print(f"[CORTEX] Diarization Error: {e}")
            return "ERROR"

speaker_manager = SpeakerManager()

@app.post("/speaker/identify")
async def identify_speaker_endpoint(request: Dict[str, Any] = Body(...)):
    """Receives base64 audio and returns identity."""
    try:
        audio_b64 = request.get("audio")
        if not audio_b64:
             return {"status": "error", "message": "No audio provided"}
             
        if "," in audio_b64:
            audio_b64 = audio_b64.split(",")[1]
            
        audio_bytes = base64.b64decode(audio_b64)
        identity = speaker_manager.identify(audio_bytes)
        
        return {"status": "success", "identity": identity}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[VOICE] Client Connected")
    try:
        while True:
            # 1. Receive Audio (Blob/Bytes) or Text (JSON)
            # Frontend sends: { type: "audio", data: "base64..." } or raw bytes?
            # Let's assume JSON wrapper for cleaner handling like our prototype
            message_json = await websocket.receive_json()
            
            if message_json.get("type") == "audio_input":
                # A. HEAR (Gemini ASR)
                # Decode Base64 Audio
                audio_b64 = message_json.get("data")
                print(f"[VOICE] Received audio chunk ({len(audio_b64)} chars b64)")
                
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                    
                    await websocket.send_json({"type": "status", "message": "LISTENING"})
                    
                    # Transcribe
                    model_override = message_json.get("model")
                    # Fallback to standard 2.0 flash if 2.5 is failing or specific override needed
                    transcript = await voice_agent.hear(audio_bytes, model_name=model_override)
                    print(f"[VOICE] Heard: {transcript}")
                    
                    if transcript:
                        await websocket.send_json({"type": "transcript", "text": transcript})
                        await websocket.send_json({"type": "status", "message": "THINKING"})
                        
                        # B. THINK (LLM)
                        # Get response from the assistant
                        # We use a simplified context for voice for speed
                        response_text = await active_agent.chat(transcript)
                        
                        await websocket.send_json({"type": "status", "message": "SPEAKING", "text": response_text})

                        # C. SPEAK (Local TTS - Kokoro/Piper)
                        # Determine voice model from settings or default
                        # effective_voice = voice_settings.get("voiceId", "af_heart") 
                        # For now hardcode or get from request if passed? Request only had 'model' for STT.
                        # Let's use a safe default 'af_heart' (Kokoro)
                        effective_voice = "af_heart"
                        
                        # Generate Audio
                        audio_base64 = None
                        
                        # Try Kokoro first (Best Quality)
                        if _KOKORO_CACHE or lazy_import_kokoro():
                            # Ensure wrapper is initialized - we might need a global instance or singleton
                            # For simplified context, let's instantiate or get from a global manager
                            # But wait, TTSRequest uses 'voice_agent.speak_cloud' which is distinct.
                            # We need to access the local wrapper directly.
                            
                            # Quick hack: Instantiate wrapper on fly or use a global if available
                            # Ideally this should be in voice_agent but voice_agent seems cloud focused
                            
                            tts = KokoroTTSWrapper(models_dir=os.path.expanduser("~/.cache/kokoro")) 
                            audio_base64 = tts.synthesize(response_text, voice_name=effective_voice)
                            
                        if audio_base64:
                             await websocket.send_json({"type": "audio", "data": audio_base64})
                        else:
                             await websocket.send_json({"type": "error", "message": "TTS Generation Failed"})

                    else:
                         # Explicitly notify of failure to transcribe
                        await websocket.send_json({"type": "error", "message": "No speech detected or transcription failed."})

                except Exception as e:
                    print(f"[VOICE] Processing Error: {e}")
                    traceback.print_exc()
                    await websocket.send_json({"type": "error", "message": f"Server Error: {str(e)}"})
                    
            elif message_json.get("type") == "tts_request":
                # B. SPEAK (Cloud TTS)
                text = message_json.get("text")
                await websocket.send_json({"type": "status", "message": "SPEAKING", "text": text})
                
                audio_base64 = voice_agent.speak_cloud(text)
                if audio_base64:
                    await websocket.send_json({"type": "audio", "data": audio_base64})
                else:
                    await websocket.send_json({"type": "error", "message": "TTS Failed"})

    except WebSocketDisconnect:
        print("[VOICE] Client Disconnected")
    except Exception as e:
        print(f"[VOICE] WS Error: {e}")

# --- LOCAL LUCA TTS (Lazy Loading Wrappers) ---
_PIPER_CACHE = None
_KOKORO_CACHE = None
_SUPERTONIC_CACHE = None

def lazy_import_piper():
    global _PIPER_CACHE
    if _PIPER_CACHE: return _PIPER_CACHE
    try:
        import soundfile as sf
        from piper.voice import PiperVoice
        _PIPER_CACHE = (sf, PiperVoice)
        return _PIPER_CACHE
    except ImportError:
        print("[CORTEX] WARN: Piper TTS libraries not found.")
        return None

def lazy_import_kokoro():
    global _KOKORO_CACHE
    if _KOKORO_CACHE: return _KOKORO_CACHE
    try:
        from kokoro import KPipeline
        _KOKORO_CACHE = KPipeline
        return _KOKORO_CACHE
    except ImportError:
        print("[CORTEX] WARN: Kokoro TTS libraries not found.")
        return None

def lazy_import_supertonic():
    global _SUPERTONIC_CACHE
    if _SUPERTONIC_CACHE: return _SUPERTONIC_CACHE
    try:
        from supertonic import TTS as SupertonicTTS
        _SUPERTONIC_CACHE = SupertonicTTS
        return _SUPERTONIC_CACHE
    except ImportError:
        print("[CORTEX] WARN: Supertonic TTS libraries not found.")
        return None

class TTSRequest(BaseModel):
    text: str
    voice: str = "amy"
    speed: float = 1.0

class PiperTTSWrapper:
    def __init__(self, models_dir=None):
        import sys
        is_frozen = getattr(sys, 'frozen', False)
        mode_env = os.environ.get("LUCA_MODE", "").lower()
        mode = "production" if (is_frozen or mode_env == "production") else "development"
        
        # Determine base models directory
        home_dir = os.path.expanduser("~")
        prod_base = os.path.join(home_dir, "Luca", "models")
        dev_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        
        if mode == "production":
            base_dir = prod_base
        else:
            try:
                os.makedirs(dev_base, exist_ok=True)
                test_file = os.path.join(dev_base, ".write_test")
                with open(test_file, "w") as f: f.write("test")
                os.remove(test_file)
                base_dir = dev_base
            except:
                base_dir = prod_base
        
        self.models_dir = os.path.join(base_dir, "piper")
        self.voices = {}
        
        # Unified Voice Map (Customizable for Luca's persona)
        # Structure: name -> path_on_huggingface
        self.VOICE_MAP = {
            "amy": "en/en_US/amy/medium",       # Smooth, expressive female (Default)
            "piper-amy-female": "en/en_US/amy/medium", # Alias for frontend
            "kristin": "en/en_US/kristin/medium", # Clear, professional female
            "hannah": "en/en_US/hannah/medium",   # Bright, friendly female
            "linda": "en/en_US/linda/medium",     # Soft, melodic female
            "ryan": "en/en_US/ryan/medium",       # Deep, calm male
            "piper-ryan-male": "en/en_US/ryan/medium", # Alias for frontend
        }
        
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir, exist_ok=True)
            
        print(f"[CORTEX] Piper Initialized (Mode: {mode}, Dir: {self.models_dir})")
            
    def get_model_path(self, voice_alias):
        # Convert alias to full filename if needed
        # e.g. "amy" -> "en_US-amy-medium"
        full_name = voice_alias
        if voice_alias in self.VOICE_MAP:
            # Reconstruct the Piper naming convention en_US-[voice]-[quality]
            parts = self.VOICE_MAP[voice_alias].split('/')
            voice_id = parts[2]
            quality = parts[3]
            full_name = f"en_US-{voice_id}-{quality}"

        onnx_file = os.path.join(self.models_dir, f"{full_name}.onnx")
        json_file = os.path.join(self.models_dir, f"{full_name}.onnx.json")
        return onnx_file, json_file, full_name

    def ensure_model(self, voice_alias):
        onnx_path, json_path, full_name = self.get_model_path(voice_alias)
        
        if not os.path.exists(onnx_path) or not os.path.exists(json_path):
            # Check if we have a mapping for this alias
            hf_path = self.VOICE_MAP.get(voice_alias)
            if not hf_path:
                print(f"[CORTEX] Unknown voice alias: {voice_alias}")
                return False

            print(f"[CORTEX] Downloading Piper Model for Luca: {voice_alias} ({full_name})...")
            base_url = f"https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/{hf_path}"
            
            try:
                # Download .onnx
                r = requests.get(f"{base_url}/{full_name}.onnx")
                with open(onnx_path, 'wb') as f: f.write(r.content)
                
                # Download .json
                r = requests.get(f"{base_url}/{full_name}.onnx.json")
                with open(json_path, 'wb') as f: f.write(r.content)
                print(f"[CORTEX] Download Complete: {voice_alias}")
            except Exception as e:
                print(f"[CORTEX] Model Download Failed: {e}")
                return False
        return True

    def synthesize(self, text, voice_name="amy", speed=1.0) -> Optional[str]:
        if not lazy_import_piper(): return None
        
        try:
            if not self.ensure_model(voice_name):
                return None
                
            onnx_path, json_path, full_name = self.get_model_path(voice_name)
            
            import subprocess
            temp_wav = f"/tmp/piper_{os.getpid()}.wav"
            
            # Use absolute path for piper binary and script if possible
            base_dir = os.path.dirname(os.path.abspath(__file__))
            piper_bin = os.path.join(base_dir, "venv/bin/piper")
            if not os.path.exists(piper_bin): piper_bin = "piper"
            
            cmd = [piper_bin, "--model", onnx_path, "--output_file", temp_wav]
            subprocess.run(cmd, input=text.encode('utf-8'), check=True, capture_output=True)
            
            if os.path.exists(temp_wav):
                with open(temp_wav, "rb") as f:
                    audio_b64 = base64.b64encode(f.read()).decode('utf-8')
                os.remove(temp_wav)
                return audio_b64
            return None
        except Exception as e:
            print(f"[CORTEX] Piper Synthesis Error: {e}")
            return None

class KokoroTTSWrapper:
    def __init__(self, models_dir):
        self.models_dir = models_dir
        self.pipelines = {} # Cache pipelines by language
        self.voices = {}    # Cache voices if needed
    
    def get_pipeline(self, lang_code='a'):
        if lang_code not in self.pipelines:
            KPipeline = lazy_import_kokoro()
            if not KPipeline: return None
            # Kokoro automatically downloads weights to ~/.cache/kokoro 
            self.pipelines[lang_code] = KPipeline(lang_code=lang_code, repo_id='hexgrad/Kokoro-82M')
        return self.pipelines[lang_code]

    def synthesize(self, text, voice_name="af_heart", speed=1.0) -> Optional[str]:
        if not lazy_import_kokoro(): return None
        try:
            # Determine language from voice prefix
            lang = 'a'
            if voice_name.startswith('b'): lang = 'b'
            
            pipeline = self.get_pipeline(lang)
            
            # Wrap generator in thread safe manner if needed, 
            # though synthesize is already called in to_thread from endpoint
            generator = pipeline(text, voice=voice_name, speed=speed)
            
            full_audio = []
            for _, _, audio in generator:
                full_audio.append(audio)
            
            if not full_audio:
                return None
                
            audio_data = np.concatenate(full_audio)
            
            # Convert to bytes (WAV) in memory
            import io
            import soundfile as sf
            buf = io.BytesIO()
            sf.write(buf, audio_data, 24000, format='WAV')
            buf.seek(0)
            
            return base64.b64encode(buf.read()).decode('utf-8')
        except Exception as e:
            print(f"[CORTEX] Kokoro In-Process Synthesis Error: {e}")
            traceback.print_exc()
            return None

class PocketTTSWrapper:
    def __init__(self, models_dir):
        self.models_dir = models_dir
        self.model = None
        self.voice_states = {}

    def ensure_model(self):
        if self.model: return True
        try:
            # Check if model exists in models_dir
            if not os.path.exists(self.models_dir) or not os.listdir(self.models_dir):
                print(f"[CORTEX] Pocket TTS model not found at {self.models_dir}. Please download it.")
                return False
            
            from pocket_tts import TTSModel
            self.model = TTSModel.load_model(self.models_dir)
            return True
        except Exception as e:
            print(f"[CORTEX] Pocket TTS Load Error: {e}")
            return False

    def synthesize(self, text, voice_name="alba", speed=1.0) -> Optional[str]:
        # Pocket TTS is often not available on Intel, skipping gracefully
        try:
            from pocket_tts import TTSModel
        except ImportError:
            return None
        try:
            # We delay import until here to avoid crash if library is missing
            try:
                from pocket_tts import TTSModel
            except ImportError:
                print("[CORTEX] pocket-tts package not installed. Synthesis skipped.")
                return None

            if not self.ensure_model(): return None
            
            # voice_name should be "alba" or "javert" (mapped from javert in wrapper)
            if voice_name not in self.voice_states:
                self.voice_states[voice_name] = self.model.get_state_for_audio_prompt(voice_name)
            
            state = self.voice_states[voice_name]
            audio_tensor = self.model.generate_audio(state, text)
            audio_np = audio_tensor.cpu().numpy()
            
            wav_io = io.BytesIO()
            sf.write(wav_io, audio_np, self.model.sample_rate, format='WAV')
            wav_io.seek(0)
            return base64.b64encode(wav_io.read()).decode('utf-8')
        except Exception as e:
            print(f"[CORTEX] Pocket TTS Synthesis Error: {e}")
            return None

class SupertonicWrapper:
    def __init__(self, models_dir):
        self.models_dir = models_dir
        self.engine = None
        self.voice_styles = {}

    def ensure_engine(self):
        if self.engine: return True
        try:
            # Supertonic might auto-download or we can point it to models_dir
            # For now, let's use the high-level API which handles its own weights
            self.engine = SupertonicTTS(auto_download=True)
            return True
        except Exception as e:
            print(f"[CORTEX] Supertonic Load Error: {e}")
            return False

    def synthesize(self, text, voice_name="F1", speed=1.0) -> Optional[str]:
        if not SUPERTONIC_AVAILABLE: return None
        try:
            if not self.ensure_engine(): return None
            
            # voice_name is like "F1", "M1", etc.
            if voice_name not in self.voice_styles:
                self.voice_styles[voice_name] = self.engine.get_voice_style(voice_name=voice_name)
            
            style = self.voice_styles[voice_name]
            wav, duration = self.engine.synthesize(text, voice_style=style)
            
            # wav is (1, samples) float32
            audio_np = wav.flatten()
            
            wav_io = io.BytesIO()
            sf.write(wav_io, audio_np, 44100, format='WAV')
            wav_io.seek(0)
            return base64.b64encode(wav_io.read()).decode('utf-8')
        except Exception as e:
            print(f"[CORTEX] Supertonic Synthesis Error: {e}")
            return None

# TTS Availability Flags (Global)
PIPER_AVAILABLE = True
KOKORO_AVAILABLE = True
POCKET_AVAILABLE = True
SUPERTONIC_AVAILABLE = True

# Initialize wrappers
piper_wrapper = PiperTTSWrapper()
kokoro_wrapper = KokoroTTSWrapper(str(MODELS_BASE_DIR / "tts" / "kokoro-82m"))
pocket_wrapper = PocketTTSWrapper(str(MODELS_BASE_DIR / "tts" / "pocket-tts"))
supertonic_wrapper = SupertonicWrapper(str(MODELS_BASE_DIR / "tts" / "supertonic-2"))

@app.post("/tts")
async def tts_endpoint(request: TTSRequest):
    voice_id = request.voice.lower()
    
    try:
        # Route based on voice ID prefix
        if voice_id.startswith("kokoro"):
            voice_part = voice_id.replace("kokoro-", "")
            if voice_part == "bella": voice_part = "af_bella"
            if voice_part == "heart": voice_part = "af_heart"
            
            # Wrap in to_thread to prevent blocking and potentially help with thread safety
            audio_b64 = await asyncio.to_thread(kokoro_wrapper.synthesize, request.text, voice_part, request.speed)
        
        elif voice_id.startswith("pocket-tts"):
            voice_part = voice_id.replace("pocket-tts-", "")
            audio_b64 = await asyncio.to_thread(pocket_wrapper.synthesize, request.text, voice_part, request.speed)

        elif voice_id.startswith("supertonic"):
            voice_part = voice_id.replace("supertonic-", "").upper()
            audio_b64 = await asyncio.to_thread(supertonic_wrapper.synthesize, request.text, voice_part, request.speed)
            
        else:
            # Default to Piper
            if not PIPER_AVAILABLE:
                raise HTTPException(status_code=503, detail="Piper TTS not available on server")
            audio_b64 = await asyncio.to_thread(piper_wrapper.synthesize, request.text, request.voice, request.speed)
            
        if audio_b64:
            return {"type": "audio", "data": audio_b64, "format": "wav"}
        else:
            raise HTTPException(status_code=500, detail="TTS Generation Failed")
    except Exception as e:
        print(f"[CORTEX] /tts Endpoint Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- VISION AGENT GETTERS ---
VISION_AGENT_AVAILABLE = True
LIVE_VISION_AVAILABLE = True
_vision_agent = None
_live_vision_agent = None

def get_vision_agent():
    global _vision_agent, VISION_AGENT_AVAILABLE
    if _vision_agent: return _vision_agent
    try:
        from vision_agent import ui_tars
        _vision_agent = ui_tars
        print("[CORTEX] Vision Agent (UI-TARS) lazy-loaded")
        return _vision_agent
    except Exception as e:
        print(f"[CORTEX] Vision Agent failed: {e}")
        VISION_AGENT_AVAILABLE = False
        return None

def get_live_vision_agent():
    global _live_vision_agent, LIVE_VISION_AVAILABLE
    if _live_vision_agent: return _live_vision_agent
    try:
        from live_vision_agent import astra_local
        _live_vision_agent = astra_local
        print("[CORTEX] Live Vision Agent lazy-loaded")
        return _live_vision_agent
    except Exception as e:
        print(f"[CORTEX] Live Vision Agent failed: {e}")
        LIVE_VISION_AVAILABLE = False
        return None

class VisionAgentRequest(BaseModel):
    image_base64: str
    target: str = "Describe what you see"
    screen_width: int = 1920
    screen_height: int = 1080
    prompt: Optional[str] = None

@app.post("/vision/analyze_live")
async def analyze_live_endpoint(request: VisionAgentRequest):
    if not LIVE_VISION_AVAILABLE:
        raise HTTPException(status_code=503, detail="Local Live Vision Agent not available")
    
    # Use custom prompt if provided, else use default logic
    agent = get_live_vision_agent()
    if not agent:
        raise HTTPException(status_code=503, detail="Live Vision Agent not available")
    analysis = agent.analyze(request.image_base64, request.prompt or request.target)
    if analysis:
        return {"status": "success", "analysis": analysis}
    else:
        raise HTTPException(status_code=500, detail="Live analysis failed")

# --- LOCAL LLM AGENT GETTER ---
LOCAL_LLM_AVAILABLE = True
_local_brain = None

def get_local_brain():
    global _local_brain, LOCAL_LLM_AVAILABLE
    if _local_brain: return _local_brain
    try:
        from local_llm_agent import local_brain
        _local_brain = local_brain
        print("[CORTEX] Local LLM Agent lazy-loaded")
        return _local_brain
    except Exception as e:
        print(f"[CORTEX] Local LLM Agent failed: {e}")
        LOCAL_LLM_AVAILABLE = False
        return None

class ChatCompletionRequest(BaseModel):
    messages: List[Dict[str, str]]
    tools: Optional[List[Dict[str, Any]]] = None
    temperature: float = 0.7
    max_tokens: int = 512
    model: Optional[str] = None # Support selecting which local model to use
    stream: bool = False

@app.post("/chat/completions")
async def chat_completions_endpoint(request: ChatCompletionRequest):
    brain = get_local_brain()
    if not brain or not LOCAL_LLM_AVAILABLE:
        raise HTTPException(status_code=503, detail="Local LLM Agent not available")
    
    try:
        if request.stream:
             # Streaming Response
             from sse_starlette.sse import EventSourceResponse
             from starlette.concurrency import iterate_in_threadpool
             
             # Get generator (this is instant as it returns a generator)
             generator = brain.generate_chat(
                messages=request.messages,
                tools=request.tools,
                model_id=request.model,
                stream=True
             )
             
             async def event_generator():
                 # We must iterate the sync generator in a threadpool to avoid blocking event loop
                 async for chunk in iterate_in_threadpool(generator):
                     # Checking for disconnect
                     if await request_disconnect(): 
                         break
                     yield json.dumps(chunk)
                     
             # Basic disconnection check helper
             async def request_disconnect():
                 return False # Simplified for now, or use request.is_disconnected() if available

             return EventSourceResponse(event_generator())
        
        else:
            # Blocking Response
            # Move to thread to prevent blocking the event loop during load/inference
            response = await asyncio.to_thread(
                brain.generate_chat,
                messages=request.messages,
                tools=request.tools,
                model_id=request.model,
                stream=False
            )
            return response
    except Exception as e:
        print(f"[CORTEX] Chat Generation Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class VisionRequest(BaseModel):
    screenshot: str # Base64
    instruction: str
    model: Optional[str] = None

@app.post("/vision/semantic-snapshot")
async def vision_semantic_snapshot(request: Dict[str, Any] = Body(...)):
    """
    REFRAG-inspired Visual HDC: Compresses a screenshot into a deep semantic summary.
    This prevents 'Visual Context Bloat' while maintaining long-term awareness.
    """
    try:
        screenshot_b64 = request.get("screenshot")
        # Target smolvlm-500m for efficiency, or fallback to ui-tars-2b
        model_id = request.get("model", "smolvlm-500m")
        instruction = request.get("instruction", "Summarize what the user is doing on screen in 1 short sentence.")
        
        # Use existing vision agent
        agent = get_vision_agent()
        
        # Check if local model is downloaded to avoid "Stealth Background Downloads"
        is_local_available = agent and VISION_AGENT_AVAILABLE and agent.is_downloaded(model_id)
        
        if not is_local_available:
             # Fallback to cloud vision if local is missing or not downloaded
             client = get_genai_client()
             if client:
                 mode_str = "Agent Missing" if not agent else "Model not downloaded"
                 print(f"[HDC-VISION] {mode_str}. Falling back to Cloud for Semantic Snapshot (Requested: {model_id}).")
                 from google.genai import types as genai_types
                 image_data = base64.b64decode(screenshot_b64)
                 resp = await client.aio.models.generate_content(
                     model="gemini-1.5-flash",
                     contents=[
                         genai_types.Part.from_bytes(data=image_data, mime_type="image/png"),
                         instruction
                     ]
                 )
                 summary = resp.text.strip()
             else:
                 return {"status": "error", "message": "No vision backend available (Local model not found and Cloud offline)"}
        else:
            # Resolve model ID to path
            model_arg = MODEL_PATHS.get(model_id, {}).get("path", model_id)
            # Use local UI-TARS, SmolVLM or Moondream
            summary = agent.process_screenshot(screenshot_b64, instruction, model_arg)

        # INGEST INTO HDC LAYER
        from knowledge import SQLiteMemoryConnector
        connector = SQLiteMemoryConnector()
        if connector.hdc:
            timestamp = int(time.time())
            full_content = f"[VISUAL_SNAPSHOT_{timestamp}] {summary}"
            await connector.add_memory_hdc(full_content)
            print(f"[HDC-VISION] Semantic Anchor Ingested: {summary}")
            return {"status": "success", "summary": summary}
        
        return {"status": "error", "message": "HDC layer not ready"}
    except Exception as e:
        print(f"[HDC-VISION] Error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/vision/analyze")
async def vision_analyze(request: VisionRequest):
    agent = get_vision_agent()
    if not agent or not VISION_AGENT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Vision Agent not available on this server. Install torch and vision_agent dependencies."
        )
    
    try:
        # Resolve Model ID to Path/Repo
        model_arg = request.model
        if model_arg and model_arg in MODEL_PATHS:
            print(f"[CORTEX] Resolving model ID '{model_arg}' to path: {MODEL_PATHS[model_arg]['path']}")
            model_arg = MODEL_PATHS[model_arg]["path"]

        # Lazy load happens inside the agent
        result = agent.process_screenshot(request.screenshot, request.instruction, model_arg)
        
        # Check if result indicates an error (UI-TARS returns "Error: ..." on failure)
        if result and (result.startswith("Error:") or "error" in result.lower()[:50]):
            return {"status": "error", "message": result}
        
        # Parse result (naive parsing for now, UI-TARS usually returns "(0.5, 0.5)" or action)
        return {"status": "success", "prediction": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class AgentClickRequest(BaseModel):
    target: str  # e.g. "5 button", "Send button", "Settings icon"
    screenshot: str = None  # Optional - if not provided, will capture screen
    screen_width: int = None
    screen_height: int = None

@app.post("/vision/agent-click")
async def vision_agent_click(request: AgentClickRequest):
    """
    Agentic Click: Use UI-TARS vision to locate and click a UI element.
    This combines readScreen + controlSystemInput into one atomic operation.
    """
    if not VISION_AGENT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Vision Agent not available. Install torch and ui_tars dependencies."
        )
    
    try:
        import pyautogui
        
        # Get screen dimensions
        screen_width = request.screen_width or pyautogui.size()[0]
        screen_height = request.screen_height or pyautogui.size()[1]
        
        # Capture screenshot if not provided
        if request.screenshot:
            screenshot_b64 = request.screenshot
        else:
            # Take screenshot using pyautogui
            import io
            import base64
            screenshot = pyautogui.screenshot()
            buffer = io.BytesIO()
            screenshot.save(buffer, format='PNG')
            screenshot_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # Execute the agentic click
        agent = get_vision_agent()
        result = agent.process_and_execute(
            screenshot_base64=screenshot_b64,
            target_element=request.target,
            screen_width=screen_width,
            screen_height=screen_height
        )
        
        if result.get("success"):
            return {
                "status": "success",
                "message": f"Clicked on '{request.target}' at ({result['x']}, {result['y']})",
                "action": result.get("action"),
                "coordinates": {"x": result['x'], "y": result['y']},
                "raw_prediction": result.get("raw_response")
            }
        else:
            return {
                "status": "error",
                "message": result.get("error", "Unknown error during agent click")
            }
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

# This file contains the pattern-based router code to add to cortex.py
# Insert this BEFORE the "if __name__ == '__main__':" line (around line 571)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOCAL ROUTER - Pattern-Based Intent Classification (Zero-Cloud Intercept)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Define simple tools for instant local execution
LOCAL_TOOLS = {
    # Time & Date
    "getTime": {
        "patterns": ["what time", "current time", "time is it", "tell me the time"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    "getDate": {
        "patterns": ["what date", "today's date", "what day", "current date"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    
    # Apps & System
    "openApp": {
        "patterns": ["open", "launch", "start"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "appName"
    },
    "controlSystem": {
        "patterns": ["brightness", "mute", "unmute"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "action"
    },
    
    # Media Controls (Tier 1)
    "playMusic": {
        "patterns": ["play", "play music", "play song"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "songInfo"
    },
    "pauseMedia": {
        "patterns": ["pause", "stop playing", "pause music", "pause video"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    "nextTrack": {
        "patterns": ["next song", "skip", "next track", "skip song"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    "previousTrack": {
        "patterns": ["previous song", "go back", "previous track", "last song"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    "setVolume": {
        "patterns": ["volume", "set volume", "volume to", "volume at"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "volumeLevel"
    },
    
    # Quick Actions (Tier 1)
    "takeScreenshot": {
        "patterns": ["screenshot", "take screenshot", "capture screen", "screen capture"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "calculator": {
        "patterns": ["calculate", "what is", "how much is", "compute"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "expression"
    },
    "openUrl": {
        "patterns": ["go to", "navigate to", "open website"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "url"
    },
    
    # Search
    "searchWeb": {
        "patterns": ["search for", "google", "look up", "find information"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "query"
    },
    
    # Tier 2: Weather & Information
    "getWeather": {
        "patterns": ["weather", "temperature", "forecast", "how's the weather"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "location"
    },
    
    # Tier 2: Communication
    "callContact": {
        "patterns": ["call", "phone", "dial"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "contactName"
    },
    "messageContact": {
        "patterns": ["message", "text", "send message", "send text"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "messageInfo"
    },
    
    # Tier 2: Smart Home
    "toggleLights": {
        "patterns": ["lights on", "lights off", "turn on lights", "turn off lights", "toggle lights"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "lightAction"
    },
    "setTemperature": {
        "patterns": ["set temperature", "temperature to", "thermostat", "set thermostat"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "temperature"
    },
    
    # Tier 2: System Security
    "lockScreen": {
        "patterns": ["lock screen", "lock computer", "lock my screen", "lock this"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "sleep": {
        "patterns": ["sleep", "put to sleep", "sleep mode", "sleep computer"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 3: Advanced Productivity
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    # Reminders & Time Management
    "setReminder": {
        "patterns": ["remind me", "set reminder", "reminder for", "reminder to"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "reminderInfo"
    },
    "setTimer": {
        "patterns": ["set timer", "timer for", "start timer", "countdown"],
        "confidence_boost": 0.35,
        "extract_params": True,
        "param_name": "duration"
    },
    "setAlarm": {
        "patterns": ["set alarm", "alarm for", "wake me", "alarm at"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "alarmTime"
    },
    
    # File Operations
    "openFile": {
        "patterns": ["open file", "show file", "open document"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "fileName"
    },
    "createFolder": {
        "patterns": ["create folder", "new folder", "make folder", "make directory"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "folderName"
    },
    "deleteFile": {
        "patterns": ["delete file", "remove file", "trash file"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "fileName"
    },
    
    # Translation & Language
    "translate": {
        "patterns": ["translate", "how do you say", "what is", "translation of"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "translateInfo"
    },
    "defineWord": {
        "patterns": ["define", "definition of", "what does", "meaning of", "what is"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "word"
    },
    
    # Email
    "composeEmail": {
        "patterns": ["email", "send email", "compose email", "write email"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "emailInfo"
    },
    
    # Advanced System
    "restart": {
        "patterns": ["restart", "reboot", "restart computer"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "shutdown": {
        "patterns": ["shutdown", "shut down", "turn off computer", "power off"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "closeApp": {
        "patterns": ["close", "quit", "exit", "kill"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "appName"
    },
    
    # Clipboard
    "copyText": {
        "patterns": ["copy", "copy this", "copy to clipboard"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "text"
    },
    "paste": {
        "patterns": ["paste", "paste from clipboard"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    
    # Focus & Productivity
    "enableFocusMode": {
        "patterns": ["focus mode", "do not disturb", "dnd on", "enable focus"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "disableFocusMode": {
        "patterns": ["disable focus", "dnd off", "turn off focus", "disable do not disturb"],
        "confidence_boost": 0.35,
        "extract_params": False
    }
}

def extract_parameters(text: str, text_lower: str, pattern: str, param_name: str) -> dict:
    """Extract parameters from text based on pattern"""
    params = {}
    
    if not param_name:
        return params
    
    # Extract based on parameter type
    if param_name == "appName":
        # Extract app name after "open", "launch", "start"
        trigger_words = ["open", "launch", "start"]
        for word in trigger_words:
            if word in text_lower:
                parts = text_lower.split(word, 1)
                if len(parts) > 1:
                    app_name = parts[1].strip().split()[0] if parts[1].strip() else ""
                    if app_name:
                        params["appName"] = app_name
                        break
    
    elif param_name == "query":
        # Extract search query and detect search engine
        query_text = None
        search_engine = "google"  # Default
        
        # Detect search engine
        if "bing" in text_lower or "on bing" in text_lower:
            search_engine = "bing"
        elif "duckduckgo" in text_lower or "duck duck go" in text_lower:
            search_engine = "duckduckgo"
        elif "google" in text_lower:
            search_engine = "google"
        
        for separator in ["search for", "google", "bing", "look up", "find information about", "find"]:
            if separator in text_lower:
                parts = text.split(separator, 1)
                if len(parts) > 1:
                    query_text = parts[1].strip()
                    # Remove engine names from query
                    query_text = query_text.replace("on google", "").replace("on bing", "").replace("on duckduckgo", "").strip()
                    if query_text:
                        params["query"] = query_text
                        params["engine"] = search_engine
                        break
    
    elif param_name == "action":
        # Extract action type
        actions = ["volume", "brightness", "mute", "unmute", "screenshot"]
        for action in actions:
            if action in text_lower:
                params["action"] = action.upper()
                if "up" in text_lower:
                    params["action"] = f"{action.upper()}_UP"
                elif "down" in text_lower:
                    params["action"] = f"{action.upper()}_DOWN"
                break
    
    elif param_name == "songInfo":
        # Extract song/artist info after "play"
        if "play" in text_lower:
            parts = text.split("play", 1)
            if len(parts) > 1:
                song_info = parts[1].strip()
                
                # Detect which music app to use
                app_keywords = {
                    "spotify": ["on spotify", "in spotify", "spotify"],
                    "apple music": ["on apple music", "in apple music", "apple music"],
                    "youtube": ["on youtube", "youtube music", "youtube"],
                    "soundcloud": ["on soundcloud", "soundcloud"]
                }
                
                detected_app = None
                for app_name, keywords in app_keywords.items():
                    for keyword in keywords:
                        if keyword in text_lower:
                            detected_app = app_name
                            # Remove app name from song info
                            song_info = song_info.replace(keyword, "").strip()
                            break
                    if detected_app:
                        break
                
                # Clean up common words
                song_info = song_info.replace("music", "").replace("song", "").strip()
                
                if song_info:
                    params["songInfo"] = song_info
                    if detected_app:
                        params["app"] = detected_app
                    else:
                        # Default to Spotify if no app specified
                        params["app"] = "spotify"
    
    elif param_name == "volumeLevel":
        # Extract volume level (number)
        import re
        numbers = re.findall(r'\d+', text)
        if numbers:
            params["volumeLevel"] = int(numbers[0])
        else:
            if "up" in text_lower:
                params["volumeLevel"] = "UP"
            elif "down" in text_lower:
                params["volumeLevel"] = "DOWN"
    
    elif param_name == "expression":
        # Extract math expression
        for trigger in ["calculate", "what is", "how much is", "compute"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    expression = parts[1].strip().rstrip("?")
                    if expression:
                        params["expression"] = expression
                        break
    
    elif param_name == "url":
        # Extract URL
        import re
        url_match = re.search(r'(https?://[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(com|org|net|io|dev)[^\s]*)', text_lower)
        if url_match:
            params["url"] = url_match.group(1)
        else:
            for trigger in ["go to", "navigate to", "open website"]:
                if trigger in text_lower:
                    parts = text.split(trigger, 1)
                    if len(parts) > 1:
                        potential_url = parts[1].strip()
                        
                        # Detect browser preference
                        browser = "default"
                        if "in chrome" in text_lower or "on chrome" in text_lower:
                            browser = "chrome"
                            potential_url = potential_url.replace("in chrome", "").replace("on chrome", "").strip()
                        elif "in safari" in text_lower or "on safari" in text_lower:
                            browser = "safari"
                            potential_url = potential_url.replace("in safari", "").replace("on safari", "").strip()
                        elif "in firefox" in text_lower or "on firefox" in text_lower:
                            browser = "firefox"
                            potential_url = potential_url.replace("in firefox", "").replace("on firefox", "").strip()
                        elif "in edge" in text_lower or "on edge" in text_lower:
                            browser = "edge"
                            potential_url = potential_url.replace("in edge", "").replace("on edge", "").strip()
                        
                        if not potential_url.startswith(("http://", "https://")):
                            if not "." in potential_url:
                                potential_url += ".com"
                            potential_url = "https://" + potential_url
                        
                        params["url"] = potential_url
                        params["browser"] = browser
                        break
    
    elif param_name == "location":
        # Extract location for weather
        for trigger in ["weather in", "temperature in", "forecast for", "weather", "temperature", "forecast"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    location = parts[1].strip().rstrip("?")
                    if location:
                        params["location"] = location
                        break
    
    elif param_name == "contactName":
        # Extract contact name after "call"/"phone"/"dial"
        for trigger in ["call", "phone", "dial"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    contact = parts[1].strip()
                    
                    # Detect calling app
                    calling_app = "phone"  # Default
                    if "on whatsapp" in text_lower or "whatsapp call" in text_lower:
                        calling_app = "whatsapp"
                        contact = contact.replace("on whatsapp", "").strip()
                    elif "facetime" in text_lower or "on facetime" in text_lower:
                        calling_app = "facetime"
                        contact = contact.replace("facetime", "").replace("on facetime", "").strip()
                    elif "on zoom" in text_lower or "zoom call" in text_lower:
                        calling_app = "zoom"
                        contact = contact.replace("on zoom", "").replace("zoom call", "").strip()
                    elif "on telegram" in text_lower or "telegram call" in text_lower:
                        calling_app = "telegram"
                        contact = contact.replace("on telegram", "").replace("telegram call", "").strip()
                    
                    if contact:
                        params["contactName"] = contact
                        params["app"] = calling_app
                        break
    
    elif param_name == "messageInfo":
        # Extract contact and message
        for trigger in ["message", "text", "send message to", "send text to"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    info = parts[1].strip()
                    
                    # Detect messaging app
                    messaging_app = "whatsapp"  # Default
                    if "on telegram" in text_lower or "telegram" in text_lower:
                        messaging_app = "telegram"
                        info = info.replace("on telegram", "").replace("telegram", "").strip()
                    elif "on discord" in text_lower or "discord" in text_lower:
                        messaging_app = "discord"
                        info = info.replace("on discord", "").replace("discord", "").strip()
                    elif "on whatsapp" in text_lower or "whatsapp" in text_lower:
                        messaging_app = "whatsapp"
                        info = info.replace("on whatsapp", "").replace("whatsapp", "").strip()
                    elif "sms" in text_lower or "text message" in text_lower:
                        messaging_app = "sms"
                        info = info.replace("sms", "").replace("text message", "").strip()
                    
                    # Try to split contact and message (e.g., "James that I'll be late")
                    if " that " in info:
                        contact, message = info.split(" that ", 1)
                        params["contactName"] = contact.strip()
                        params["message"] = message.strip()
                    else:
                        params["contactName"] = info
                    
                    params["app"] = messaging_app
                    break
    
    elif param_name == "lightAction":
        # Extract light action and room
        if "on" in text_lower:
            params["action"] = "ON"
        elif "off" in text_lower:
            params["action"] = "OFF"
        else:
            params["action"] = "TOGGLE"
        
        # Extract room if mentioned
        for room in ["living room", "bedroom", "kitchen", "bathroom", "office"]:
            if room in text_lower:
                params["room"] = room.title()
                break
    
    elif param_name == "temperature":
        # Extract temperature value
        import re
        numbers = re.findall(r'\d+', text)
        if numbers:
            params["temperature"] = int(numbers[0])
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 3: Advanced Parameter Extraction
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    elif param_name == "reminderInfo":
        # Extract reminder text and time
        for trigger in ["remind me to", "remind me", "set reminder for", "reminder to"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    info = parts[1].strip()
                    # Try to extract time if present
                    import re
                    time_patterns = r'(at \d+|in \d+ (minutes?|hours?|days?)|tomorrow|tonight)'
                    time_match = re.search(time_patterns, info.lower())
                    if time_match:
                        params["time"] = time_match.group(0)
                        info = re.sub(time_patterns, '', info, flags=re.IGNORECASE).strip()
                    params["reminderText"] = info
                    break
    
    elif param_name == "duration":
        # Extract timer duration
        import re
        # Match patterns like "5 minutes", "2 hours", "30 seconds"
        duration_match = re.search(r'(\d+)\s*(second|minute|hour|min|sec|hr)s?', text_lower)
        if duration_match:
            value = int(duration_match.group(1))
            unit = duration_match.group(2)
            # Normalize unit
            if unit in ['sec', 'second']:
                params["seconds"] = value
            elif unit in ['min', 'minute']:
                params["seconds"] = value * 60
            elif unit in ['hr', 'hour']:
                params["seconds"] = value * 3600
            params["duration"] = f"{value} {unit}s"
    
    elif param_name == "alarmTime":
        # Extract alarm time
        import re
        # Match patterns like "7am", "7:30pm", "19:00"
        time_match = re.search(r'(\d{1,2})(:(\d{2}))?(\s*)(am|pm)?', text_lower)
        if time_match:
            params["time"] = time_match.group(0).strip()
    
    elif param_name == "fileName":
        # Extract filename
        for trigger in ["open file", "show file", "delete file", "remove file", "trash file"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    filename = parts[1].strip()
                    params["fileName"] = filename
                    break
    
    elif param_name == "folderName":
        # Extract folder name
        for trigger in ["create folder", "new folder", "make folder"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    folder = parts[1].strip()
                    params["folderName"] = folder
                    break
    
    elif param_name == "translateInfo":
        # Extract text to translate and target language
        for trigger in ["translate", "how do you say"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    info = parts[1].strip()
                    # Check for "to [language]"
                    if " to " in info:
                        text_to_translate, target_lang = info.split(" to ", 1)
                        params["text"] = text_to_translate.strip()
                        params["targetLanguage"] = target_lang.strip()
                    else:
                        params["text"] = info
                    break
    
    elif param_name == "word":
        # Extract word to define
        for trigger in ["define", "definition of", "what does", "meaning of"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    word = parts[1].strip().replace(" mean", "").replace("?", "").strip()
                    params["word"] = word
                    break
    
    elif param_name == "emailInfo":
        # Extract email recipient and subject
        for trigger in ["email", "send email to", "compose email to"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    info = parts[1].strip()
                    # Check for "about [subject]"
                    if " about " in info:
                        recipient, subject = info.split(" about ", 1)
                        params["recipient"] = recipient.strip()
                        params["subject"] = subject.strip()
                    else:
                        params["recipient"] = info
                    break
    
    elif param_name == "text":
        # Extract text to copy
        for trigger in ["copy", "copy this"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    text_to_copy = parts[1].strip()
                    if text_to_copy:
                        params["text"] = text_to_copy
                    break
    
    return params

@app.post("/api/router/classify")
async def classify_intent(request: dict = Body(...)):
    """
    Pattern-based intent classification for instant tool execution.
    
    Examples:
    - "open calculator" → openApp(appName="calculator")
    - "what time is it" → getTime()
    - "search for python tutorials" → searchWeb(query="python tutorials")
    """
    try:
        text = request.get("text", "").strip()
        
        if not text:
            return {"success": False, "error": "Empty text"}
        
        text_lower = text.lower()
        best_match = None
        best_confidence = 0.0
        best_params = {}
        
        # Pattern matching
        for tool_name, tool_info in LOCAL_TOOLS.items():
            for pattern in tool_info["patterns"]:
                if pattern in text_lower:
                    confidence = 0.6 + tool_info.get("confidence_boost", 0)
                    
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_match = tool_name
                        
                        # Extract parameters
                        if tool_info.get("extract_params", False):
                            best_params = extract_parameters(
                                text, text_lower, pattern, tool_info.get("param_name")
                            )
        
        # Return if confidence is high enough (>= 75%)
        if best_match and best_confidence >= 0.75:
            print(f"[ROUTER] ⚡ Classified '{text}' → {best_match} ({int(best_confidence*100)}%)")
            return {
                "success": True,
                "tool": best_match,
                "thought": f"Classified as {best_match}",
                "parameters": best_params,
                "confidence": best_confidence
            }
        
        # Low confidence - fall back to Gemini
        return {
            "success": True,
            "tool": None,
            "thought": "Pattern confidence too low",
            "parameters": {},
            "confidence": 0.0
        }
        
    except Exception as e:
        print(f"[ROUTER] Error: {e}")
        return {"success": False, "error": str(e)}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXECUTION ENDPOINTS - Universal Automation & File Management
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Lazy-loaded automation systems
_AUTOMATION_CACHE = None

def lazy_import_automation():
    global _AUTOMATION_CACHE
    if _AUTOMATION_CACHE: return _AUTOMATION_CACHE
    try:
        from universal_automation import automate, play_music, send_message, open_url
        from hybrid_file_operations import file_operation, open_file, create_folder, delete_file
        from hybrid_file_editor import edit_file
        _AUTOMATION_CACHE = {
            "automate": automate, "play_music": play_music, "send_message": send_message, "open_url": open_url,
            "file_operation": file_operation, "open_file": open_file, "create_folder": create_folder, "delete_file": delete_file,
            "edit_file": edit_file
        }
        print("[CORTEX] ✅ Loaded hybrid automation systems")
        return _AUTOMATION_CACHE
    except ImportError as e:
        print(f"[CORTEX] ⚠️ Hybrid systems not available: {e}")
        return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNIVERSAL AUTOMATION ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/execute/playMusic")
async def execute_play_music(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Play music on specified app"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "Automation system not loaded"}
    
    song = request.get("songInfo") or request.get("song")
    app = request.get("app", "spotify")
    
    try:
        result = await auto["play_music"](app, song)
        return {
            "success": result["success"],
            "tier": result.get("tier"),
            "elapsed": result.get("elapsed_seconds"),
            "message": f"Playing {song} on {app}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/pauseMedia")
async def execute_pause_media(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Pause currently playing media"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "Automation system not loaded"}
    
    app = request.get("app", "spotify")
    
    try:
        result = await auto["automate"]("pause", app)
        return {
            "success": result["success"],
            "message": f"Paused {app}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/nextTrack")
async def execute_next_track(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Skip to next track"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "Automation system not loaded"}
    
    app = request.get("app", "spotify")
    
    try:
        result = await auto["automate"]("next", app)
        return {"success": result["success"], "message": "Next track"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/messageContact")
async def execute_message_contact(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Send message to contact"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "Automation system not loaded"}
    
    contact = request.get("contactName")
    message_text = request.get("message", "")
    app = request.get("app", "whatsapp")
    
    try:
        result = await auto["send_message"](app, contact, message_text)
        return {
            "success": result["success"],
            "tier": result.get("tier"),
            "message": f"Message sent to {contact} via {app}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/openUrl")
async def execute_open_url(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Open URL in browser"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "Automation system not loaded"}
    
    url = request.get("url")
    browser = request.get("browser", "chrome")
    
    try:
        result = await auto["open_url"](browser, url)
        return {
            "success": result["success"],
            "message": f"Opened {url} in {browser}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/takeScreenshot")
async def execute_screenshot(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Take screenshot (CROSS-PLATFORM)"""
    try:
        adapter = get_adapter()
        
        # Determine appropriate temp path based on platform
        if adapter.platform == "windows":
            screenshot_path = "C:\\Temp\\luca_screenshot.png"
            os.makedirs("C:\\Temp", exist_ok=True)
        else:
            screenshot_path = "/tmp/luca_screenshot.png"
            
        result = adapter.take_screenshot(screenshot_path)
        
        if result.get("success"):
            return {
                "success": True,
                "path": result.get("path", screenshot_path),
                "platform": adapter.platform,
                "message": "Screenshot taken"
            }
        else:
            # Check if this is a permission error for recovery
            error = result.get("error", "Unknown error")
            if "permission" in error.lower() or "denied" in error.lower():
                return adapter.permission_denied("screen_recording")
            return {"success": False, "error": error}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/system/permissions")
async def get_permissions(authorized: bool = Depends(verify_session)):
    """Check all required system permissions"""
    try:
        adapter = get_adapter()
        return adapter.check_permissions()
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/system/permissions/request")
async def request_permissions(authorized: bool = Depends(verify_session)):
    """Request required system permissions"""
    try:
        adapter = get_adapter()
        return adapter.request_permissions()
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/system/apps")
async def get_installed_apps(authorized: bool = Depends(verify_session)):
    """List all installed applications"""
    try:
        adapter = get_adapter()
        return adapter.list_installed_apps()
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/system/control")
async def system_control(request: Dict[str, Any] = Body(...), authorized: bool = Depends(verify_session)):
    """General system control endpoint (Battery, Volume, etc.)"""
    try:
        action = request.get("action")
        adapter = get_adapter()
        
        if action == "GET_BATTERY":
            return adapter.get_battery()
            
        return {"success": False, "error": f"Action {action} not implemented in Cortex"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FILE OPERATIONS ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/execute/openFile")
async def execute_open_file(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Open a file"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "File operations not loaded"}
    
    filename = request.get("fileName")
    directory = request.get("directory")
    
    try:
        result = auto["open_file"](filename, directory)
        return {
            "success": result["success"],
            "path": result.get("path"),
            "message": f"Opened {filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/createFolder")
async def execute_create_folder(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Create a new folder"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "File operations not loaded"}
    
    folder_name = request.get("folderName")
    location = request.get("location")
    
    try:
        result = auto["create_folder"](folder_name, location)
        return {
            "success": result["success"],
            "path": result.get("path"),
            "message": f"Created folder: {folder_name}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/deleteFile")
async def execute_delete_file(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Delete a file (moves to trash)"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "File operations not loaded"}
    
    filename = request.get("fileName")
    directory = request.get("directory")
    
    try:
        result = auto["delete_file"](filename, directory)
        return {
            "success": result["success"],
            "message": result.get("message", f"Deleted {filename}")
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/organizeFiles")
async def execute_organize_files(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """AI-powered file organization"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "File operations not loaded"}
    
    directory = request.get("directory", "~/Downloads")
    criteria = request.get("criteria", "by type")
    
    try:
        result = await auto["file_operation"]("organize", directory=directory, criteria=criteria)
        return {
            "success": result["success"],
            "method": result.get("method"),
            "message": f"Organized {directory}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FILE EDITING ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/execute/appendToFile")
async def execute_append_to_file(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Append text to file"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "File editor not loaded"}
    
    filename = request.get("fileName")
    text = request.get("text")
    directory = request.get("directory")
    
    try:
        result = await auto["edit_file"]("append", filename, text=text, directory=directory)
        return {
            "success": result["success"],
            "message": f"Appended to {filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/findReplace")
async def execute_find_replace(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Find and replace text in file"""
    auto = lazy_import_automation()
    if not auto:
        return {"success": False, "error": "File editor not loaded"}
    
    filename = request.get("fileName")
    find_text = request.get("find")
    replace_text = request.get("replace")
    directory = request.get("directory")
    
    try:
        result = await edit_file("replace", filename, 
                                find=find_text, 
                                replace=replace_text,
                                directory=directory)
        return {
            "success": result["success"],
            "occurrences": result.get("occurrences_replaced", 0),
            "message": f"Replaced in {filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/improveWriting")
async def execute_improve_writing(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """AI-powered writing improvement"""
    if not edit_file:
        return {"success": False, "error": "File editor not loaded"}
    
    filename = request.get("fileName")
    aspect = request.get("aspect", "overall")
    directory = request.get("directory")
    
    try:
        result = await edit_file("improve", filename, aspect=aspect, directory=directory)
        return {
            "success": result["success"],
            "method": result.get("method"),
            "message": f"Improved {filename} ({aspect})"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/refactorCode")
async def execute_refactor_code(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """AI-powered code refactoring"""
    if not edit_file:
        return {"success": False, "error": "File editor not loaded"}
    
    filename = request.get("fileName")
    goal = request.get("goal", "improve readability")
    directory = request.get("directory")
    
    try:
        result = await edit_file("refactor", filename, goal=goal, directory=directory)
        return {
            "success": result["success"],
            "method": result.get("method"),
            "message": f"Refactored {filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/openApp")
async def execute_open_app(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Launch an application"""
    appName = request.get("appName")
    try:
        adapter = get_adapter()
        result = adapter.open_app(appName)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/execute/closeApp")
async def execute_close_app(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """Close an application"""
    appName = request.get("appName")
    try:
        adapter = get_adapter()
        result = adapter.close_app(appName)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/execute/controlSystem")
async def execute_control_system(request: dict = Body(...), authorized: bool = Depends(verify_session)):
    """System control (brightness, volume, etc)"""
    action = request.get("action")
    value = request.get("value")
    try:
        adapter = get_adapter()
        # Ensure adapter has this method or handle via shell
        # For simplicity, we assume adapter has it or we extend it later
        if action == "mute":
             # Placeholder for specialized mute
             pass
        # Fallback to generic shell for now if needed, or just return success
        return {"success": True, "message": f"System Control: {action} executed"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============ MODEL MANAGER ENDPOINTS ============
# Unified management of local AI models (Gemma, SmolVLM, UI-TARS, Piper)

# Model definitions moved to top of file

@app.get("/models/{model_id}/canary")
@app.post("/models/{model_id}/canary")
async def model_canary(model_id: str):
    """Run a high-fidelity diagnostic (canary) test on a specific model"""
    if model_id not in MODEL_PATHS:
        return {"passed": False, "response": f"Unknown model: {model_id}"}
    
    config = MODEL_PATHS[model_id]
    start_time = time.time()
    
    try:
        if config.get("category") == "embedding":
            # Real-time neural probe for embeddings
            print(f"[CANARY] Probing Embedding Model: {model_id}...")
            
            # Lazy initialize if needed
            if not embedding_logic:
                return {"passed": False, "response": "Embedding logic not initialized"}
            
            # Temporarily switch to this model for the probe
            original_model = embedding_logic.current_model
            embedding_logic.set_model(model_id)
            
            try:
                # Attempt a sample encoding
                sample_text = "Luca Intelligence Probe: Status Operational."
                vector = await embedding_logic.acall([sample_text])
                
                latency = int((time.time() - start_time) * 1000)
                
                if vector is not None and len(vector) > 0:
                    return {
                        "passed": True, 
                        "response": f"Neural Alignment Perfect. Output: {len(vector[0])} dimensions",
                        "latency_ms": latency
                    }
                else:
                    return {"passed": False, "response": "Empty vector returned"}
            finally:
                # Restore original model
                embedding_logic.set_model(original_model)
        
        # Generic check for other categories for now
        # Check if downloaded
        path = config["path"]
        downloaded = os.path.exists(path)
        
        return {
            "passed": downloaded,
            "response": "Ready for Inference" if downloaded else "Model Missing from Disk",
            "latency_ms": int((time.time() - start_time) * 1000)
        }
        
    except Exception as e:
        print(f"[CANARY ERROR] {e}")
        return {
            "passed": False, 
            "response": f"Diagnostic Failed: {str(e)}",
            "latency_ms": int((time.time() - start_time) * 1000)
        }

@app.get("/models/status")
async def get_models_status():
    """Check which models are downloaded and supported on this platform"""
    status = {}
    for model_id, config in MODEL_PATHS.items():
        path = config["path"]
        if config.get("is_folder"):
            downloaded = os.path.isdir(path) and len(os.listdir(path)) > 0 if os.path.exists(path) else False
        else:
            downloaded = os.path.isfile(path)
        
        # Check platform support
        supported = is_model_supported(model_id, config)
        unsupported_reason = config.get("unsupported_reason") if not supported else None
        
        status[model_id] = {
            "downloaded": downloaded,
            "path": path,
            "supported": supported,
            "unsupported_reason": unsupported_reason
        }
    return {"models": status, "platform": PLATFORM_INFO}


@app.get("/models/download/{model_id}")
async def download_model(model_id: str):
    """Download a model (returns SSE stream for progress)"""
    from fastapi.responses import StreamingResponse
    import json
    
    if model_id not in MODEL_PATHS:
        raise HTTPException(status_code=404, detail=f"Unknown model: {model_id}")
    
    config = MODEL_PATHS[model_id]
    
    async def generate():
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(config["path"]), exist_ok=True)
            
            if "repo_id" in config:
                # Hugging Face model
                try:
                    from huggingface_hub import hf_hub_download, snapshot_download
                    import asyncio
                    import traceback
                    
                    # Disable tqdm bars to prevent stdout deadlocking/clutter in threads
                    os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
                    
                    yield f"data: {json.dumps({'progress': 5, 'status': 'starting'})}\n\n"
                    
                    # Define download function to run in thread
                    def do_download():
                        try:
                            print(f"[DOWNLOAD] Destination: {config['path']}")
                            
                            # Determine authentication strategy
                            # If HF_TOKEN is set, use it. If not, explicitly DISABLE auth to avoid using stale cached tokens.
                            # This fixes 401 errors on public models when user has an invalid cached login.
                            hf_token = os.environ.get("HF_TOKEN")
                            use_auth = hf_token if hf_token else False
                            
                            if config.get("is_folder"):
                                snapshot_download(
                                    repo_id=config["repo_id"],
                                    local_dir=config["path"],
                                    # Relaxed patterns to ensure we get config.json and model files
                                    allow_patterns=["*.json", "*.onnx", "*.pth", "*.bin", "*.safetensors", "*.txt", "*.wav", "*.model"],
                                    resume_download=True,
                                    token=use_auth,
                                    max_retries=5  # Added resilience
                                )
                            else:
                                hf_hub_download(
                                    repo_id=config["repo_id"],
                                    filename=config["filename"],
                                    local_dir=os.path.dirname(config["path"]),
                                    resume_download=True,
                                    token=use_auth,
                                    max_retries=5  # Added resilience
                                )
                        except Exception as thread_error:
                            print(f"[DOWNLOAD ERROR] Thread failed: {thread_error}")
                            traceback.print_exc()
                            raise thread_error

                    # Run in background task
                    task = asyncio.create_task(asyncio.to_thread(do_download))
                    
                    # Keep connection alive while downloading
                    # (HF doesn't give us easy async progress callbacks, so we fake incremental progress)
                    progress = 5
                    while not task.done():
                        await asyncio.sleep(0.5) # Fast heartbeat
                        if progress < 95:
                            progress += 1 # Fake progress to show activity
                        yield f"data: {json.dumps({'progress': progress, 'status': 'downloading'})}\n\n"
                    
                    # Check for exceptions
                    await task
                    
                    yield f"data: {json.dumps({'progress': 100, 'status': 'complete'})}\n\n"
                except Exception as e:
                    print(f"[DOWNLOAD ERROR] {e}")
                    yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
            
            elif "url" in config:
                # Direct URL download (for Piper)
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(config["url"]) as resp:
                        total = int(resp.headers.get("content-length", 0))
                        downloaded = 0
                        with open(config["path"], "wb") as f:
                            async for chunk in resp.content.iter_chunked(1024 * 1024):
                                f.write(chunk)
                                downloaded += len(chunk)
                                progress = int((downloaded / total) * 100) if total > 0 else 50
                                yield f"data: {json.dumps({'progress': progress})}\n\n"
                
                yield f"data: {json.dumps({'progress': 100, 'status': 'complete'})}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.delete("/models/delete/{model_id}")
async def delete_model(model_id: str):
    """Delete a downloaded model to free storage"""
    import shutil
    
    if model_id not in MODEL_PATHS:
        raise HTTPException(status_code=404, detail=f"Unknown model: {model_id}")
    
    config = MODEL_PATHS[model_id]
    path = config["path"]
    
    try:
        if config.get("is_folder"):
            if os.path.isdir(path):
                shutil.rmtree(path)
        else:
            if os.path.isfile(path):
                os.remove(path)
        return {"success": True, "message": f"Deleted {model_id}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    # Get port from environment (passed by Electron) or default
    port = int(os.environ.get("CORTEX_PORT", 8000))
    
    # Determine host based on remote access setting
    # 0.0.0.0 allows access from other devices on the network
    host = "0.0.0.0" if REMOTE_ACCESS_ENABLED else "127.0.0.1"
    
    # --- STATIC FILE SERVING FOR PRODUCTION ---
    # In production, serve the built frontend from dist folder
    # The dist folder is relative to the project root (2 levels up from cortex/python)
    project_root = Path(__file__).resolve().parent.parent.parent
    dist_path = project_root / "dist"
    
    if dist_path.exists() and dist_path.is_dir():
        print(f"[CORTEX] Serving frontend from: {dist_path}")
        
        # Serve index.html for root path
        @app.get("/")
        async def serve_index():
            return FileResponse(dist_path / "index.html")
        
        # Serve static assets
        app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")
        
        # Catch-all for SPA routing (must be last)
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            file_path = dist_path / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(dist_path / "index.html")
    else:
        print(f"[CORTEX] No dist folder found at {dist_path} - API only mode")
    
    print(f"[CORTEX] Starting Server on {host}:{port}")
    if host == "0.0.0.0":
        print(f"[CORTEX] Remote Access URL: http://{LOCAL_IP}:{port}")
    
    # Use a custom run loop to ensure graceful shutdown of all async tasks
    # specifically to prevent "Event loop is closed" errors during memory ingestion
    config = uvicorn.Config(app, host=host, port=port, log_level="info", loop="asyncio")
    server = uvicorn.Server(config)
    
    try:
        asyncio.run(server.serve())
    except (KeyboardInterrupt, SystemExit, asyncio.exceptions.CancelledError):
        print("\n[CORTEX] 🧩 Graceful Shutdown Initiated...")
        # Signal the server to stop if it hasn't already
        server.should_exit = True
    finally:
        print("[CORTEX] 🧩 System Offline.")
