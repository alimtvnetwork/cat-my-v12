"""Frozen release entry point for the local FastAPI service."""

from __future__ import annotations

import os

import uvicorn

from BE.main import app


def main() -> None:
    """Serve the packaged backend on the loopback interface."""
    host = os.environ.get("BE_HOST", "127.0.0.1")
    port = int(os.environ.get("BE_PORT", "8787"))

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
