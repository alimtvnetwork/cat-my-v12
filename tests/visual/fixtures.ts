/**
 * Plan 78 slice 8: deterministic seed data for visual coverage of
 * `/projects/$projectId/camera`.
 *
 * Two variants are needed to lock the route's visible surface:
 *   1. bound   - project.cameraSettingId points at a CameraSetting that
 *                exists in the camera library. Renders the details grid.
 *   2. unbound - project exists but has no cameraSettingId, and the camera
 *                library is empty. Renders the empty-state hint.
 *
 * Projects persistence goes through `createFacadeStateStorage()` which
 * migrates from a legacy `localStorage[ca:projects:v1]` payload on first
 * read. We seed that legacy key; the facade copies it into IndexedDB on
 * hydrate, so the zustand store sees the fixture without needing a
 * server round-trip. Camera library persistence is direct localStorage,
 * seeded under `ca.camera.library.v1`.
 */
import type { Page } from "@playwright/test";

export const FIXTURE_CAMERA_ID = "cam-fixture-0001";
export const FIXTURE_PROJECT_BOUND_ID = "p-fixture-bound-0001";
export const FIXTURE_PROJECT_UNBOUND_ID = "p-fixture-unbound-0001";

/** Fixed epoch so serialized JSON is byte-stable across runs. */
const FIXTURE_EPOCH = 1_700_000_000_000;

/** CameraSetting matching the model.ts default shape; deterministic id/name. */
function fixtureCamera() {
  return {
    id: FIXTURE_CAMERA_ID,
    name: "Fixture Camera",
    vendor: "GenericV4L2",
    deviceSerial: "SN-FIXTURE-01",
    fovMmW: 100,
    fovMmH: 75,
    resolutionW: 1920,
    resolutionH: 1080,
    exposureUs: 5000,
    gainDb: 0,
    gamma: 1.0,
    whiteBalanceKelvin: 0,
    focusMode: "Auto",
    triggerMode: "Software",
    frameRateHz: 30,
    pockets: 1,
    roi: null,
    ColorModeType: "Mono8",
    notes: "",
    createdAt: FIXTURE_EPOCH,
    updatedAt: FIXTURE_EPOCH,
  };
}

function fixtureProjectsState() {
  return {
    projects: {
      [FIXTURE_PROJECT_BOUND_ID]: {
        id: FIXTURE_PROJECT_BOUND_ID,
        name: "Fixture Project (bound)",
        createdAt: FIXTURE_EPOCH,
        rulesetIds: [],
        cameraSettingId: FIXTURE_CAMERA_ID,
      },
      [FIXTURE_PROJECT_UNBOUND_ID]: {
        id: FIXTURE_PROJECT_UNBOUND_ID,
        name: "Fixture Project (unbound)",
        createdAt: FIXTURE_EPOCH,
        rulesetIds: [],
      },
    },
    rulesets: {},
  };
}

/**
 * Write both storage payloads on the current origin. Must be called
 * AFTER the page has navigated to the origin so `localStorage` is
 * scoped correctly; caller then navigates to the target route.
 *
 * `libraryMode`:
 *   - "with-camera": seed one CameraSetting so the bound project can
 *     resolve its `cameraSettingId`.
 *   - "empty": clear the camera library so the unbound project renders
 *     the "No CameraSetting records yet" empty-state hint.
 */
export enum FixtureLibraryModeType {
  WithCamera = "with-camera",
  Empty = "empty",
}

