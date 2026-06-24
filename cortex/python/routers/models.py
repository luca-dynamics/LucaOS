"""Model-manager endpoints (Phase 2 extraction from cortex.py).

Unified management of local AI models (Gemma, SmolVLM, UI-TARS, Piper):
canary diagnostics, status, download (SSE), delete.

Shared state is read from the `state` module (populated by cortex.py at boot):
MODEL_PATHS, PLATFORM_INFO, is_model_supported, embedding_logic. This keeps the
router free of any import back into cortex.py (no circular import).
"""
import os
import time
import shutil
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

import state

router = APIRouter(tags=["models"])


@router.get("/models/{model_id}/canary")
@router.post("/models/{model_id}/canary")
async def model_canary(model_id: str):
    """Run a high-fidelity diagnostic (canary) test on a specific model"""
    if model_id not in state.MODEL_PATHS:
        return {"passed": False, "response": f"Unknown model: {model_id}"}

    config = state.MODEL_PATHS[model_id]
    start_time = time.time()

    try:
        if config.get("category") == "embedding":
            # Real-time neural probe for embeddings
            print(f"[CANARY] Probing Embedding Model: {model_id}...")

            embedding_logic = state.embedding_logic
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


@router.get("/models/status")
async def get_models_status():
    """Check which models are downloaded and supported on this platform"""
    status = {}
    for model_id, config in state.MODEL_PATHS.items():
        path = config["path"]
        if config.get("is_folder"):
            downloaded = os.path.isdir(path) and len(os.listdir(path)) > 0 if os.path.exists(path) else False
        else:
            downloaded = os.path.isfile(path)

        # Check platform support
        supported = state.is_model_supported(model_id, config) if state.is_model_supported else True
        unsupported_reason = config.get("unsupported_reason") if not supported else None

        status[model_id] = {
            "downloaded": downloaded,
            "path": path,
            "supported": supported,
            "unsupported_reason": unsupported_reason
        }
    return {"models": status, "platform": state.PLATFORM_INFO}


@router.get("/models/download/{model_id}")
async def download_model(model_id: str):
    """Download a model (returns SSE stream for progress)"""
    if model_id not in state.MODEL_PATHS:
        raise HTTPException(status_code=404, detail=f"Unknown model: {model_id}")

    config = state.MODEL_PATHS[model_id]

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


@router.delete("/models/delete/{model_id}")
async def delete_model(model_id: str):
    """Delete a downloaded model to free storage"""
    if model_id not in state.MODEL_PATHS:
        raise HTTPException(status_code=404, detail=f"Unknown model: {model_id}")

    config = state.MODEL_PATHS[model_id]
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
