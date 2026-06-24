"""Behaviour tests for the extracted input-control router (Phase 2)."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.deps as deps
import routers.input_control as inp


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(deps, "get_stored_pin", lambda: None)  # no PIN => gate passes
    app = FastAPI()
    app.include_router(inp.router)
    return TestClient(app)


def test_routes_mounted(client):
    # Not 404 => route exists (422/200 acceptable depending on body validation).
    assert client.post("/mouse/move", json={"x": 1, "y": 2}).status_code != 404


def test_mouse_move_unavailable(client, monkeypatch):
    monkeypatch.setattr(inp, "PYAUTOGUI_AVAILABLE", False)
    body = client.post("/mouse/move", json={"x": 10, "y": 20}).json()
    assert body["status"] == "error" and "not available" in body["message"]


def test_mouse_move_invokes_pyautogui(client, monkeypatch):
    calls = {}

    class FakePyAutoGui:
        def moveTo(self, x, y, _pause=False):
            calls["xy"] = (x, y)

    monkeypatch.setattr(inp, "PYAUTOGUI_AVAILABLE", True)
    monkeypatch.setattr(inp, "pyautogui", FakePyAutoGui(), raising=False)
    body = client.post("/mouse/move", json={"x": 5, "y": 7}).json()
    assert body["status"] == "success" and calls["xy"] == (5, 7)


def test_keyboard_type_unavailable(client, monkeypatch):
    monkeypatch.setattr(inp, "PYAUTOGUI_AVAILABLE", False)
    assert client.post("/keyboard/type", json={"text": "hi"}).json()["status"] == "error"


def test_session_gate_blocks_remote_when_pin_set(client, monkeypatch):
    monkeypatch.setattr(deps, "get_stored_pin", lambda: "1234")
    assert client.post("/mouse/move", json={"x": 1, "y": 1}).status_code == 401
