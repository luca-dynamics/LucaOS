import os
import io
import base64
import torch
from threading import Lock
from PIL import Image
from transformers import AutoModel, AutoTokenizer, AutoProcessor

class UITarsAgent:
    def __init__(self, model_name="ByteDance-Seed/UI-TARS-2B-SFT"):
        """
        Initialize the UI-TARS Agent.
        This won't load the model immediately to save startup time.
        Call load_model() to load into VRAM.
        """
        self.model_name = model_name
        self.points_per_token = 1000 # Standard for UI-TARS
        self.model = None
        self.tokenizer = None
        self.lock = Lock()
        self.last_used = 0 
        self.device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
        
        # Start Idle Monitoring Thread
        import threading
        import time
        self.monitor_thread = threading.Thread(target=self._idle_monitor, daemon=True)
        self.monitor_thread.start()
        
        # Determine model cache directory (Production-Ready Logic)
        # 1. Check if the application is "frozen" (running as a standalone .exe or .app bundle)
        # 2. Check for explicit environment variable override
        import sys
        is_frozen = getattr(sys, 'frozen', False)
        mode_env = os.environ.get("LUCA_MODE", "").lower()
        
        mode = "production" if (is_frozen or mode_env == "production") else "development"
        
        # Always use ~/Luca/models — keeps repo clean and consistent across dev/prod
        home_dir = os.path.expanduser("~")
        self.cache_dir = os.path.join(home_dir, "Luca", "models")
        
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Set HF_HOME environment variable to redirect all HF downloads to our selected folder
        os.environ["HF_HOME"] = self.cache_dir
        
        print(f"[UI-TARS] Initialized Agent (Device: {self.device}, Mode: {mode}, Frozen: {is_frozen})")
        print(f"[UI-TARS] Local Model Cache: {self.cache_dir}")

    def load_model(self):
        """
        Load the model and processor into memory.
        """
        if self.model is not None:
            return

        with self.lock:
            if self.model is not None: return
            
            print(f"[UI-TARS] Loading model: {self.model_name}...")
            try:
                # Load Processor with extra robustness
                from transformers import AutoProcessor
                try:
                    self.processor = AutoProcessor.from_pretrained(
                        self.model_name, 
                        trust_remote_code=True,
                        cache_dir=self.cache_dir
                    )
                except Exception as e:
                     print(f"[UI-TARS] Standard processor load failed, trying reduced config: {e}")
                     raise e
                        
                # Patch for "shortest_edge" error in some transformers versions
                if hasattr(self.processor, "image_processor"):
                    if not hasattr(self.processor.image_processor, "size"):
                        self.processor.image_processor.size = {}
                    
                    if isinstance(self.processor.image_processor.size, dict):
                         self.processor.image_processor.size["shortest_edge"] = 384 
                         self.processor.image_processor.size["longest_edge"] = 384
                    elif self.processor.image_processor.size is None:
                         self.processor.image_processor.size = {"shortest_edge": 384, "longest_edge": 384}

                # Load Model
                self.model = AutoModel.from_pretrained(
                    self.model_name, 
                    trust_remote_code=True,
                    torch_dtype=torch.float16 if self.device != "cpu" else torch.float32,
                    device_map="auto" if self.device == "cuda" else None,
                    cache_dir=self.cache_dir
                )
                if self.device == "mps":
                    self.model.to("mps")
                
                self.tokenizer = AutoTokenizer.from_pretrained(
                    self.model_name, 
                    trust_remote_code=True, 
                    padding_side='left',
                    cache_dir=self.cache_dir
                )
                
                print("[UI-TARS] Model and Processor Loaded Successfully from local cache")
            except Exception as e:
                print(f"[UI-TARS] CRITICAL LOAD ERROR: {e}")
                raise e

    def is_downloaded(self):
        """Check if model files exist on disk accurately."""
        # Check for the existence of the model directory inside the cache folder
        # HF Hub structure: models--ByteDance-Seed--UI-TARS-2B-SFT
        folder_name = f"models--{self.model_name.replace('/', '--')}"
        model_path = os.path.join(self.cache_dir, folder_name)
        if not os.path.exists(model_path):
            # Also check for a flat structure just in case
            flat_path = os.path.join(self.cache_dir, self.model_name.split('/')[-1])
            return os.path.exists(flat_path)
        
        # Check if it has any actual weight files
        for root, dirs, files in os.walk(model_path):
            if any(f.endswith(".safetensors") or f.endswith(".bin") for f in files):
                return True
        return False

    def process_screenshot(self, screenshot_base64, instruction, model_name=None):
        """
        Process a screenshot and return the coordinate/action.
        """
        # Dynamic Model Switching
        if model_name:
             # Handle "ui-tars" alias mapping to real HF path if needed, or rely on frontend to send full path
             # For now, assume model_name is the HF ID or "ui-tars" which maps to default
             if model_name == "ui-tars":
                 model_name = "ByteDance-Seed/UI-TARS-2B-SFT"
             
             if model_name != self.model_name:
                print(f"[UI-TARS] Switching model from {self.model_name} to {model_name}")
                with self.lock:
                    self.model_name = model_name
                    self.model = None
                    self.processor = None
                    self.tokenizer = None
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    elif torch.backends.mps.is_available():
                         torch.mps.empty_cache()

        if self.model is None:
            self.load_model()
        
        self.last_used = time.time()
            
        try:
            # 1. Decode Image
            if "," in screenshot_base64:
                screenshot_base64 = screenshot_base64.split(",")[1]
            image_data = base64.b64decode(screenshot_base64)
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            
            # 2. Construct Messages (UI-TARS standard)
            # Using the format expected by the model's processor
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image"},
                        {"type": "text", "text": instruction}
                    ]
                }
            ]
            
            # 3. Process Inputs
            prompt = self.processor.apply_chat_template(messages, add_generation_prompt=True)
            inputs = self.processor(text=prompt, images=image, return_tensors="pt").to(self.device)
            if self.device != "cpu":
                inputs = {k: v.to(torch.float16) if v.dtype == torch.float32 else v for k, v in inputs.items()}

            # 4. Generate
            print("[UI-TARS] Internal Generation Started...")
            with torch.no_grad():
                output_ids = self.model.generate(
                    **inputs,
                    max_new_tokens=128,
                    do_sample=False
                )
            
            # 5. Decode
            # Only decode the new tokens
            generated_ids = output_ids[0][inputs['input_ids'].shape[1]:]
            response = self.processor.decode(generated_ids, skip_special_tokens=True)
            
            print(f"[UI-TARS] Prediction: {response}")
            return response

        except Exception as e:
            print(f"[UI-TARS] Inference Error: {e}")
            return f"Error: {str(e)}"

    def process_and_execute(self, screenshot_base64, target_element, screen_width=1920, screen_height=1080):
        """
        Agentic loop: Analyze screenshot, locate element, and execute click.
        Returns result dict with success status and coordinates.
        """
        try:
            # Import the official UI-TARS parser
            from ui_tars.action_parser import parse_action_to_structure_output
            import pyautogui
            
            # Construct COMPUTER_USE prompt for clicking
            instruction = f"Click on the {target_element}"
            
            # Get the raw prediction from UI-TARS
            raw_response = self.process_screenshot(screenshot_base64, instruction)
            
            if "Error" in raw_response:
                return {"success": False, "error": raw_response}
            
            print(f"[UI-TARS] Raw response: {raw_response}")
            
            # Parse the response using official parser
            # UI-TARS uses factor=1000 for coordinate normalization
            try:
                parsed = parse_action_to_structure_output(
                    raw_response,
                    factor=1000,
                    origin_resized_height=screen_height,
                    origin_resized_width=screen_width,
                    model_type="qwen25vl"
                )
                print(f"[UI-TARS] Parsed action: {parsed}")
            except Exception as parse_err:
                # Fallback: Try to extract coordinates from response directly
                # UI-TARS sometimes returns: "click(start_box='(500,300)')"
                import re
                coord_match = re.search(r"\((\d+),\s*(\d+)\)", raw_response)
                if coord_match:
                    x_rel = int(coord_match.group(1))
                    y_rel = int(coord_match.group(2))
                    # Convert from 1000-based to actual pixels
                    x = int((x_rel / 1000) * screen_width)
                    y = int((y_rel / 1000) * screen_height)
                    parsed = {"action_type": "click", "x": x, "y": y}
                else:
                    return {"success": False, "error": f"Could not parse coordinates: {parse_err}"}
            
            # Extract coordinates from parsed result
            if isinstance(parsed, dict):
                x = parsed.get("x") or parsed.get("start_x")
                y = parsed.get("y") or parsed.get("start_y")
                action_type = parsed.get("action_type", "click")
            elif isinstance(parsed, list) and len(parsed) > 0:
                action = parsed[0]
                x = action.get("x") or action.get("start_x")
                y = action.get("y") or action.get("start_y")
                action_type = action.get("action_type", "click")
            else:
                return {"success": False, "error": f"Unexpected parsed format: {type(parsed)}"}
            
            if x is None or y is None:
                return {"success": False, "error": f"No coordinates found in parsed response: {parsed}"}
            
            print(f"[UI-TARS] Executing {action_type} at ({x}, {y})")
            
            # Execute the click using pyautogui
            pyautogui.FAILSAFE = True
            pyautogui.click(x, y)
            
            return {
                "success": True,
                "action": action_type,
                "x": x,
                "y": y,
                "raw_response": raw_response
            }
            
        except Exception as e:
            print(f"[UI-TARS] Execute Error: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    def _idle_monitor(self):
        """Background thread to unload model and log memory."""
        import time
        import psutil
        
        last_log = 0
        unload_timeout = 600 # 10 minutes
        
        while True:
            try:
                now = time.time()
                
                # 1. Periodic Memory Logging
                if now - last_log > 300: # Every 5 mins
                    process = psutil.Process(os.getpid())
                    mem_mb = process.memory_info().rss / 1024 / 1024
                    log_dir = os.path.expanduser("~/.luca/logs")
                    os.makedirs(log_dir, exist_ok=True)
                    with open(os.path.join(log_dir, "cortex_memory.log"), "a") as f:
                        f.write(f"[{time.ctime()}] Cortex RSS: {mem_mb:.2f}MB, Model: {'LOADED' if self.model else 'IDLE'}\n")
                    last_log = now

                # 2. Auto-Unload Model
                if self.model is not None and (now - self.last_used > unload_timeout):
                    print(f"[UI-TARS] Idle for {unload_timeout}s. Unloading model to free RAM...")
                    with self.lock:
                        self.model = None
                        self.processor = None
                        self.tokenizer = None
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    elif torch.backends.mps.is_available():
                        torch.mps.empty_cache()
                    import gc
                    gc.collect()
                    print("[UI-TARS] Unload complete.")

            except Exception as e:
                print(f"[UI-TARS] Monitor Error: {e}")
            
            time.sleep(30) # Check every 30s

# Singleton
ui_tars = UITarsAgent()

