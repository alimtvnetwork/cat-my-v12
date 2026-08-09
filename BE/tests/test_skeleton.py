"""Sanity: all skeleton modules import. Replaced with real tests in Steps 23-24."""

from __future__ import annotations


def test_package_imports() -> None:
    import BE
    from BE import config, envelope, main
    from BE.errors import apperror, codes, handlers
    from BE.routes import health, meta, rules, samples
    from BE.sdk_facade import SDK_FACADE_VERSION, camera, storage

    assert BE.__version__ == "0.1.0"
    assert SDK_FACADE_VERSION == "0.3.0-protocol"
    for mod in (
        config, envelope, main, apperror, codes, handlers,
        health, meta, rules, samples, camera, storage,
    ):
        assert mod is not None
