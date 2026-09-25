# 52 - SDK Facade Pattern (LOCKED)

**Status:** Locked (2026-07-13). Governs every integration with a third-party SDK (camera vendors, lighting controllers, trigger boards, OCR engines, cloud AI, notification services). No business-logic module may hold a reference to an SDK-returned object; it holds a `Cat*` facade object we own.

Anchors: 22 (Task DB), 24 (results JSON), 33 (rule catalog), 36 (instruction bundle), 50 (capture modules), 51 (security & config modules).

## 1. Why

- The SDK is not ours. Its types, exceptions, thread rules, memory ownership, and version churn are outside our control.
- If business logic imports SDK types, we get: vendor lock-in, unstable tests (SDK must be installed to import), leaked SDK exceptions across boundaries, and refactors that ripple through the app on every vendor bump.
- A single facade seam lets us: swap vendors, mock in tests without the SDK, translate exceptions to typed errors (40 §Tiers), keep enum casing PascalCase (24 §2), and enforce the naming convention.

## 2. The Rule (one sentence)

**Every SDK call site is behind a `<Vendor>Facade` we author; every SDK-returned object is immediately wrapped in a `Cat<Concept>` object we author; business logic references only `Cat*` and `*Facade` types.**

Any SDK type appearing in a function signature, return type, field type, or `isinstance` check outside `app/capture/**/*_device_io.py`, `app/**/facades/**`, or a `*_facade.py` module is `E_BUG_SDK_LEAK` at lint time.

## 3. Canonical Shape

Pseudocode from the intake, expressed in our conventions:

```python
# Third-party (we do NOT import outside the facade folder)
class CameraSDK:
    def re_read_image(self) -> SdkImage2: ...
    def light_change(self, level: int) -> None: ...
    def correction_angle(self, deg: float) -> None: ...

# Ours - domain object, no SDK types on the surface
class CatImage:
    def __init__(self, sdk_image: "SdkImage2") -> None:
        self._sdk_image = sdk_image  # private, never exposed

    def get_pixels(self) -> "np.ndarray[Any, Any]": ...
    def get_file_path(self) -> str: ...
    @property
    def is_valid(self) -> bool: ...

# Ours - facade; the ONLY module allowed to import CameraSDK
class CameraSdkFacade:
    def __init__(self, sdk: CameraSDK) -> None:
        self._sdk = sdk

    def get_image(self) -> CatImage:
        try:
            sdk_image = self._sdk.re_read_image()
        except BaseException as exc:
            raise self._translate(exc) from exc
        return CatImage(sdk_image)

    def set_light_level(self, level: int) -> None: ...
    def set_correction_angle_deg(self, deg: float) -> None: ...
```

Business logic:

```python
def capture_and_route(facade: CameraSdkFacade) -> None:
    cat_image = facade.get_image()          # Cat*, not SdkImage2
    pipeline.dispatch(cat_image)            # no SDK type crosses this line
```

## 4. Naming Convention (LOCKED)

| Kind          | Pattern                                             | Example                                                                                                                   |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Facade class  | `<Vendor><Domain>SdkFacade`                         | `BaslerCameraSdkFacade`, `SpinnakerCameraSdkFacade`, `VimbaCameraSdkFacade`, `TesseractOcrSdkFacade`, `GeminiAiSdkFacade` |
| Facade module | `<vendor>_<domain>_facade.py`                       | `basler_camera_facade.py`                                                                                                 |
| Facade folder | `app/<area>/facades/`                               | `app/capture/facades/`, `app/ai/facades/`                                                                                 |
| Domain object | `Cat<Concept>`                                      | `CatImage`, `CatFrame`, `CatDeviceDescriptor`, `CatOcrResult`, `CatAiJudgment`, `CatTriggerPulse`                         |
| Domain module | `cat_<concept>.py`                                  | `cat_image.py`                                                                                                            |
| Domain folder | `app/<area>/models/`                                | `app/capture/models/cat_image.py`                                                                                         |
| Factory       | `make_<vendor>_facade(cfg) -> <Vendor>...SdkFacade` | `make_basler_camera_facade(cfg)`                                                                                          |
| Test double   | `Fake<Vendor>Sdk`, `FakeCat<Concept>`               | `FakeBaslerCameraSdk`, `FakeCatImage`                                                                                     |

Rules:

- `Cat` is a hard prefix. Never `CATImage`, `catImage`, `Cat_Image`. Booleans on `Cat*` keep `is`/`has`/`should` prefixes (mem 02).
- The facade class name always ends in `SdkFacade`. Never `Wrapper`, `Client`, `Adapter`, `Helper`, `Manager`.
- Custom objects for SDK returns always start with `Cat`. Never re-use the SDK's class name with a suffix (`SdkImage2Wrapped`).

