"""Tests for the Cortex Phase 1 security gate (luca_security)."""
import os
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.testclient import TestClient

import luca_security


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _fake_request(host, headers=None):
    """Minimal stand-in for a Starlette Request for unit-level checks."""
    return SimpleNamespace(
        client=SimpleNamespace(host=host),
        headers=headers or {},
    )


def _gated_app():
    """A tiny app whose router is gated by require_privileged, like the real
    powerful routers (osint/hacking/build/agent_tool)."""
    app = FastAPI()
    router = APIRouter()

    @router.get("/secret")
    def secret():
        return {"ok": True}

    app.include_router(router, dependencies=[Depends(luca_security.require_privileged)])
    return app


@pytest.fixture(autouse=True)
def _isolate_secret(monkeypatch, tmp_path):
    """Default to a deterministic 'no on-disk secret' state. Tests that need a
    secret set LUCA_SECRET explicitly."""
    monkeypatch.delenv("LUCA_SECRET", raising=False)
    monkeypatch.delenv("LUCA_CORTEX_ALLOWED_ORIGINS", raising=False)
    monkeypatch.setattr(
        luca_security, "_SECRET_FILE", str(tmp_path / "missing_secret.key")
    )


# --------------------------------------------------------------------------
# Token resolution / validation
# --------------------------------------------------------------------------
def test_master_token_from_env(monkeypatch):
    monkeypatch.setenv("LUCA_SECRET", "  env-token-123  ")
    assert luca_security.get_master_token() == "env-token-123"  # trimmed


def test_master_token_from_disk(monkeypatch, tmp_path):
    secret_file = tmp_path / "luca_secret.key"
    secret_file.write_text("disk-token-xyz\n", encoding="utf-8")
    monkeypatch.setattr(luca_security, "_SECRET_FILE", str(secret_file))
    assert luca_security.get_master_token() == "disk-token-xyz"


def test_master_token_none_when_unconfigured():
    assert luca_security.get_master_token() is None


def test_validate_token_timing_safe(monkeypatch):
    monkeypatch.setenv("LUCA_SECRET", "right")
    assert luca_security.validate_token("right") is True
    assert luca_security.validate_token("wrong") is False
    assert luca_security.validate_token(None) is False
    assert luca_security.validate_token("") is False


def test_validate_token_false_without_secret():
    # Fail closed: no configured secret => nothing validates.
    assert luca_security.validate_token("anything") is False


# --------------------------------------------------------------------------
# Loopback detection & header parsing
# --------------------------------------------------------------------------
@pytest.mark.parametrize("host", ["127.0.0.1", "::1", "localhost"])
def test_is_loopback_true(host):
    assert luca_security.is_loopback(_fake_request(host)) is True


@pytest.mark.parametrize("host", ["10.0.0.5", "192.168.1.20", "8.8.8.8", None])
def test_is_loopback_false(host):
    assert luca_security.is_loopback(_fake_request(host)) is False


def test_bearer_token_parsing():
    assert luca_security._bearer_token(_fake_request("x", {"authorization": "Bearer abc"})) == "abc"
    assert luca_security._bearer_token(_fake_request("x", {"Authorization": "bearer abc"})) == "abc"
    assert luca_security._bearer_token(_fake_request("x", {"x-luca-token": "raw"})) == "raw"
    assert luca_security._bearer_token(_fake_request("x", {})) is None


# --------------------------------------------------------------------------
# CORS allowlist
# --------------------------------------------------------------------------
def test_allowed_origins_default_has_no_wildcard():
    origins = luca_security.allowed_origins()
    assert "*" not in origins
    assert "http://localhost:5173" in origins


def test_allowed_origins_env_override(monkeypatch):
    monkeypatch.setenv("LUCA_CORTEX_ALLOWED_ORIGINS", "https://a.com, https://b.com ,")
    assert luca_security.allowed_origins() == ["https://a.com", "https://b.com"]


# --------------------------------------------------------------------------
# require_privileged — the core gate (unit level)
# --------------------------------------------------------------------------
def test_require_privileged_allows_loopback():
    # Desktop app over loopback always passes — no token required.
    assert luca_security.require_privileged(_fake_request("127.0.0.1")) is True


def test_require_privileged_denies_remote_without_token():
    with pytest.raises(HTTPException) as exc:
        luca_security.require_privileged(_fake_request("10.0.0.5"))
    assert exc.value.status_code == 403


def test_require_privileged_allows_remote_with_valid_token(monkeypatch):
    monkeypatch.setenv("LUCA_SECRET", "good")
    req = _fake_request("10.0.0.5", {"authorization": "Bearer good"})
    assert luca_security.require_privileged(req) is True


def test_require_privileged_denies_remote_with_wrong_token(monkeypatch):
    monkeypatch.setenv("LUCA_SECRET", "good")
    req = _fake_request("10.0.0.5", {"authorization": "Bearer bad"})
    with pytest.raises(HTTPException):
        luca_security.require_privileged(req)


# --------------------------------------------------------------------------
# require_privileged — end-to-end through FastAPI (remote = TestClient host)
# --------------------------------------------------------------------------
def test_gated_route_denies_remote_without_token():
    # TestClient presents a non-loopback client host, i.e. a remote caller.
    client = TestClient(_gated_app())
    assert client.get("/secret").status_code == 403


def test_gated_route_allows_remote_with_token(monkeypatch):
    monkeypatch.setenv("LUCA_SECRET", "tok")
    client = TestClient(_gated_app())
    assert client.get("/secret", headers={"Authorization": "Bearer tok"}).status_code == 200
    assert client.get("/secret", headers={"X-Luca-Token": "tok"}).status_code == 200
    assert client.get("/secret", headers={"Authorization": "Bearer nope"}).status_code == 403
