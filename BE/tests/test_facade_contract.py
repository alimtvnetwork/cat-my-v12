"""Signature-boundary contract tests for the SDK facade Protocols.

`isinstance(adapter, CameraFacade)` (test_sdk_facade.py) only checks that
method NAMES exist on the adapter, not that their parameter names and counts
match the Protocol. This suite compares `inspect.signature` on each Protocol
method against the concrete in-memory adapter, so a drifted parameter
(rename, added positional, dropped default) fails here instead of at the
first real caller.

Scope: structural signature parity for every method declared on
`CameraFacade` and `StorageFacade`, plus the attribute shape of `SdkFacade`.
Behavior belongs in `test_camera_facade.py` / `test_storage_facade.py`.
"""

from __future__ import annotations

import inspect
from typing import Protocol

import pytest

from BE.sdk_facade import CameraFacade, SdkFacade, StorageFacade
from BE.sdk_facade.camera import InMemoryCameraFacade
from BE.sdk_facade.storage import InMemoryStorageFacade


def _public_methods(proto: type[Protocol]) -> list[str]:
    """Names of Protocol methods (skip dunders and typing internals)."""
    return [
        name
        for name, member in vars(proto).items()
        if callable(member) and not name.startswith("_")
    ]


def _params(fn: object) -> list[tuple[str, inspect._ParameterKind]]:
    """Positional/keyword param (name, kind) pairs, excluding `self`."""
    sig = inspect.signature(fn)  # type: ignore[arg-type]
    return [
        (p.name, p.kind)
        for p in sig.parameters.values()
        if p.name != "self"
    ]


@pytest.mark.parametrize(
    ("proto", "impl"),
    [(CameraFacade, InMemoryCameraFacade), (StorageFacade, InMemoryStorageFacade)],
)
def test_impl_declares_every_protocol_method(
    proto: type[Protocol], impl: type
) -> None:
    for name in _public_methods(proto):
        assert hasattr(impl, name), f"{impl.__name__} missing Protocol method {name!r}"
        assert callable(getattr(impl, name)), f"{impl.__name__}.{name} not callable"


@pytest.mark.parametrize(
    ("proto", "impl"),
    [(CameraFacade, InMemoryCameraFacade), (StorageFacade, InMemoryStorageFacade)],
)
def test_impl_signatures_match_protocol(
    proto: type[Protocol], impl: type
) -> None:
    for name in _public_methods(proto):
        proto_params = _params(getattr(proto, name))
        impl_params = _params(getattr(impl, name))
        assert impl_params == proto_params, (
            f"{impl.__name__}.{name} signature drifted from "
            f"{proto.__name__}.{name}: proto={proto_params} impl={impl_params}"
        )


def test_camera_facade_public_surface_is_locked() -> None:
    """Freeze the Protocol method roster so accidental additions/removals fail loudly."""
    assert sorted(_public_methods(CameraFacade)) == sorted(
        [
            "list_devices",
            "open",
            "close",
            "start_stream",
            "stop_stream",
            "grab",
            "set_exposure",
            "set_gain",
            "set_roi",
            "set_pixel_format",
            "set_trigger",
            "execute_software_trigger",
            "read_line_status",
            "set_line_output",
        ]
    )


def test_storage_facade_public_surface_is_locked() -> None:
    assert sorted(_public_methods(StorageFacade)) == ["get", "put"]


def test_sdk_facade_declares_expected_attributes() -> None:
    """SdkFacade is attribute-shaped, not method-shaped: check annotations."""
    # `from __future__ import annotations` keeps values as strings; compare by name.
    ann = SdkFacade.__annotations__
    assert set(ann.keys()) == {"version", "camera", "storage"}
    assert ann["camera"] == CameraFacade.__name__
    assert ann["storage"] == StorageFacade.__name__