## 5. What a Facade MUST Do

1. **Own the SDK import.** `import <sdk>` appears ONLY inside the facade module. Elsewhere: `from app.capture.facades.basler_camera_facade import BaslerCameraSdkFacade`.
2. **Wrap every return value in a `Cat*`.** No SDK type in return annotations. `list`/`tuple`/`dict` of SDK types is still a leak.
3. **Translate every exception** at the facade boundary into a typed error (40 §Tiers): `HardwareTimeoutError`, `DeviceDisconnectedError`, `SdkFacadeError`, or a domain error from the enum table. Unmapped SDK exceptions re-raise as-is so the gap is visible (`E_BUG_UNTYPED_ERROR`).
4. **Expose PascalCase enums**, never the SDK's raw enum values. `CatTriggerMode.Hardware`, not `SDK_TRIG_HW=3`.
5. **Be constructible with a fake.** The facade constructor takes the SDK object (or a factory), never reaches for a global. Tests inject `FakeBaslerCameraSdk`.
6. **Log at the seam.** Every SDK call logs `facade.<method> vendor=<v> outcome=<ok|error> code=<enum>` exactly once (41).

## 6. What a `Cat*` Object MUST Do

1. Hold the SDK object as a **private** field (`_sdk_image`, `_sdk_frame`). Never surface it via a getter, property, or `__getattr__`.
2. Expose ONLY primitives, `numpy` arrays, standard-library types, or other `Cat*` objects on its public surface.
3. Be immutable by default (`@dataclass(frozen=True)` when practical). Mutations happen inside the facade, never on the `Cat*` object.
4. Carry its own `is_valid` / lifetime rules; a stale `CatImage` whose underlying SDK buffer was released MUST raise a typed error, not segfault.

## 7. Enforcement

- Linter rule (`linter-scripts/check-sdk-facade.py`, to be added): flag any file outside `app/**/facades/**` or `*_device_io.py` that imports a known SDK package (`pypylon`, `PySpin`, `vmbpy`, `pytesseract`, `google.generativeai`, `openai`, …). Emit `E_BUG_SDK_LEAK`.
- Type check: return/parameter types outside the facade folder MUST NOT reference SDK types (grep for `SdkImage`, `Image2`, `Camera`, etc. by allowlist). Emit `E_BUG_SDK_TYPE_LEAK`.
- Code review checklist: any new `import` from a vendor SDK requires a new `<vendor>_<domain>_facade.py` and at least one `Cat*` model file in the same PR.

## 8. Current Holes (as of v1.74.0)

The facade seam exists partially at `app/capture/vendor_device_io.py` (adapter pattern), but the following gaps violate §2:

| Hole | File                                                                   | Symptom                                                                                                                                                  | Fix                                                                                                                                                                                                                          |
| ---- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1   | `app/capture/vendor_device_io.py::VendorDeviceIO.grab` returns `bytes` | Business logic downstream has to parse raw bytes; no `Cat*` wrapper                                                                                      | Return `CatFrame` (fields: `pixels`, `width_px`, `height_px`, `captured_at`, `sequence_number`, `_sdk_frame`)                                                                                                                |
| G2   | `VendorDeviceDescriptor` (dataclass)                                   | Fine name pattern-wise but not prefixed `Cat` per §4                                                                                                     | Rename to `CatDeviceDescriptor`; keep `VendorDeviceDescriptor` as a one-release deprecation alias                                                                                                                            |
| G3   | `pylon_device_io.py`, `spinnaker_device_io.py`, `vimba_device_io.py`   | Each is a hybrid: adapter + partial facade. Not named `*SdkFacade`. Import SDK types conditionally via string-name predicates rather than a facade seam. | Split each into `app/capture/facades/<vendor>_camera_facade.py` (the ONLY module allowed to `import pypylon` / `import PySpin` / `import vmbpy`) plus a `_device_io.py` that stays as the `DeviceIO` adapter over the facade |
| G4   | `app/capture/hardware_bridge.py`                                       | Uses raw `bytes` for frames                                                                                                                              | Update `trigger()` to return `CatFrame`; `reference_driver.py` too                                                                                                                                                           |
| G5   | `app/ai/transport.py`, `app/ai/gate.py`                                | AI/OCR path (43-ai-validation-stub) planned but no facade seam locked                                                                                    | Pre-lock: `app/ai/facades/<vendor>_ai_facade.py` returning `CatAiJudgment`; add to §7 lint allowlist                                                                                                                         |
| G6   | `app/capture/trigger/gpio_edge.py`, `trigger/software_timer.py`        | GPIO board is an SDK too                                                                                                                                 | `app/capture/facades/<vendor>_trigger_facade.py` returning `CatTriggerPulse`                                                                                                                                                 |
| G7   | `src/lib/capture.shared.ts` `VendorDeviceDescriptor`                   | UI-side twin of G2                                                                                                                                       | Rename to `CatDeviceDescriptor` in TS + Zod schema                                                                                                                                                                           |
| G8   | No `Cat*` models folder                                                |                                                                                                                                                          | Create `app/capture/models/` with `cat_frame.py`, `cat_device_descriptor.py`, `cat_trigger_pulse.py`                                                                                                                         |
| G9   | No lint script                                                         |                                                                                                                                                          | Add `linter-scripts/check-sdk-facade.py` per §7, register in `linter-scripts/run.sh`                                                                                                                                         |

