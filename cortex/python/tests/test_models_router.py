"""Behaviour tests for the extracted models router (Phase 2)."""
import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import state
import routers.models as models


@pytest.fixture
def client(monkeypatch, tmp_path):
    # Two fake models: one present on disk, one missing.
    present = tmp_path / "present.bin"
    present.write_text("x", encoding="utf-8")
    missing = tmp_path / "missing.bin"

    monkeypatch.setattr(state, "MODEL_PATHS", {
        "present-model": {"path": str(present), "category": "llm"},
        "missing-model": {"path": str(missing), "category": "llm"},
    })
    monkeypatch.setattr(state, "PLATFORM_INFO", {"is_windows": True})
    monkeypatch.setattr(state, "is_model_supported", lambda mid, cfg: True)
    monkeypatch.setattr(state, "embedding_logic", None)

    app = FastAPI()
    app.include_router(models.router)
    return TestClient(app)


def test_status_reports_downloaded(client):
    body = client.get("/models/status").json()
    assert body["models"]["present-model"]["downloaded"] is True
    assert body["models"]["missing-model"]["downloaded"] is False
    assert body["platform"] == {"is_windows": True}


def test_canary_unknown_model(client):
    body = client.get("/models/unknown/canary").json()
    assert body["passed"] is False
    assert "Unknown model" in body["response"]


def test_canary_generic_present_vs_missing(client):
    assert client.get("/models/present-model/canary").json()["passed"] is True
    assert client.get("/models/missing-model/canary").json()["passed"] is False


def test_delete_unknown_model_404(client):
    assert client.delete("/models/delete/unknown").status_code == 404


def test_delete_present_model(client):
    body = client.delete("/models/delete/present-model").json()
    assert body["success"] is True
    # File should be gone now
    assert client.get("/models/status").json()["models"]["present-model"]["downloaded"] is False
