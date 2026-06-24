"""Embedding endpoints (Phase 2 extraction from cortex.py).

Raw embedding generation and active embedding-model configuration. Reads shared
RAG/embedding handles from the `state` module (published by cortex.py at boot):
get_rag, get_rag_embedding_func, embedding_logic, MODEL_PATHS,
normalize_local_model_id. No import back into cortex.py.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import state

router = APIRouter()


class EmbedRequest(BaseModel):
    texts: list[str]
    model: Optional[str] = None  # If provided, use this model for this request


class EmbedSettingsRequest(BaseModel):
    model: str  # The embedding model ID to use


@router.post("/embed")
async def embed_texts(request: EmbedRequest):
    """Generate embeddings for texts using current or specified model."""
    if not state.get_rag_embedding_func():
        try:
            await state.get_rag()
        except Exception as e:
            print(f"[CORTEX] Failed to auto-initialize RAG for embedding: {e}")

    if not state.get_rag_embedding_func():
        raise HTTPException(status_code=503, detail="Embedding system not available")

    embedding_logic = state.embedding_logic
    # Temporarily switch model if specified
    original_model = embedding_logic.current_model
    request_model = state.normalize_local_model_id(request.model)
    if request_model:
        embedding_logic.set_model(request_model)

    try:
        embeddings = await embedding_logic.acall(request.texts)
        return {
            "embeddings": embeddings.tolist(),
            "model": embedding_logic.current_model,
            "dimension": embeddings.shape[1] if len(embeddings.shape) > 1 else len(embeddings)
        }
    finally:
        # Restore original model if we switched
        if request_model:
            embedding_logic.set_model(original_model)


@router.post("/settings/embedding")
async def set_embedding_model(request: EmbedSettingsRequest):
    """Set the active embedding model for memory operations."""
    # Logic is managed by HybridEmbeddingLogic, so we don't need RAG initialized yet
    embedding_logic = state.embedding_logic

    # Validate model ID
    valid_models = ["gemini", "gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.0-flash"]
    embedding_models = [k for k, v in state.MODEL_PATHS.items() if v.get("category") == "embedding"]
    valid_models.extend(embedding_models)

    normalized_model = state.normalize_local_model_id(request.model)
    if normalized_model not in valid_models:
        raise HTTPException(status_code=400, detail=f"Invalid model: {request.model}. Valid: {valid_models}")

    embedding_logic.set_model(normalized_model)
    return {
        "status": "success",
        "model": normalized_model,
        "dimension": embedding_logic._embedding_dim
    }


@router.get("/settings/embedding")
async def get_embedding_model():
    """Get the current active embedding model."""
    embedding_logic = state.embedding_logic
    # Always available via logic class
    return {
        "model": embedding_logic.current_model,
        "dimension": embedding_logic._embedding_dim,
        "available": True
    }