Each hole gets one plan step in the next execution order (23-v2 sequence), preserving the current v2.0.1 vendor-discovery work.

## 9. Error Codes (added to 40 §Appendix)

| Code                     | Tier          | Emitter               | Meaning                                                                   |
| ------------------------ | ------------- | --------------------- | ------------------------------------------------------------------------- |
| `E_SDK_FACADE_TRANSLATE` | `InfraError`  | any `*SdkFacade`      | Facade caught an SDK exception it could not classify. Fatal for the call. |
| `E_SDK_FACADE_STALE`     | `DomainError` | any `Cat*`            | Method called on a `Cat*` whose backing SDK buffer was released.          |
| `E_BUG_SDK_LEAK`         | Lint          | `check-sdk-facade.py` | SDK import outside facade folder.                                         |
| `E_BUG_SDK_TYPE_LEAK`    | Lint          | `check-sdk-facade.py` | SDK type in a public signature outside facade folder.                     |

## 10. Non-Goals

- Not a DI container. Facades are constructed by the boot module (`app/supervisor/boot.py`) and passed down; no global registry.
- Not a schema migration. `Cat*` models are Python objects, not DB rows; DB tables stay per 22.
- Not an event bus. Facades are synchronous request/response over the vendor SDK; the dispatcher (15) still owns async orchestration.

## 11. TypeScript Port (browser + server-fn code)

The same rule applies to the TypeScript side of the app: **every third-party
SDK, browser API family, or remote service goes behind a `*Facade` we own.**
Business code (routes, zustand stores, hooks, server functions) imports the
facade type, never the vendor module.

What counts as an "SDK" in TypeScript:

- Browser storage: `localStorage`, `sessionStorage`, `indexedDB` (via `idb-keyval`, Dexie, or hand-rolled).
- Remote APIs: Supabase JS client, `fetch` calls to a REST/RPC endpoint, WebSocket clients.
- Vendor UI SDKs: Stripe.js, Mapbox, camera preview WASM modules.
- File I/O in the sandbox: `fs/promises`, `path`, `child_process` on the server side.

Naming (mirrors §4):

| Kind          | Pattern                                                  | Example                                                 |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| Facade iface  | `<Domain>RepositoryFacade` / `<Vendor><Domain>SdkFacade` | `ProjectRepositoryFacade`, `StripeBillingSdkFacade`     |
| Facade class  | `<Vendor><Domain>...Facade`                              | `IndexedDbProjectRepositoryFacade`                      |
| Facade module | `<domain>/facade.ts` or `<vendor>-<domain>-facade.ts`    | `src/lib/projects/facade.ts`                            |
| Domain object | `Cat<Concept>` (only when a vendor object leaks)         | `CatDeviceDescriptor` (see `src/lib/capture.shared.ts`) |
| Factory       | `make<Domain>Facade()`                                   | `makeProjectRepositoryFacade()`                         |
| Test override | `__set<Domain>FacadeForTests(fake)`                      | `__setProjectRepositoryFacadeForTests(...)`             |

### 11.1 Canonical shape (browser storage)

Pseudocode / real example, ported from §3 into TypeScript. This is the shape
`src/lib/projects/facade.ts` follows and is the reference every future TS
facade in this repo MUST mirror:

