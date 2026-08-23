"""Behaviour tests for frontend static serving (extracted from cortex.py).

The regression these lock: a ``dist/`` directory that exists but has no built
app in it used to kill Cortex at import time. Vite copies ``public/`` into
``dist/`` first and writes ``index.html`` + ``assets/`` last, so an interrupted
build leaves exactly that state -- and ``StaticFiles`` raises from its
constructor when its directory is missing, at module scope, before uvicorn is
ever built. The desktop shell then saw Cortex exit 1 instead of an API-only
Cortex, and (on a boot sequence that gates on Cortex) escalated to a reboot
loop over a missing frontend.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from static_frontend import (
    describe_missing_build,
    mount_frontend,
    resolve_frontend_build,
)


def _api_app():
    """An app with one API route, standing in for Cortex's router graph."""
    app = FastAPI()

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


def _complete_build(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Luca</title>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log('luca')", encoding="utf-8")
    return dist


def _partial_build(tmp_path):
    """The wreckage of an aborted `npm run build`: public/ copied, app absent."""
    dist = tmp_path / "dist"
    dist.mkdir(parents=True)
    (dist / "icon.png").write_bytes(b"\x89PNG\r\n")
    return dist


# --- resolve_frontend_build -------------------------------------------------

def test_no_dist_is_not_a_build(tmp_path):
    assert resolve_frontend_build(tmp_path) is None


def test_dist_without_index_or_assets_is_not_a_build(tmp_path):
    _partial_build(tmp_path)
    assert resolve_frontend_build(tmp_path) is None


def test_index_without_assets_is_not_a_build(tmp_path):
    dist = tmp_path / "dist"
    dist.mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html>", encoding="utf-8")
    assert resolve_frontend_build(tmp_path) is None


def test_assets_without_index_is_not_a_build(tmp_path):
    (tmp_path / "dist" / "assets").mkdir(parents=True)
    assert resolve_frontend_build(tmp_path) is None


def test_complete_build_resolves(tmp_path):
    dist = _complete_build(tmp_path)
    build = resolve_frontend_build(tmp_path)
    assert build is not None
    assert build.root == dist.resolve()
    assert build.index.is_file() and build.assets.is_dir()


# --- mount_frontend: the boot-safety contract -------------------------------

def test_partial_build_does_not_raise_and_leaves_api_intact(tmp_path):
    """The actual regression. This used to raise RuntimeError at import."""
    _partial_build(tmp_path)
    app = _api_app()

    assert mount_frontend(app, tmp_path) is None

    client = TestClient(app)
    assert client.get("/api/health").json() == {"status": "ok"}
    # No SPA fallback was registered, so an unknown path is still a 404 rather
    # than a lie about a frontend that isn't there.
    assert client.get("/anything").status_code == 404


def test_missing_dist_does_not_raise(tmp_path):
    app = _api_app()
    assert mount_frontend(app, tmp_path) is None
    assert TestClient(app).get("/api/health").status_code == 200


def test_complete_build_serves_index_assets_and_spa_fallback(tmp_path):
    _complete_build(tmp_path)
    app = _api_app()

    assert mount_frontend(app, tmp_path) is not None
    client = TestClient(app)

    assert "<title>Luca</title>" in client.get("/").text
    assert client.get("/assets/app.js").text == "console.log('luca')"
    # Unknown client-side route falls back to the shell, not a 404.
    assert "<title>Luca</title>" in client.get("/settings/appearance").text
    # The API still wins over the catch-all.
    assert client.get("/api/health").json() == {"status": "ok"}


def test_spa_fallback_cannot_read_outside_the_build(tmp_path):
    """Path traversal containment: the URL segment is attacker supplied."""
    _complete_build(tmp_path)
    (tmp_path / "secret.env").write_text("GEMINI_API_KEY=real-key", encoding="utf-8")
    app = _api_app()
    mount_frontend(app, tmp_path)
    client = TestClient(app)

    for attack in (
        "/../secret.env",
        "/..%2fsecret.env",
        "/assets/../../secret.env",
        "/%2e%2e%2fsecret.env",
    ):
        body = client.get(attack).text
        assert "real-key" not in body, f"{attack} escaped the build"


# --- describe_missing_build -------------------------------------------------

def test_describe_distinguishes_absent_from_incomplete(tmp_path):
    assert "No dist folder found" in describe_missing_build(tmp_path)

    _partial_build(tmp_path)
    message = describe_missing_build(tmp_path)
    assert "Incomplete frontend build" in message
    assert "index.html" in message and "assets/" in message
    assert "API only mode" in message


@pytest.mark.parametrize(
    "make,expected_missing",
    [
        (lambda d: (d / "assets").mkdir(parents=True), "index.html"),
        (
            lambda d: (d.mkdir(parents=True), (d / "index.html").write_text("x", encoding="utf-8")),
            "assets/",
        ),
    ],
)
def test_describe_names_only_what_is_missing(tmp_path, make, expected_missing):
    make(tmp_path / "dist")
    message = describe_missing_build(tmp_path)
    assert expected_missing in message
