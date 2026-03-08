import os
import sys
import platform

# Fix for OpenMP conflict and Intel Mac stability
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# CRITICAL: Force CPU-only for Intel Macs BEFORE any other imports to prevent slow Metal init
if platform.system() == 'Darwin' and platform.machine() == 'x86_64':
    os.environ["LLAMA_NO_METAL"] = "1"
    os.environ["LLAMA_METAL"] = "0"
    os.environ["GGML_METAL_PATH_RESOURCES"] = ""

import json
import socket
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import state
import multiprocessing

# Global check for llama-cpp-python availability
LLAMA_CPP_AVAILABLE = None 

def check_llama_cpp():
    """Checks if llama-cpp-python is installed without triggering GPU init."""
    global LLAMA_CPP_AVAILABLE
    if LLAMA_CPP_AVAILABLE is not None:
        return LLAMA_CPP_AVAILABLE
    
    try:
        import platform
        # Fix for Intel Macs crashing with Metal backend enabled
        if platform.system() == 'Darwin' and platform.machine() == 'x86_64':
             os.environ["LLAMA_NO_METAL"] = "1"
             os.environ["LLAMA_METAL"] = "0"
             os.environ["GGML_METAL_PATH_RESOURCES"] = "" 
        
        # We check for existence without importing the heavy Llama class yet if possible,
        # but usually, we just check if the module can be found.
        import importlib.util
        spec = importlib.util.find_spec("llama_cpp")
        LLAMA_CPP_AVAILABLE = spec is not None
    except Exception:
        LLAMA_CPP_AVAILABLE = False
    
    return LLAMA_CPP_AVAILABLE

