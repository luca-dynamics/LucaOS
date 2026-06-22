"""Behaviour tests for the extracted remote-access PIN router (Phase 2).

Locks the behaviour that was previously inline in cortex.py so future
decomposition can't silently regress it."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.remote_access as ra


@pytest.fixture
def client(monkeypatch, tmp_path):
    # Isolate the PIN file to a temp location and reset session state.
    pin_file = tmp_path / ".remote_access_pin"
    monkeypatch.setattr(ra, "get_pin_file_path", lambda: pin_file)
    ra.validated_sessions.clear()

    app = FastAPI()
    app.include_router(ra.router)
    return TestClient(app)


def test_info_no_pin(client):
    r = client.get("/api/remote-access/info")
    assert r.status_code == 200
    body = r.json()
    assert body["pinRequired"] is False
    assert "url" in body and body["features"] == ["chat", "voiceHUD", "settings"]


def test_set_pin_valid_then_info_requires_pin(client):
    assert client.post("/api/remote-access/set-pin", json={"pin": "1234"}).json()["success"] is True
    assert client.get("/api/remote-access/info").json()["pinRequired"] is True


@pytest.mark.parametrize("bad", ["12", "1234567", "abcd"])
def test_set_pin_rejects_invalid(client, bad):
    r = client.post("/api/remote-access/set-pin", json={"pin": bad})
    assert r.json()["success"] is False


def test_set_pin_update_requires_current(client):
    client.post("/api/remote-access/set-pin", json={"pin": "1234"})
    # Wrong current PIN is rejected
    assert client.post(
        "/api/remote-access/set-pin", json={"pin": "5678", "currentPin": "0000"}
    ).json()["success"] is False
    # Correct current PIN succeeds
    assert client.post(
        "/api/remote-access/set-pin", json={"pin": "5678", "currentPin": "1234"}
    ).json()["success"] is True


def test_verify_pin_flow(client):
    # No PIN set -> always valid
    assert client.post("/api/remote-access/verify-pin", json={"pin": "0000"}).json()["success"] is True

    client.post("/api/remote-access/set-pin", json={"pin": "4321"})
    # Wrong PIN
    assert client.post("/api/remote-access/verify-pin", json={"pin": "0000"}).json()["success"] is False
    # Correct PIN issues a session and records it
    ok = client.post("/api/remote-access/verify-pin", json={"pin": "4321"}).json()
    assert ok["success"] is True and ok["sessionId"] in ra.validated_sessions


def test_clear_pin(client):
    client.post("/api/remote-access/set-pin", json={"pin": "1234"})
    client.post("/api/remote-access/verify-pin", json={"pin": "1234"})
    assert client.post(
        "/api/remote-access/clear-pin", json={"pin": "x", "currentPin": "1234"}
    ).json()["success"] is True
    assert client.get("/api/remote-access/info").json()["pinRequired"] is False
    assert len(ra.validated_sessions) == 0
