"""Plan 88 Step 20: Protocol contract lock (expanded in Step 21).

Ensures `SdkFacade`, `CameraFacade`, `StorageFacade` are runtime-checkable,
that the in-memory adapters satisfy `isinstance(..., SdkFacade)`, and that a
missing attribute fails the check. Also pins `SDK_FACADE_VERSION` shape
(non-empty, dotted) so FE `/meta.sdkFacadeVersion` consumers get a stable
value across builds.
"""

from __future__ import annotations

from BE.sdk_facade import (
    SDK_FACADE_VERSION,
    CameraFacade,
    SdkFacade,
    StorageFacade,
)
from BE.sdk_facade.camera import InMemoryCameraFacade
from BE.sdk_facade.storage import InMemoryStorageFacade


class _StubFacade:
    version = SDK_FACADE_VERSION

    def __init__(self) -> None:
        self.camera = InMemoryCameraFacade()
        self.storage = InMemoryStorageFacade()


def test_version_shape() -> None:
    assert isinstance(SDK_FACADE_VERSION, str)
    assert SDK_FACADE_VERSION.count(".") >= 2
    assert SDK_FACADE_VERSION  # non-empty


def test_stub_satisfies_protocols() -> None:
    facade = _StubFacade()
    assert isinstance(facade.camera, CameraFacade)
    assert isinstance(facade.storage, StorageFacade)
    assert isinstance(facade, SdkFacade)


def test_incomplete_facade_fails_check() -> None:
    class Missing:
        version = "0.0.0"
        camera = InMemoryCameraFacade()
        # no storage

    assert not isinstance(Missing(), SdkFacade)