export async function installProjectCameraFixtures(
  page: Page,
  libraryMode: FixtureLibraryModeType = FixtureLibraryModeType.WithCamera,
): Promise<void> {
  const projectsEnvelope = { state: fixtureProjectsState(), version: 0 };
  const cameraLibrary =
    libraryMode === FixtureLibraryModeType.WithCamera
      ? { kind: "ca.camera.library", version: 1, entries: [fixtureCamera()] }
      : { kind: "ca.camera.library", version: 1, entries: [] };
  await page.evaluate(
    ({ projectsKey, projectsValue, cameraKey, cameraValue }) => {
      window.localStorage.setItem(projectsKey, projectsValue);
      window.localStorage.setItem(cameraKey, cameraValue);
    },
    {
      projectsKey: "ca:projects:v1",
      projectsValue: JSON.stringify(projectsEnvelope),
      cameraKey: "ca.camera.library.v1",
      cameraValue: JSON.stringify(cameraLibrary),
    },
  );
  // Also clear the IDB-backed facade cache so the legacy-localStorage
  // migration path runs on the next hydrate. Best-effort; ignore errors
  // (private-mode browsers or blocked IDB just fall back to memory).
  await page.evaluate(
    async ({ projectsKey }) => {
      try {
        const req = indexedDB.deleteDatabase("keyval-store");
        await new Promise((resolve) => {
          req.onsuccess = resolve;
          req.onerror = resolve;
          req.onblocked = resolve;
        });
      } catch {
        /* ignore */
      }
      // Touch the key so future reads see the seeded value.
      void projectsKey;
    },
    { projectsKey: "ca:projects:v1" },
  );
}

/** Wait for zustand hydration to surface the seeded project on the page. */
export async function waitForFixtureProject(page: Page, projectId: string): Promise<void> {
  await page.waitForSelector(`[data-project-id="${projectId}"]`, { timeout: 10_000 });
}

// -------------------------------------------------------------------------
// Rule editor fixture (visual regression for /setup/rules/$id ROI editor)
// -------------------------------------------------------------------------

export const FIXTURE_RULE_ID = "rule-fixture-0001";
export const FIXTURE_RULE_DISABLED_ID = "rule-fixture-disabled-0001";
const FIXTURE_ISO = "2023-11-14T22:13:20.000Z";

function fixtureRule() {
  return {
    id: FIXTURE_RULE_ID,
    name: "Fixture Rule",
    isCategory: false,
    notes: "Deterministic rule seeded for ROI editor visual gate.",
    appliesBefore: [],
    conditions: [],
    createdAt: FIXTURE_ISO,
    updatedAt: FIXTURE_ISO,
  };
}

/**
 * Seed the rules facade (idb-keyval backed) with one deterministic rule so
 * `/setup/rules/<FIXTURE_RULE_ID>` renders the full RuleEditor surface
 * (tools palette, metadata bar, properties + layers palettes) without any
 * network or user interaction.
 *
 * Must be called AFTER navigating to the localhost origin so IndexedDB is
 * scoped correctly, and BEFORE navigating to the rule editor route.
 */
export async function installRuleEditorFixtures(page: Page): Promise<void> {
  const payload = JSON.stringify([fixtureRule()]);
  await writeRulesPayload(page, payload);
}

/**
 * Plan 83 item 15: seed one enabled + one disabled rule so the
 * `/setup/rules?status=<...>` deep-link surfaces have a deterministic
 * mixed-state list to render (disabled row + Status filter chip).
 */
export async function installRuleMixedStatusFixtures(page: Page): Promise<void> {
  const enabled = fixtureRule();
  const disabled = {
    ...fixtureRule(),
    id: FIXTURE_RULE_DISABLED_ID,
    name: "Fixture Rule (disabled)",
    enabled: false,
    notes: "Deterministic disabled rule for status-filter visual gate.",
  };
  const payload = JSON.stringify([enabled, disabled]);
  await writeRulesPayload(page, payload);
}

async function writeRulesPayload(page: Page, payload: string): Promise<void> {
  await page.evaluate(
    async ({ storeName, key, value }) => {
      // Match idb-keyval defaults: database "keyval-store", store "keyval".
      // The rules facade uses ProjectRepositoryFacade -> idb-keyval set/get,
      // so writing the raw key/value here is equivalent to a facade write.
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("keyval-store", 1);
        open.onupgradeneeded = () => {
          open.result.createObjectStore(storeName);
        };
        open.onerror = () => reject(open.error ?? new Error("idb open failed"));
        open.onsuccess = () => {
          const db = open.result;
          try {
            const tx = db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).put(value, key);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
          } catch (err) {
            db.close();
            reject(err);
          }
        };
      });
    },
    { storeName: "keyval", key: "ca:rules:v1", value: payload },
  );
}
