"""Behaviour tests for the extracted execute/system router (Phase 2)."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.deps as deps
import routers.execute as execute


@pytest.fixture
def client(monkeypatch):
    # No PIN set => verify_session passes for any caller (TestClient is non-loopback).
    monkeypatch.setattr(deps, "get_stored_pin", lambda: None)
    app = FastAPI()
    app.include_router(execute.router)
    return TestClient(app)


def test_routes_are_mounted(client):
    # 21 routes were moved; spot-check a representative path exists (not 404).
    assert client.post("/api/execute/playMusic", json={}).status_code != 404


def test_play_music_graceful_when_automation_unavailable(client, monkeypatch):
    monkeypatch.setattr(execute, "lazy_import_automation", lambda: None)
    body = client.post("/api/execute/playMusic", json={"song": "x"}).json()
    assert body["success"] is False
    assert "Automation system not loaded" in body["error"]


def test_play_music_invokes_backend(client, monkeypatch):
    async def fake_play(app, song):
        return {"success": True, "tier": "native", "elapsed_seconds": 0.1}

    monkeypatch.setattr(execute, "lazy_import_automation", lambda: {"play_music": fake_play})
    body = client.post(
        "/api/execute/playMusic", json={"song": "Test Song", "app": "spotify"}
    ).json()
    assert body["success"] is True
    assert body["tier"] == "native"


def test_system_permissions_uses_adapter(client, monkeypatch):
    class FakeAdapter:
        platform = "windows"
        def check_permissions(self):
            return {"screen_recording": "granted"}

    monkeypatch.setattr(execute, "get_adapter", lambda: FakeAdapter())
    r = client.get("/api/system/permissions")
    assert r.status_code == 200
    assert r.json() == {"screen_recording": "granted"}


def test_session_gate_blocks_remote_without_pin_when_pin_set(client, monkeypatch):
    # With a PIN set and a non-loopback caller lacking a token -> 401.
    monkeypatch.setattr(deps, "get_stored_pin", lambda: "1234")
    r = client.post("/api/execute/playMusic", json={})
    assert r.status_code == 401
