import { ClientLogger } from "@/lib/observability/client-logger";
import { ErrorExportFormatType } from "@/lib/errors/export";
// Plan 83 backlog #26 follow-up: dedicated Error History drawer surfaced via
// Ctrl/Cmd+Shift+E. Distinct from the Global Error Modal so users can browse
// the full session error log without losing the currently focused error, then
// click any row to escalate that entry into the modal for full diagnostics.
//
// Kept intentionally lightweight: reuses the shared error store and export
// helper, no new persistence or transport.
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Search } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useErrorStore } from "@/lib/stores/errorStore";
import { downloadErrorHistory } from "@/lib/errors/export";
import { useSeededEmptyState, useSeededErrorScenarios } from "@/lib/seed/useSeededSurfaces";

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ErrorHistoryDrawer() {
  const isOpen = useErrorStore((s) => s.isHistoryDrawerOpen);
  const closeDrawer = useErrorStore((s) => s.closeHistoryDrawer);
  const openErrorModal = useErrorStore((s) => s.openErrorModal);
  const clearHistory = useErrorStore((s) => s.clearHistory);
  const history = useErrorStore((s) => s.history);
  const seededEmpty = useSeededEmptyState("errors.drawer");
  const seededScenarios = useSeededErrorScenarios();

  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("all");
  // Plan 87 Step 14: grouping toggle. "none" preserves the flat chronological
  // list; "code" collapses runs of the same error code so a burst of 20
  // identical failures reads as one row with a count badge.
  const [groupBy, setGroupBy] = useState<"none" | "code">("none");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return history.filter((e) => {
      if (level !== "all" && e.level !== level) return false;

      if (!q) return true;

      return (
        e.message.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.correlationId.toLowerCase().includes(q)
      );
    });
  }, [history, query, level]);

  const groups = useMemo(() => {
    if (groupBy !== "code") return [];
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const key = e.code || "E_UNKNOWN";
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }

    // Sort by most recent entry desc so hottest bursts float to the top.
    return Array.from(map.entries())
      .map(([code, rows]) => ({ code, rows }))
      .sort((a, b) => {
        const at = a.rows[0]?.createdAt ?? "";
        const bt = b.rows[0]?.createdAt ?? "";

        return bt.localeCompare(at);
      });
  }, [filtered, groupBy]);

  const toggleGroup = (code: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);

      if (next.has(code)) next.delete(code);
      else next.add(code);
      ClientLogger.info(
        `[error-history] group ${next.has(code) ? "collapsed" : "expanded"} code=${code}`,
      );

      return next;
    });
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) closeDrawer();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col gap-3"
        aria-label="Error history"
      >
        <SheetHeader>
          <SheetTitle>Error history</SheetTitle>
          <SheetDescription>
            Past errors captured in this session. Select one to open its full details.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search message, code, correlation id..."
              className="h-8 pl-7 text-xs"
              aria-label="Search error history"
            />
          </div>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="h-8 w-[110px] text-xs" aria-label="Filter by severity">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "none" | "code")}>
            <SelectTrigger
              className="h-8 w-[110px] text-xs"
              aria-label="Group errors"
              data-testid="error-history-group-by"
            >
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="code">Group by code</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {filtered.length === history.length
              ? `${history.length} ${history.length === 1 ? "error" : "errors"}`
              : `${filtered.length} of ${history.length}`}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => downloadErrorHistory(filtered, ErrorExportFormatType.Json)}
              className="text-xs gap-1"
              disabled={filtered.length === 0}
              title="Download filtered error history as JSON"
            >
              <Download className="h-3 w-3" aria-hidden />
              JSON
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-xs"
              disabled={history.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {history.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {seededEmpty?.title ?? "No errors have been captured this session."}
              </p>
              {seededEmpty?.body ? (
                <p className="text-xs text-muted-foreground">{seededEmpty.body}</p>
              ) : null}
              {seededScenarios.length > 0 ? (
                <div className="mt-4 text-left">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 px-1">
                    Example error scenarios
                  </p>
                  <ul className="divide-y divide-border rounded-md border">
                    {seededScenarios.map((s) => (
                      <li key={s.id} className="px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono">{s.code}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {s.severity ?? "info"}
                          </span>
                        </div>
                        <div className="text-muted-foreground truncate">{s.message}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No errors match the current filters.
            </p>
          ) : groupBy === "code" ? (
            <ul
              className="divide-y divide-border rounded-md border"
              data-testid="error-history-groups"
            >
              {groups.map(({ code, rows }) => {
                const isCollapsed = collapsed.has(code);
                const latest = rows[0];

                return (
                  <li key={code}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(code)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 focus:bg-muted/60 outline-none flex items-center gap-2"
                      aria-expanded={!isCollapsed}
                      data-testid={`error-history-group-${code}`}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3" aria-hidden />
                      ) : (
                        <ChevronDown className="h-3 w-3" aria-hidden />
                      )}
                      <span className="font-mono flex-1">{code}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                        {rows.length}
                      </span>
                      {latest ? (
                        <span className="text-muted-foreground text-[10px]">
                          {formatTimestamp(latest.createdAt)}
                        </span>
                      ) : null}
                    </button>
                    {!isCollapsed ? (
                      <ul className="bg-muted/20">
                        {rows.map((e) => (
                          <li key={e.id}>
                            <button
                              type="button"
                              onClick={() => {
                                closeDrawer();
                                openErrorModal(e);
                              }}
                              className="w-full text-left pl-8 pr-3 py-1.5 text-xs hover:bg-muted/60 focus:bg-muted/60 outline-none"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] uppercase text-muted-foreground">
                                  {e.correlationId}
                                </span>
                                <span className="text-muted-foreground text-[10px]">
                                  {formatTimestamp(e.createdAt)}
                                </span>
                              </div>
                              <div className="truncate">{e.message}</div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-border rounded-md border">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      closeDrawer();
                      openErrorModal(e);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 focus:bg-muted/60 outline-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono">{e.code}</span>
                      <span className="text-muted-foreground flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase">{e.correlationId}</span>
                        <span>{formatTimestamp(e.createdAt)}</span>
                      </span>
                    </div>
                    <div className="truncate">{e.message}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