class LocalLLMAgent:
    _llama_class = None
    _llama_grammar_class = None

    @classmethod
    def _ensure_llama_cpp(cls):
        """Truly lazy import of llama-cpp-python to prevent early GPU initialization."""
        if cls._llama_class is not None:
            return cls._llama_class, cls._llama_grammar_class
            
        print("[LOCAL-LLM-DEBUG] Lazy-loading llama-cpp-python library...", flush=True)
        try:
            from llama_cpp import Llama, LlamaGrammar
            cls._llama_class = Llama
            cls._llama_grammar_class = LlamaGrammar
            print("[LOCAL-LLM-DEBUG] Library loaded successfully.", flush=True)
            return cls._llama_class, cls._llama_grammar_class
        except ImportError as e:
            print(f"[LOCAL-LLM] Failed to load llama-cpp-python: {e}")
            raise e

    def __init__(self, model_id: str = "gemma-2b"):
        """
        Initialize the Local LLM Agent for offline chat and tool use.
        Defaults to gemma-2b, but can be switched to any model in MODEL_PATHS.
        """
        self.model = None
        self.current_model_id = model_id
        self.n_ctx = 8192
        
        # Stability: Disable GPU on Intel Macs or if forced via env
        import platform
        self.system = platform.system()
        self.machine = platform.machine()
        
        self.is_intel_mac = (self.system == 'Darwin' and self.machine == 'x86_64')
        
        # Default to GPU (-1) unless on Intel Mac
        self.n_gpu_layers = 0 if self.is_intel_mac else -1
        if os.environ.get("FORCE_CPU_ONLY") == "1":
            self.n_gpu_layers = 0

        print(f"[LOCAL-LLM] Agent initialized (Default: {model_id})")

    def get_model_config(self, model_id: str):
        """Get config for a model from state.MODEL_PATHS."""
        # 1. Check dynamic state first
        if state.MODEL_PATHS and model_id in state.MODEL_PATHS:
            return state.MODEL_PATHS[model_id]

        # 2. Hardcoded Fallbacks (if not in state)
        if model_id == "gemma-2b":
            return {
                "path": os.path.join(state.get_models_dir() if hasattr(state, 'get_models_dir') else os.path.expanduser("~/Luca/models"), "llm", "gemma-2-2b-it-Q6_K.gguf"),
                "repo_id": "bartowski/gemma-2-2b-it-GGUF",
                "filename": "gemma-2-2b-it-Q6_K.gguf"
            }
        
        if model_id == "llama-3.2-1b":
            return {
                "path": os.path.join(state.get_models_dir() if hasattr(state, 'get_models_dir') else os.path.expanduser("~/Luca/models"), "llm", "Llama-3.2-1B-Instruct-Q6_K.gguf"),
                "repo_id": "bartowski/Llama-3.2-1B-Instruct-GGUF",
                "filename": "Llama-3.2-1B-Instruct-Q6_K.gguf"
            }
            
        return None

    def download_model(self, model_id: str):
        """Downloads the model if not present using hf_hub_download."""
        config = self.get_model_config(model_id)
        if not config:
            raise ValueError(f"Model {model_id} not found in configuration.")
            
        model_path = config["path"]
        if os.path.exists(model_path):
            return model_path

        print(f"[LOCAL-LLM] Downloading {model_id}...")
        try:
            from huggingface_hub import hf_hub_download
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            
            # Determine authentication strategy
            hf_token = os.environ.get("HF_TOKEN")
            use_auth = hf_token if hf_token else False

            hf_hub_download(
                repo_id=config["repo_id"],
                filename=config["filename"],
                local_dir=os.path.dirname(model_path),
                local_dir_use_symlinks=False,
                token=use_auth
            )
            print(f"[LOCAL-LLM] Download Complete: {model_path}")
            return model_path
        except Exception as e:
            print(f"[LOCAL-LLM] Download Failed for {model_id}: {e}")
            raise e

    def load_model(self, model_id: str = None):
        """Lazy loads the model into RAM/VRAM."""
        target_model_id = model_id or self.current_model_id
        
        # If already loaded and it's the right model, just return
        if self.model is not None and target_model_id == self.current_model_id:
            return

        if not check_llama_cpp():
            raise ImportError("llama-cpp-python is not installed.")

        LlamaClass, _ = self._ensure_llama_cpp()

        # If switching models, clear old one first
        if self.model is not None:
            print(f"[LOCAL-LLM] Unloading {self.current_model_id} to load {target_model_id}...")
            del self.model
            self.model = None

        model_path = self.download_model(target_model_id)
        
        # Pull metadata from config (n_ctx, etc.)
        config = self.get_model_config(target_model_id) or {}
        n_ctx = config.get("n_ctx", 8192)

        # Intel Mac Limitation: Max RAM is often tighter (8GB/16GB shared), 
        # and non-Metal CPU offload overhead is higher. Limit context to safe default.
        env_limit = int(os.environ.get("LOCAL_LLM_CONTEXT_SIZE", 2048))
        if self.is_intel_mac and n_ctx > env_limit:
            print(f"[LOCAL-LLM] Capping context to {env_limit} for Intel Mac stability (requested {n_ctx})")
            n_ctx = env_limit

        # Explicitly set threads for Intel Mac to prevent over-saturation
        if self.is_intel_mac:
             self.n_threads = min(4, max(1, multiprocessing.cpu_count() // 2))
        else:
             self.n_threads = max(1, multiprocessing.cpu_count() - 2)

        print(f"[LOCAL-LLM] Loading {target_model_id} into Memory (CPU Threads: {self.n_threads})...", flush=True)
        try:
            print(f"[LOCAL-LLM] Calling Llama constructor for {model_path}...", flush=True)
            self.model = LlamaClass(
                model_path=model_path,
                n_ctx=n_ctx,
                n_gpu_layers=0 if self.is_intel_mac else self.n_gpu_layers,
                n_threads=self.n_threads,
                verbose=True # Enable for debugging hangs
            )
            self.current_model_id = target_model_id
            print(f"[LOCAL-LLM] {target_model_id} Loaded Successfully.", flush=True)
        except Exception as e:
            print(f"[LOCAL-LLM] Load Error for {target_model_id}: {e}")
            raise e

    def generate_chat(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None, model_id: str = None, stream: bool = False) -> Any:
        """
        Generates a chat response.
        If tools are provided, it attempts to enforce a JSON structure for tool calling.
        """
        target_model_id = model_id or self.current_model_id
        self.load_model(target_model_id)
            
        # 1. Simple Chat Completion if no tools
        if not tools:
            response = self.model.create_chat_completion(
                messages=messages,
                max_tokens=512,
                temperature=0.7,
                stream=stream
            )
            return response

        # 2. Tool Calling Mode (Structured Output)
        system_msg = next((m for m in messages if m["role"] == "system"), None)
        user_msgs = [m for m in messages if m["role"] != "system"]
        
        tool_desc = json.dumps(tools, indent=2)
        
        tool_system_prompt = (
            f"{system_msg['content'] if system_msg else 'You are a helpful assistant.'}\n\n"
            f"You have access to the following tools:\n{tool_desc}\n\n"
            "To use a tool, you MUST respond with purely JSON in this format:\n"
            "{\n  \"tool\": \"tool_name\",\n  \"arguments\": { ... }\n}\n"
            "If no tool is needed, respond normally."
        )
        
        messages_with_tools = [{"role": "system", "content": tool_system_prompt}] + user_msgs
        
        response = self.model.create_chat_completion(
            messages=messages_with_tools,
            max_tokens=512,
            temperature=0.2,
            response_format={
                "type": "json_object"
            },
            stream=stream
        )
        
        return response

# No global singleton by default to ensure lazy loading.
# Use cortex.py's get_local_brain() instead.
