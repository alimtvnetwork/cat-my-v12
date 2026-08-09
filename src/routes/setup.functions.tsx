// JS function library route (Plan 67 step 36 / FS-01 slice 2 wiring).
// Provides CRUD + JSON import/export for user-authored functions. Storage
// is `window.localStorage` via the shared persistence adapter; failures
// surface through `toast.error` (never silently swallowed).
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Download, Upload, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { showToastError } from "@/lib/errors/notify";
import { createFunctionLibraryStore, type LibraryFailure } from "@/lib/functions/library-store";
import { exportLibraryJson, importLibraryJson, type FunctionEntry } from "@/lib/functions/library";
import { formatCodedError, formatCodedErrors } from "@/lib/errors/format";

export const Route = createFileRoute("/setup/functions")({
  component: SetupFunctionsPage,
  head: () => ({
    meta: [
      { title: "Functions - Setup" },
      {
        name: "description",
        content: "Author, edit, and manage reusable JS functions used by chain-events.",
      },
    ],
  }),
});

function memoryStorage() {
  const map = new Map<string, string>();

  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

function reportFailure(f: LibraryFailure) {
  if (f.kind === "persist") {
    console.error("[functions] persist failure", f.failure);
    showToastError(formatCodedError(f.failure), f.failure, { source: "setup/functions.persist" });
  } else {
    console.error("[functions] validation failure", f.errors);
    showToastError(formatCodedErrors(f.errors) || "Validation failed", f.errors, {
      source: "setup/functions.validate",
    });
  }
}

function SetupFunctionsPage() {
  const store = useMemo(() => {
    const storage =
      typeof window !== "undefined" && window.localStorage ? window.localStorage : memoryStorage();

    return createFunctionLibraryStore({ storage, onFailure: reportFailure });
  }, []);

  const library = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedId && library.entries.some((e) => e.id === selectedId) === false) {
      setSelectedId(null);
    }
  }, [library.entries, selectedId]);

  const selected = selectedId ? (library.entries.find((e) => e.id === selectedId) ?? null) : null;

  function createNew() {
    const now = Date.now();
    const id = `fn-${now.toString(36)}`;
    const entry: FunctionEntry = {
      id,
      name: "New function",
      description: "",
      source: "// return context (rules, results, prev) => ({ ...prev });\nreturn prev;",
      createdAt: now,
      updatedAt: now,
    };

    if (store.upsert(entry)) {
      setSelectedId(id);
      toast.success(`Created ${entry.name}`);
    }
  }

  function patchSelected(next: Partial<FunctionEntry>) {
    if (!selected) return;
    store.upsert({ ...selected, ...next, updatedAt: Date.now() });
  }

  function remove(id: string) {
    if (store.remove(id)) toast.success("Deleted");
  }

  function downloadJson() {
    const text = exportLibraryJson(library);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "functions.library.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    const text = await file.text();
    const r = importLibraryJson(text);

    if (r.parseError) {
      console.error("[functions] import parse error", r.parseError);
      showToastError(`Import failed: ${r.parseError}`, r.parseError, {
        source: "setup/functions.import",
      });

      return;
    }

    let count = 0;
    for (const entry of r.library.entries) {
      if (store.upsert(entry)) count += 1;
    }

    if (r.errors.length > 0) {
      toast.warning(`Imported ${count}, skipped ${r.errors.length} invalid entries`);
    } else {
      toast.success(`Imported ${count} function(s)`);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-hmi-1 border-b border-ca-border bg-ca-panel-2 px-hmi-4 py-hmi-2">
        <h1 className="text-hmi-header text-ca-ink">Functions</h1>
        <p className="text-hmi-caption text-ca-ink-muted">User-authored JS used by chain-events</p>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="flex w-72 flex-col border-r border-ca-border bg-ca-panel-2">
          <div className="flex items-center gap-hmi-1 border-b border-ca-border p-hmi-2">
            <button
              type="button"
              onClick={createNew}
              className="flex items-center gap-hmi-1 border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel"
            >
              <Plus size={14} /> New
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-hmi-1 border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel"
              title="Import JSON"
              aria-label="Import functions from JSON"
            >
              <Upload size={14} aria-hidden />
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="flex items-center gap-hmi-1 border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel"
              title="Export JSON"
              aria-label="Export functions to JSON"
            >
              <Download size={14} aria-hidden />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Import functions JSON file"
              onChange={(e) => {
                const f = e.target.files?.[0];

                if (f) void onImportFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <ul className="flex-1 overflow-auto">
            {library.entries.length === 0 ? (
              <li className="p-hmi-3 text-hmi-caption text-ca-ink-muted">
                No functions yet. Click New to author one.
              </li>
            ) : (
              library.entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(e.id)}
                    className={`flex w-full items-center justify-between gap-hmi-2 border-b border-ca-border px-hmi-2 py-hmi-2 text-left text-hmi-body ${
                      selectedId === e.id
                        ? "bg-ca-panel text-ca-ink"
                        : "text-ca-ink hover:bg-ca-panel"
                    }`}
                  >
                    <span className="truncate">{e.name}</span>
                    <span className="font-hmi-mono text-hmi-caption text-ca-ink-muted">{e.id}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <main className="flex flex-1 flex-col p-hmi-3">
          {selected ? (
            <div className="flex flex-1 flex-col gap-hmi-3">
              <div className="grid grid-cols-2 gap-hmi-2">
                <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
                  <span>Name</span>
                  <input
                    type="text"
                    value={selected.name}
                    onChange={(e) => patchSelected({ name: e.target.value })}
                    className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
                  />
                </label>
                <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
                  <span>Description</span>
                  <input
                    type="text"
                    value={selected.description}
                    onChange={(e) => patchSelected({ description: e.target.value })}
                    className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
                  />
                </label>
              </div>
              <label className="flex flex-1 flex-col gap-hmi-1 text-hmi-body text-ca-ink">
                <span>Source (JS)</span>
                <textarea
                  value={selected.source}
                  onChange={(e) => patchSelected({ source: e.target.value })}
                  spellCheck={false}
                  className="min-h-[320px] flex-1 bg-ca-bg border border-ca-border p-hmi-2 font-hmi-mono text-hmi-body text-ca-ink"
                />
              </label>
              <div className="flex items-center justify-between text-hmi-caption text-ca-ink-muted">
                <span className="font-hmi-mono">
                  id: {selected.id} / bytes: {selected.source.length}
                </span>
                <button
                  type="button"
                  onClick={() => remove(selected.id)}
                  className="flex items-center gap-hmi-1 border border-ca-ng bg-ca-bg px-hmi-2 py-hmi-1 text-ca-ng hover:bg-ca-panel"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-hmi-body text-ca-ink-muted">
              Select a function on the left, or create a new one.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
