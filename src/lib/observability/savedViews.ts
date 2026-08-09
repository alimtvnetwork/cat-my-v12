/**
 * Plan 90 Step 89 — persist named "saved views" for `/observability/sessions`.
 *
 * Root cause guarded here: Step 88 shipped copy-URL, but there was no way
 * to re-open a named view without re-typing the filters or trusting a raw
 * browser bookmark that breaks when the search schema evolves. We store the
 * parsed search object (not the URL) so `validateSearch` + `fallback()`
 * (see `src/routes/observability.sessions.tsx`) automatically repair views
 * saved before a future schema change.
 *
 * Storage: `localStorage["hmi.observability.sessions.savedViews.v1"]`.
 * SSR-safe: every getter/setter checks `typeof window` and swallows quota
 * / access errors with a `console.warn` breadcrumb so a corrupt entry can
 * never crash the observability route.
 */

export type SavedView = {
  /** Stable id (crypto.randomUUID at save time). */
  id: string;
  /** Operator-supplied label; trimmed, 1..64 chars. */
  name: string;
  /** Arbitrary search-params object; validated on read by the route. */
  search: Record<string, unknown>;
  /** Epoch ms; used only for stable sort. */
  createdAt: number;
};

const STORAGE_KEY = "hmi.observability.sessions.savedViews.v1";
const MAX_NAME = 64;
const MAX_VIEWS = 20;

function safeRead(): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed) === false) return [];

    return parsed.filter(
      (v): v is SavedView =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as SavedView).id === "string" &&
        typeof (v as SavedView).name === "string" &&
        typeof (v as SavedView).createdAt === "number" &&
        typeof (v as SavedView).search === "object" &&
        (v as SavedView).search !== null,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[savedViews] read failed; treating as empty", { error: msg });

    return [];
  }
}

function safeWrite(views: SavedView[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));

    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[savedViews] write failed (quota / access)", { error: msg });

    return false;
  }
}

export function listSavedViews(): SavedView[] {
  // Newest first; ties broken by name for determinism.
  return safeRead().sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name));
}

export function addSavedView(
  name: string,
  search: Record<string, unknown>,
): { ok: true; view: SavedView } | { ok: false; reason: string } {
  const trimmed = name.trim();

  if (trimmed.length === 0) return { ok: false, reason: "Name is required" };

  if (trimmed.length > MAX_NAME) {
    return { ok: false, reason: `Name must be <= ${MAX_NAME} chars` };
  }

  const existing = safeRead();

  if (existing.some((v) => v.name === trimmed)) {
    return { ok: false, reason: "A view with that name already exists" };
  }

  if (existing.length >= MAX_VIEWS) {
    return { ok: false, reason: `Limit of ${MAX_VIEWS} saved views reached` };
  }

  const view: SavedView = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    search,
    createdAt: Date.now(),
  };

  if (safeWrite([...existing, view]) === false) {
    return { ok: false, reason: "Storage write failed" };
  }

  return { ok: true, view };
}

export function removeSavedView(id: string): boolean {
  const next = safeRead().filter((v) => v.id !== id);

  return safeWrite(next);
}
