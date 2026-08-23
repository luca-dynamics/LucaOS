"""Serving the built renderer from Cortex, without letting it break boot.

Extracted from cortex.py's ``__main__`` block, where it was a startup hazard.
The old guard asked only whether ``dist/`` existed and then mounted
``dist/assets``. Two facts made that fatal:

1. Vite copies ``public/`` into ``dist/`` first and writes ``index.html`` and
   ``assets/`` last, so an interrupted or OOM-killed ``npm run build`` leaves a
   ``dist/`` full of icons and no application.
2. Starlette's ``StaticFiles`` raises ``RuntimeError`` from its *constructor*
   when the directory is missing, and the block ran at module scope -- before
   ``uvicorn.Server`` was ever constructed.

So a half-finished frontend build took the entire API down at import time, and
the desktop shell saw Cortex exit 1 rather than an API-only Cortex.

The rule this module enforces: Cortex serves the UI only when the UI is
actually present, and an incomplete build degrades to API-only mode instead of
killing the process.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


@dataclass(frozen=True)
class FrontendBuild:
    """A ``dist/`` directory holding both things the serving routes hand out.

    ``root`` is resolved, so it can be used as the containment boundary for
    SPA path lookups.
    """

    root: Path
    index: Path
    assets: Path


def resolve_frontend_build(project_root: Path) -> Optional[FrontendBuild]:
    """Return the build to serve, or ``None`` when there is not a complete one.

    A ``dist/`` directory is not the same thing as a build. Both ``index.html``
    and ``assets/`` must be present, because both are what the routes below
    depend on -- requiring less than that is what made a partial build fatal.
    """
    dist = Path(project_root) / "dist"
    index = dist / "index.html"
    assets = dist / "assets"
    if index.is_file() and assets.is_dir():
        return FrontendBuild(root=dist.resolve(), index=index, assets=assets)
    return None


def describe_missing_build(project_root: Path) -> str:
    """One boot-log line saying why the build was rejected.

    "No dist folder" and "dist folder with no app in it" are different
    situations for whoever is reading the log, so they read differently.
    """
    dist = Path(project_root) / "dist"
    if not dist.is_dir():
        return f"No dist folder found at {dist} - API only mode"

    missing = []
    if not (dist / "index.html").is_file():
        missing.append("index.html")
    if not (dist / "assets").is_dir():
        missing.append("assets/")
    return (
        f"Incomplete frontend build at {dist} "
        f"(missing {', '.join(missing)}) - API only mode"
    )


def mount_frontend(app: FastAPI, project_root: Path) -> Optional[FrontendBuild]:
    """Attach the SPA routes when a complete build exists, else do nothing.

    Registers a catch-all route, so call this *after* every API router is in
    place. Returns the mounted build, or ``None`` if the app was left API-only.
    Never raises for a missing or partial build.
    """
    build = resolve_frontend_build(project_root)
    if build is None:
        return None

    @app.get("/")
    async def serve_index():
        return FileResponse(build.index)

    app.mount("/assets", StaticFiles(directory=build.assets), name="assets")

    # Catch-all for SPA routing (must stay last)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Contain the lookup inside the build. The URL segment is attacker
        # supplied, and the inline version resolved it straight against dist/,
        # so "../.." walked out of the build -- on a service that binds
        # 0.0.0.0 whenever remote access is enabled. Anything outside falls
        # through to index.html like any other unknown route.
        candidate = (build.root / full_path).resolve()
        if candidate.is_file() and candidate.is_relative_to(build.root):
            return FileResponse(candidate)
        return FileResponse(build.index)

    return build
