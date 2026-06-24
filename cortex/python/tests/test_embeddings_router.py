"""Behaviour tests for the extracted embeddings router (Phase 2)."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import state
import routers.embeddings as emb


class FakeEmbeddingLogic:
    def __init__(self):
        self.current_model = "gemini"
        self._embedding_dim = 768
    def set_model(self, m):
        self.current_model = m


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(state, "embedding_logic", FakeEmbeddingLogic())
    monkeypatch.setattr(state, "MODEL_PATHS", {"bge-local": {"category": "embedding"}})
    monkeypatch.setattr(state, "normalize_local_model_id", lambda m: m)
    # Default: embedding system not ready, get_rag is a no-op.
    monkeypatch.setattr(state, "get_rag_embedding_func", lambda: None)
    async def _noop():
        return None
    monkeypatch.setattr(state, "get_rag", _noop)
    app = FastAPI()
    app.include_router(emb.router)
    return TestClient(app)


def test_get_embedding_model(client):
    body = client.get("/settings/embedding").json()
    assert body == {"model": "gemini", "dimension": 768, "available": True}


def test_set_embedding_model_valid(client):
    body = client.post("/settings/embedding", json={"model": "gemini-2.0-flash"}).json()
    assert body["status"] == "success" and body["model"] == "gemini-2.0-flash"


def test_set_embedding_model_local_from_model_paths(client):
    body = client.post("/settings/embedding", json={"model": "bge-local"}).json()
    assert body["status"] == "success" and body["model"] == "bge-local"


def test_set_embedding_model_invalid_400(client):
    assert client.post("/settings/embedding", json={"model": "not-a-model"}).status_code == 400


def test_embed_503_when_embedding_unavailable(client):
    # get_rag_embedding_func() stays falsy => 503
    assert client.post("/embed", json={"texts": ["hi"]}).status_code == 503


def test_embed_succeeds_when_ready(client, monkeypatch):
    monkeypatch.setattr(state, "get_rag_embedding_func", lambda: object())

    class Vec:
        shape = (1, 3)
        def tolist(self):
            return [[0.1, 0.2, 0.3]]

    async def fake_acall(texts):
        return Vec()

    state.embedding_logic.acall = fake_acall
    body = client.post("/embed", json={"texts": ["hi"]}).json()
    assert body["dimension"] == 3 and body["model"] == "gemini"
