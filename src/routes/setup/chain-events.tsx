import { ChainEventTriggerType } from "@/lib/functions/chain-events";
// Chain-events inspector route (Plan 67 step 37 / FS-02 slice 2 wiring).
// Lists every ChainEvent, lets operators author beforeRule/afterRule and
// beforeRuleset/afterRuleset bindings against the FunctionLibrary, and
// surfaces integrity issues (dangling functionId). Storage is
// `window.localStorage` via the shared persistence adapter; every failure
// is logged and surfaced via `toast.error` (never swallowed).
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { showToastError } from "@/lib/errors/notify";
import {
  createChainEventStoreHandle,
  type ChainEventStoreFailure,
} from "@/lib/functions/chain-events-store";
import { createFunctionLibraryStore, type LibraryFailure } from "@/lib/functions/library-store";
import {
  checkChainEventIntegrity,
  resolveEventsForRule,
  resolveEventsForRuleset,
  type ChainEvent,
  type ChainEventTrigger,
} from "@/lib/functions/chain-events";
import { useProjectStore } from "@/lib/projects/store";
import { formatCodedError, formatCodedErrors } from "@/lib/errors/format";

export const Route = createFileRoute("/setup/chain-events")({
  component: SetupChainEventsPage,
  head: () => ({
    meta: [
      { title: "Chain events - Setup" },
      {
        name: "description",
        content:
          "Bind user-authored JS functions to ruleset and per-rule triggers. Inspect execution order and integrity issues.",
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

function reportLibFailure(f: LibraryFailure) {
  console.error("[chain-events] library failure", f);
  const msg =
    f.kind === "persist" ? `Library: ${formatCodedError(f.failure)}` : formatCodedErrors(f.errors);
  showToastError(msg || "Library failure", f, { source: "setup/chain-events.library" });
}

function reportCeFailure(f: ChainEventStoreFailure) {
  console.error("[chain-events] store failure", f);
  const msg = f.kind === "persist" ? formatCodedError(f.failure) : formatCodedErrors(f.errors);
  showToastError(msg || "Chain event failure", f, { source: "setup/chain-events.store" });
}

function SetupChainEventsPage() {
  const libStore = useMemo(() => {
    const storage =
      typeof window !== "undefined" && window.localStorage ? window.localStorage : memoryStorage();

    return createFunctionLibraryStore({ storage, onFailure: reportLibFailure });
  }, []);
  const ceStore = useMemo(() => {
    const storage =
      typeof window !== "undefined" && window.localStorage ? window.localStorage : memoryStorage();

    return createChainEventStoreHandle({ storage, onFailure: reportCeFailure });
  }, []);

  const library = useSyncExternalStore(
    libStore.subscribe,
    libStore.getSnapshot,
    libStore.getSnapshot,
  );
  const events = useSyncExternalStore(ceStore.subscribe, ceStore.getSnapshot, ceStore.getSnapshot);

  // Rule pool: flatten every rule across every ruleset so operators can pick
  // a target for beforeRule/afterRule. Kept read-only.
  const rulesets = useProjectStore((s) => s.rulesets);
  const rulePool = useMemo(() => {
    interface ChainEventOption {
      id: string;
      label: string;
    }

    const out: ChainEventOption[] = [];
    for (const rs of Object.values(rulesets)) {
      for (const r of rs.rules) {
        out.push({ id: r.id, label: `${rs.name} / ${r.name ?? r.id}` });
      }
    }

    return out;
  }, [rulesets]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedId && events.events.some((e) => e.id === selectedId) === false) {
      setSelectedId(null);
    }
  }, [events.events, selectedId]);

  const selected = selectedId ? (events.events.find((e) => e.id === selectedId) ?? null) : null;
  const integrity = useMemo(() => checkChainEventIntegrity(events, library), [events, library]);
  const danglingIds = useMemo(() => new Set(integrity.map((i) => i.eventId)), [integrity]);

  function createNew() {
    const now = Date.now();
    const id = `ce-${now.toString(36)}`;
    const first = library.entries[0];

    if (!first) {
      showToastError(
        "Add a function in /setup/functions before authoring chain events.",
        undefined,
        {
          source: "setup/chain-events.createNew",
        },
      );

      return;
    }

    const ev: ChainEvent = {
      id,
      trigger: ChainEventTriggerType.BeforeRuleset,
      functionId: first.id,
      enabled: true,
      order: events.events.length,
    };

    if (ceStore.upsert(ev)) setSelectedId(id);
  }

  function patch(next: Partial<ChainEvent>) {
    if (!selected) return;
    const merged: ChainEvent = { ...selected, ...next };
    // Guard: ruleId is only meaningful for rule-scoped triggers.
    if (merged.trigger !== "beforeRule" && merged.trigger !== "afterRule") {
      delete merged.ruleId;
    }

    ceStore.upsert(merged);
  }

  function remove(id: string) {
    if (ceStore.remove(id) && selectedId === id) setSelectedId(null);
  }

  const sorted = useMemo(() => {
    const byTrigger = new Map<string, ChainEvent[]>();
    byTrigger.set("beforeRuleset", resolveEventsForRuleset(events, "beforeRuleset"));
    byTrigger.set("afterRuleset", resolveEventsForRuleset(events, "afterRuleset"));
    const perRule = new Map<string, ChainEvent[]>();
    for (const ev of events.events) {
      if ((ev.trigger === "beforeRule" || ev.trigger === "afterRule") && ev.ruleId) {
        const key = `${ev.trigger}:${ev.ruleId}`;

        if (perRule.has(key) === false) {
          perRule.set(key, resolveEventsForRule(events, ev.trigger, ev.ruleId));
        }
      }
    }

    return { byTrigger, perRule };
  }, [events]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-hmi-1 border-b border-ca-border bg-ca-panel-2 px-hmi-4 py-hmi-2">
        <h1 className="text-hmi-header text-ca-ink">Chain events</h1>
        <p className="text-hmi-caption text-ca-ink-muted">
          Bind functions to ruleset / per-rule triggers. {events.events.length} event
          {events.events.length === 1 ? "" : "s"} bound.
          {integrity.length > 0 ? (
            <span className="ml-hmi-2 inline-flex items-center gap-hmi-1 text-ca-ng">
              <AlertTriangle size={12} aria-hidden />
              {integrity.length} dangling
            </span>
          ) : null}
        </p>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="flex w-80 flex-col border-r border-ca-border bg-ca-panel-2">
          <div className="flex items-center gap-hmi-1 border-b border-ca-border p-hmi-2">
            <button
              type="button"
              onClick={createNew}
              className="inline-flex items-center gap-hmi-1 border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:border-ca-select"
            >
              <Plus size={14} aria-hidden /> New
            </button>
            <span className="ml-auto text-hmi-caption text-ca-ink-muted">
              {library.entries.length} fn
            </span>
          </div>
          <ul className="flex-1 overflow-auto">
            {events.events.length === 0 ? (
              <li className="p-hmi-3 text-hmi-caption text-ca-ink-muted">
                No chain events yet. Click New to bind one.
              </li>
            ) : (
              events.events.map((ev) => {
                const fn = library.entries.find((e) => e.id === ev.functionId);
                const dangling = danglingIds.has(ev.id);

                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(ev.id)}
                      className={`flex w-full flex-col items-start gap-0.5 border-b border-ca-border p-hmi-2 text-left hover:bg-ca-bg ${
                        selectedId === ev.id ? "bg-ca-bg" : ""
                      }`}
                    >
                      <span className="flex w-full items-center justify-between gap-hmi-1">
                        <span className="truncate text-hmi-body text-ca-ink">
                          {ev.trigger}
                          {ev.ruleId ? ` @ ${ev.ruleId}` : ""}
                        </span>
                        {!ev.enabled ? (
                          <span className="font-hmi-mono text-hmi-caption text-ca-ink-muted">
                            off
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`truncate font-hmi-mono text-hmi-caption ${
                          dangling ? "text-ca-ng" : "text-ca-ink-muted"
                        }`}
                      >
                        {fn?.name ?? `missing:${ev.functionId}`} · order {ev.order}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>
        <main className="flex flex-1 flex-col overflow-auto p-hmi-3">
          {selected ? (
            <div className="flex flex-1 flex-col gap-hmi-3">
              <div className="grid grid-cols-2 gap-hmi-2">
                <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
                  <span>Trigger</span>
                  <select
                    value={selected.trigger}
                    onChange={(e) => patch({ trigger: e.target.value as ChainEventTrigger })}
                    className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
                  >
                    <option value="beforeRuleset">beforeRuleset</option>
                    <option value="afterRuleset">afterRuleset</option>
                    <option value="beforeRule">beforeRule</option>
                    <option value="afterRule">afterRule</option>
                  </select>
                </label>
                <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
                  <span>Function</span>
                  <select
                    value={selected.functionId}
                    onChange={(e) => patch({ functionId: e.target.value })}
                    className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
                  >
                    {library.entries.length === 0 ? (
                      <option value="">(no functions)</option>
                    ) : (
                      library.entries.map((fn) => (
                        <option key={fn.id} value={fn.id}>
                          {fn.name} ({fn.id})
                        </option>
                      ))
                    )}
                  </select>
                </label>
                {(selected.trigger === "beforeRule" || selected.trigger === "afterRule") && (
                  <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
                    <span>Rule</span>
                    <select
                      value={selected.ruleId ?? ""}
                      onChange={(e) => patch({ ruleId: e.target.value || undefined })}
                      className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
                    >
                      <option value="">(pick a rule)</option>
                      {rulePool.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label} ({r.id})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
                  <span>Order</span>
                  <input
                    type="number"
                    value={selected.order}
                    onChange={(e) => patch({ order: Number(e.target.value) })}
                    className="bg-ca-bg border border-ca-border p-hmi-1 text-ca-ink"
                  />
                </label>
                <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
                  <input
                    type="checkbox"
                    checked={selected.enabled}
                    onChange={(e) => patch({ enabled: e.target.checked })}
                  />
                  <span>Enabled</span>
                </label>
              </div>

              {danglingIds.has(selected.id) ? (
                <div
                  role="alert"
                  className="border border-ca-ng bg-ca-bg p-hmi-2 text-hmi-caption text-ca-ng"
                >
                  Function id `{selected.functionId}` is not in the library. Add it in
                  /setup/functions or pick a different function.
                </div>
              ) : null}

              <div className="flex items-center justify-between border-t border-ca-border pt-hmi-2 text-hmi-caption text-ca-ink-muted">
                <span className="font-hmi-mono">id: {selected.id}</span>
                <button
                  type="button"
                  onClick={() => remove(selected.id)}
                  className="inline-flex items-center gap-hmi-1 border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 text-ca-ink hover:border-ca-ng hover:text-ca-ng"
                >
                  <Trash2 size={14} aria-hidden /> Delete
                </button>
              </div>

              <section
                aria-label="Execution preview"
                className="flex flex-col gap-hmi-2 border-t border-ca-border pt-hmi-2"
              >
                <h2 className="text-hmi-header text-ca-ink">Execution preview</h2>
                {(["beforeRuleset", "afterRuleset"] as const).map((t) => {
                  const list = sorted.byTrigger.get(t) ?? [];

                  return (
                    <div key={t}>
                      <p className="text-hmi-caption text-ca-ink-muted">{t}</p>
                      <ol className="ml-hmi-3 list-decimal font-hmi-mono text-hmi-caption text-ca-ink">
                        {list.length === 0 ? (
                          <li className="list-none text-ca-ink-muted">(none)</li>
                        ) : (
                          list.map((ev) => {
                            const fn = library.entries.find((e) => e.id === ev.functionId);

                            return <li key={ev.id}>{fn?.name ?? `missing:${ev.functionId}`}</li>;
                          })
                        )}
                      </ol>
                    </div>
                  );
                })}
                {[...sorted.perRule.entries()].map(([key, list]) => (
                  <div key={key}>
                    <p className="text-hmi-caption text-ca-ink-muted">{key}</p>
                    <ol className="ml-hmi-3 list-decimal font-hmi-mono text-hmi-caption text-ca-ink">
                      {list.map((ev) => {
                        const fn = library.entries.find((e) => e.id === ev.functionId);

                        return <li key={ev.id}>{fn?.name ?? `missing:${ev.functionId}`}</li>;
                      })}
                    </ol>
                  </div>
                ))}
              </section>
            </div>
          ) : (
            <div className="m-auto text-hmi-caption text-ca-ink-muted">
              Select an event on the left, or click New.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