```ts
// Third-party / platform API. Imported ONLY inside the facade module.
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

// Ours — the public interface. Business code depends on THIS, not on idb-keyval.
export interface ProjectRepositoryFacade {
  readonly kind: "indexeddb" | "localstorage" | "memory" | "remote";
  readItem(key: string): Promise<string | null>;
  writeItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Ours — one concrete impl per vendor. `IDBRequest` / `IDBDatabase` NEVER
// appear on the return types; every method returns primitives or a domain
// type we author.
class IndexedDbProjectRepositoryFacade implements ProjectRepositoryFacade {
  readonly kind = "indexeddb" as const;
  async readItem(key: string): Promise<string | null> {
    try {
      const raw = await idbGet<string | undefined>(key);
      return typeof raw === "string" ? raw : null;
    } catch (err) {
      // Translate vendor errors at the seam — same as §5 rule 3.
      console.warn("[projects/facade] indexeddb read failed", key, err);
      return null;
    }
  }
  async writeItem(key: string, value: string): Promise<void> {
    await idbSet(key, value);
  }
  async removeItem(key: string): Promise<void> {
    await idbDel(key);
  }
}

// Factory. Business code never uses `new` — it calls the factory so the
// runtime can swap in `MemoryProjectRepositoryFacade` on SSR / vitest, or a
// future `RemoteProjectRepositoryFacade` when the app moves to Lovable Cloud.
let cached: ProjectRepositoryFacade | null = null;
export function makeProjectRepositoryFacade(): ProjectRepositoryFacade {
  if (cached) return cached;
  cached =
    typeof indexedDB === "undefined"
      ? new MemoryProjectRepositoryFacade()
      : new IndexedDbProjectRepositoryFacade();
  return cached;
}
```

Business logic:

```ts
// zustand store — imports the FACADE, not idb-keyval, not localStorage.
import { createFacadeStateStorage } from "@/lib/projects/facade";

export const useProjectStore = create<ProjectStoreState>()(
  persist(/* ... */, {
    name: "ca:projects:v1",
    storage: createJSONStorage(() => createFacadeStateStorage()),
  }),
);
```

### 11.2 What a TS facade MUST do

Same as §5, restated for TypeScript:

1. **Own the vendor import.** `import "idb-keyval"` / `import { supabase }` / `import Stripe` appears only inside the facade module. All other files import the facade interface by name.
2. **Return primitives or `Cat*` / domain types.** No `IDBRequest`, no `PostgrestResponse`, no raw `Response`, no vendor error class on the public surface.
3. **Translate exceptions.** Wrap vendor throws into typed app errors (see `src/lib/rpc/client.ts` `RpcError`, or a domain-specific `E_*` code). Unknown throws re-surface, they do not get swallowed.
4. **Be constructible with a fake.** Provide `__set<Domain>FacadeForTests(fake)` so unit tests inject a `MemoryProjectRepositoryFacade` / `FakeStripeBillingSdkFacade` without touching global mocks.
5. **Log at the seam.** Every facade method logs `[<domain>/facade] <op> outcome=<ok|error>` exactly once. Business code does not re-log the same event.
6. **Async by default.** Even if today's backend is synchronous (`localStorage`), the interface returns `Promise<T>` so tomorrow's remote backend fits without breaking callers.

### 11.3 Enforcement (TS)

- Lint (planned `linter-scripts/check-ts-facade.ts`): flag any file outside `src/lib/**/facade.ts` / `src/**/facades/**` importing `idb-keyval`, `dexie`, `@supabase/supabase-js` (browser), `stripe`, `mapbox-gl`. Emit `E_BUG_SDK_LEAK`.
- Grep gate in `scripts/check-magic-strings.sh`: no `window.localStorage.` or `indexedDB.` outside the facade folder.
- Code review: every new vendor npm dep MUST land with a matching `*Facade` module in the same PR.

### 11.4 Current TS facades in the repo

| Facade                                         | Module                         | Backs                         |
| ---------------------------------------------- | ------------------------------ | ----------------------------- |
| `ProjectRepositoryFacade` (IndexedDB / Memory) | `src/lib/projects/facade.ts`   | `useProjectStore` persistence |
| `withSdkRetry`                                 | `src/lib/sdk-facade.server.ts` | Vendor camera SDK retry seam  |
| `RpcError` boundary + `invokeRpc`              | `src/lib/rpc/client.ts`        | TanStack server-fn call sites |

New client-side vendor deps (analytics, feature flags, payments UI, maps,
realtime) MUST add a row here and ship a `*Facade` in the same change.

## Acceptance Checklist

- [ ] Facade interface has no vendor-specific types leaking through.
- [ ] Every vendor spec (63/64/65) declares its `VendorDeviceIO` binding.
- [ ] Adapter lifecycle (open/close/error) matches spec 15 capture pipeline.
- [ ] Every new TypeScript vendor dep lands with a `*Facade` module (§11).
- [ ] Business code imports the facade interface, not the vendor package.
