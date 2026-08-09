// Seed reset run history panel. Combines the bounded success history
// (`useSeedTelemetryStore.history`) with the structured fatal-reseed
// ring (`fatalHistory`) so operators can see, per run: status
// (OK/FAIL), correlation id (fatal runs), and the key `fatalError`
// details (message, cause, mode, failed seeders, duration).
import { useMemo } from "react";
import { useSeedTelemetryStore, type FatalReseedEvent } from "@/lib/seed/telemetry-store";
import type { SeedRunReport } from "@/lib/seed/orchestrator";

export function SeedResetHistorySection() {
  const history = useSeedTelemetryStore((s) => s.history);
  const fatalHistory = useSeedTelemetryStore((s) => s.fatalHistory);
  const counters = useSeedTelemetryStore((s) => s.fatalCounters);

  const successRuns = useMemo(() => history.filter((r) => r.ok && !r.fatalError), [history]);

  const isEmpty = history.length === 0 && fatalHistory.length === 0;

  return (
    <section
      className="border border-ca-border bg-ca-panel p-hmi-3"
      aria-label="Seed reset run history"
      data-testid="diagnostics-seed-history"
    >
      <div className="mb-hmi-2 flex items-center justify-between gap-hmi-3">
        <h2 className="text-hmi-body font-bold uppercase tracking-wide">
          Seed reset history ({history.length} run{history.length === 1 ? "" : "s"},{" "}
          {fatalHistory.length} fatal)
        </h2>
        <span
          className="text-hmi-caption text-ca-ink-muted hmi-tabular"
          title="Fatal reseed counters since page load"
        >
          total fatal: {counters.total} (auto {counters.byMode.auto} / reset {counters.byMode.reset}
          )
        </span>
      </div>

      {isEmpty ? (
        <p className="text-hmi-caption text-ca-ink-muted">
          No seed.reset runs recorded in this browser yet.
        </p>
      ) : (
        <div className="grid gap-hmi-3">
          <FatalList events={fatalHistory} />
          <SuccessList runs={successRuns} />
        </div>
      )}
    </section>
  );
}

function FatalList({ events }: { events: readonly FatalReseedEvent[] }) {
  if (events.length === 0) {
    return (
      <div>
        <h3 className="mb-hmi-1 text-hmi-caption font-bold uppercase tracking-wide text-ca-ink-muted">
          Fatal runs (0)
        </h3>
        <p className="text-hmi-caption text-ca-ink-muted">
          No fatal reseed events. Any orchestrator throw, seeder error, or reset-flags failure lands
          here with a correlation id.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-hmi-1 text-hmi-caption font-bold uppercase tracking-wide text-ca-ng">
        Fatal runs ({events.length})
      </h3>
      <ul className="grid gap-hmi-1">
        {events.map((e) => (
          <FatalRow key={e.id} event={e} />
        ))}
      </ul>
    </div>
  );
}

function FatalRow({ event }: { event: FatalReseedEvent }) {
  const when = new Date(event.timestamp).toISOString();

  return (
    <li
      className="grid gap-hmi-1 border border-ca-ng/60 bg-ca-ng/10 p-hmi-2 text-hmi-caption"
      data-testid="diagnostics-seed-history-fatal-row"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-hmi-2">
        <span className="inline-flex items-center gap-hmi-1">
          <span className="border border-ca-ng px-hmi-1 py-0.5 font-mono uppercase text-ca-ng">
            FAIL
          </span>
          <span className="font-mono uppercase text-ca-ink-muted">{event.mode}</span>
          <span className="font-mono uppercase text-ca-ink-muted">{event.cause}</span>
        </span>
        <span className="hmi-tabular text-ca-ink-muted" title={when}>
          {when.slice(11, 19)}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-hmi-2">
        <span className="text-ca-ink-muted">id</span>
        <code className="font-mono text-ca-ink" data-testid="diagnostics-seed-history-event-id">
          {event.id}
        </code>
        {event.correlationId ? (
          <>
            <span className="text-ca-ink-muted">correlation</span>
            <code
              className="font-mono text-ca-ink"
              data-testid="diagnostics-seed-history-correlation-id"
              title="Matches the Global Error Modal correlation id"
            >
              {event.correlationId}
            </code>
          </>
        ) : null}
        {event.totalMs !== null ? (
          <span className="hmi-tabular text-ca-ink-muted">{event.totalMs.toFixed(0)} ms</span>
        ) : null}
      </div>
      <div className="text-ca-ink">
        <span className="text-ca-ink-muted">error</span>{" "}
        <code className="font-mono">
          {event.error.name ? `${event.error.name}: ` : ""}
          {event.error.message}
        </code>
      </div>
      {event.failedSeeders.length > 0 ? (
        <div className="flex flex-wrap items-baseline gap-hmi-1">
          <span className="text-ca-ink-muted">failed seeders</span>
          {event.failedSeeders.map((n) => (
            <span
              key={n}
              className="border border-ca-warn/60 px-hmi-1 py-0.5 font-mono text-ca-warn"
            >
              {n}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  );
}

function SuccessList({ runs }: { runs: readonly SeedRunReport[] }) {
  if (runs.length === 0) {
    return (
      <div>
        <h3 className="mb-hmi-1 text-hmi-caption font-bold uppercase tracking-wide text-ca-ink-muted">
          Successful runs (0)
        </h3>
        <p className="text-hmi-caption text-ca-ink-muted">
          No fully successful reseed runs recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-hmi-1 text-hmi-caption font-bold uppercase tracking-wide text-ca-ok">
        Successful runs ({runs.length})
      </h3>
      <ul className="grid gap-hmi-1">
        {runs.map((r, i) => {
          const seeded = r.results.reduce((n, x) => n + (x.status === "seeded" ? 1 : 0), 0);
          const skipped = r.results.reduce((n, x) => n + (x.status === "skipped" ? 1 : 0), 0);

          return (
            <li
              key={i}
              className="flex flex-wrap items-baseline gap-hmi-2 border-b border-ca-border/60 py-1 text-hmi-caption"
              data-testid="diagnostics-seed-history-success-row"
            >
              <span className="border border-ca-ok px-hmi-1 py-0.5 font-mono uppercase text-ca-ok">
                OK
              </span>
              <span className="hmi-tabular text-ca-ink-muted">{r.totalMs.toFixed(0)} ms</span>
              <span className="text-ca-ink">
                {seeded} seeded / {skipped} skipped / 0 errored
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
