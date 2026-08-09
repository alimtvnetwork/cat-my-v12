import { RuleAuditSourceType } from "@/lib/rules/audit-store";
import { SectionIdType } from "@/components/nav/SectionTopBar";
// Plan 79 step 22. V4 rule library list.
//
// This surface renders Rules only. Categories are edited on the separate
// `/setup/categories` surface, even though both row types share the same
// facade storage. All errors surface with correlation
// ids per spec 21/40 - never swallowed, never a symptom patch.
//
// The legacy project-scoped ruleset UI moved out of this route on Plan 79
// step 22. Project-owned rule attachment lives at
// `/projects/$projectId/rulesets` (unchanged) and per-project rule chain
// editing arrives with steps 41-42.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronRight,
  Copy,
  FolderOpen,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { SectionTopBar } from "@/components/nav/SectionTopBar";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import {
  RuleCycleError,
  RuleReferencedError,
  BuiltinCategoryError,
  RuleValidationError,
  UNCATEGORIZED_RULE_ID,
  type Rule,
  type RuleId,
} from "@/lib/rules/model";
import { showToastError } from "@/lib/errors/notify";
import { RuleCreateDialog, type RuleCreateSubmit } from "@/components/rules/RuleCreateDialog";
import { RulePreviewThumbnail } from "@/components/rules/RulePreviewThumbnail";
import { EmptyState } from "@/components/common/EmptyState";
import { recordRuleToggle } from "@/lib/rules/audit-store";
import { toIntId } from "@/lib/rules/rule-id-alias";

export enum SortKindType {
  Name = "name",
  Deps = "deps",
}
export type SortKind = SortKindType;
export enum StatusFilterType {
  Any = "any",
  Enabled = "enabled",
  Disabled = "disabled",
}
export type StatusFilter = StatusFilterType;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-select focus-visible:ring-offset-2 focus-visible:ring-offset-ca-panel";
const CHIP_BASE = `inline-flex items-center gap-hmi-2 rounded-sm border px-hmi-3 py-hmi-1 text-hmi-body transition-colors ${FOCUS_RING}`;
const BUTTON_PRIMARY = `inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition-opacity hover:opacity-90 ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-60`;
const BUTTON_SECONDARY = `inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-ink transition-colors hover:border-ca-select hover:bg-ca-panel-2 ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-60`;
const ROW_DELETE = `inline-flex h-7 w-7 items-center justify-center rounded-sm text-ca-ink-muted transition-colors hover:bg-ca-panel-2 hover:text-ca-danger ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-30`;

export const Route = createFileRoute("/setup/rules")({
  staticData: { crumb: "Rules" },
  validateSearch: (search: Record<string, unknown>) => {
    const s = search?.status;
    const status: StatusFilter | undefined =
      s === StatusFilterType.Enabled ||
      s === StatusFilterType.Disabled ||
      s === StatusFilterType.Any
        ? (s as StatusFilter)
        : undefined;

    return status ? { status } : {};
  },
  head: () => ({
    meta: [
      { title: "Rules, Setup" },
      {
        name: "description",
        content:
          "Browse and edit shared inspection rules. Category management has its own setup surface.",
      },
    ],
  }),
  component: SetupRulesPage,
});

function newRuleId(): RuleId {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `rule-${raw}` as RuleId;
}

function nowIso(): string {
  return new Date().toISOString();
}

function reportFacadeError(op: string, err: unknown): void {
  if (err instanceof RuleCycleError) {
    // Route cycles through the error store so the Global Error Modal
    // and History reflect the E_RULE_CYCLE event, plus a sonner toast
    // with a "View Details" action.
    showToastError(`Rule cycle rejected: ${err.path.map(String).join(" -> ")}`, err, {
      source: "setup.rules",
      method: op,
    });
    console.error(`[setup.rules] ${op}`, err);

    return;
  }

  if (err instanceof RuleReferencedError) {
    showToastError(`Cannot delete: referenced by ${err.referrers.rules.length} rule(s).`, err, {
      source: "setup.rules",
      method: op,
    });
    console.error(`[setup.rules] ${op}`, err);

    return;
  }

  if (err instanceof BuiltinCategoryError) {
    showToastError("Built-in category cannot be deleted.", err, {
      source: "setup.rules",
      method: op,
    });
    console.error(`[setup.rules] ${op}`, err);

    return;
  }

  if (err instanceof RuleValidationError) {
    showToastError(`Rule failed validation (${err.issues.length} issue).`, err, {
      source: "setup.rules",
      method: op,
    });
    console.error(`[setup.rules] ${op}`, err.issues);

    return;
  }

  showToastError(`Rules operation failed: ${op}`, err, { method: op });
}

function SetupRulesPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const initialStatus = Route.useSearch({ select: (s) => s.status }) as StatusFilter | undefined;
  const library = useRulesLibrary();
  const { all, save, remove } = library;
  const rules = useMemo(() => library.all.filter((row) => row.isCategory !== true), [library.all]);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKind>(SortKindType.Name);
  const [status, setStatus] = useState<StatusFilter>(initialStatus ?? StatusFilterType.Any);
  const [creating, setCreating] = useState(false);
  const [dialog, setDialog] = useState<
    null | { mode: "create" } | { mode: "duplicate"; source: Rule }
  >(null);
  const [hydrated, setHydrated] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Plan 83 backlog item 11 (search polish): '/' focuses the search field
  // from anywhere on this page. Skipped when the user is already typing
  // in an input / textarea / contenteditable so we do not steal '/' from
  // a rename or a modal. Escape inside the search box clears the query
  // and blurs; the clear-x button below does the same on click.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent): void {
      if (e.key !== "/") return;

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;

      if (target) {
        const tag = target.tagName;

        if (tag === HtmlTag.Input || tag === HtmlTag.Textarea || tag === HtmlTag.Select) return;

        if (target.isContentEditable) return;
      }

      const el = searchRef.current;

      if (!el) return;
      e.preventDefault();
      el.focus();
      el.select();
      console.info("[setup.rules search] focus via '/'");
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // Facade hydration fires on subscribe; wait one tick so E2E has a
    // deterministic sentinel to await before clicking rows.
    const t = setTimeout(() => setHydrated(true), 0);

    return () => clearTimeout(t);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? rules.filter((r) => r.name.toLowerCase().includes(q)) : rules;
    // Status filter honours the `enabled` flag. This route has already
    // removed categories, so each row here is a real inspection rule.
    const statusFiltered = filtered.filter((r) => {
      if (status === "any") return true;

      if (status === "enabled") return r.enabled !== false;

      return r.enabled === false;
    });
    const arr = [...statusFiltered];

    if (sort === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      arr.sort(
        (a, b) => b.appliesBefore.length - a.appliesBefore.length || a.name.localeCompare(b.name),
      );
    }

    return arr;
  }, [rules, query, sort, status]);

  const disabledCount = useMemo(() => rules.filter((r) => r.enabled === false).length, [rules]);

  // Plan 83 backlog 11e. Bulk enable/disable across the current filter.
  // Selection is IMPLICIT: the target set is `visible` restricted to
  // non-categories (categories cannot be toggled). This piggy-backs on
  // the existing status/kind/search filters instead of introducing a
  // parallel checkbox model that would require restructuring the row
  // `Link` and its keyboard/context-menu wiring. Every save flows through
  // the same facade seam as the inline toggle; errors surface via
  // `reportFacadeError` (no swallowing, correlation ids preserved).
  const visibleRules = visible;
  const visibleEnableableCount = useMemo(
    () => visibleRules.filter((r) => r.enabled === false).length,
    [visibleRules],
  );
  const visibleDisableableCount = useMemo(
    () => visibleRules.filter((r) => r.enabled !== false).length,
    [visibleRules],
  );
  const [bulkBusy, setBulkBusy] = useState(false);

  async function bulkSetEnabled(nextEnabled: boolean): Promise<void> {
    if (bulkBusy) return;
    const targets = visibleRules.filter((r) =>
      nextEnabled ? r.enabled === false : r.enabled !== false,
    );

    if (targets.length === 0) return;
    const label = nextEnabled ? "enable" : "disable";
    const confirmMsg =
      targets.length === 1
        ? `${nextEnabled ? "Enable" : "Disable"} "${targets[0].name}"?`
        : `${nextEnabled ? "Enable" : "Disable"} ${targets.length} rules?`;

    if (window.confirm(confirmMsg) === false) return;
    setBulkBusy(true);
    const now = new Date().toISOString();
    let successCount = 0;
    let failureCount = 0;
    // Plan 83 backlog 14. Capture the pre-toggle `enabled` value per row
    // so an Undo can restore the exact prior state, including rules that
    // were already at `nextEnabled` (there shouldn't be any because we
    // pre-filter, but we record the observed value we saved from rather
    // than assuming the inverse of `nextEnabled`).
    interface UndoEntry {
      id: RuleId;
      prev: boolean | undefined;
    }

    const undoEntries: UndoEntry[] = [];
    console.info("[setup.rules] bulk-toggle start", {
      action: label,
      count: targets.length,
    });
    // Serialize saves so facade cycle/reference validation sees a
    // consistent view; a parallel Promise.all would race the shared
    // in-memory index inside the facade.
    for (const row of targets) {
      try {
        await save({ ...row, enabled: nextEnabled, updatedAt: now });
        successCount += 1;
        undoEntries.push({ id: row.id, prev: row.enabled });
        recordRuleToggle({
          ruleId: row.id,
          ruleName: row.name,
          prev: row.enabled,
          next: nextEnabled,
          source: RuleAuditSourceType.Bulk,
        });
      } catch (err) {
        failureCount += 1;
        reportFacadeError(`bulk-${label}`, err);
      }
    }

    console.info("[setup.rules] bulk-toggle done", {
      action: label,
      ok: successCount,
      failed: failureCount,
    });
    // Plan 83 backlog 14. Undo is only offered when at least one save
    // succeeded; failed rows never mutated, so there is nothing to
    // rewind for them. The undo action re-serializes through the same
    // facade seam and logs its own start/done pair, so audit trails
    // (backlog 13, future) capture the rewind explicitly.
    async function undoBulk(): Promise<void> {
      if (undoEntries.length === 0) return;
      const undoNow = new Date().toISOString();
      let undoOk = 0;
      let undoFailed = 0;
      console.info("[setup.rules] bulk-toggle undo start", {
        action: label,
        count: undoEntries.length,
      });
      for (const entry of undoEntries) {
        const current = rules.find((r) => r.id === entry.id);

        if (!current) {
          undoFailed += 1;
          continue;
        }

        try {
          await save({ ...current, enabled: entry.prev, updatedAt: undoNow });
          undoOk += 1;
          recordRuleToggle({
            ruleId: current.id,
            ruleName: current.name,
            prev: current.enabled,
            next: entry.prev,
            source: RuleAuditSourceType.BulkUndo,
          });
        } catch (err) {
          undoFailed += 1;
          reportFacadeError(`bulk-${label}-undo`, err);
        }
      }

      console.info("[setup.rules] bulk-toggle undo done", {
        action: label,
        ok: undoOk,
        failed: undoFailed,
      });

      if (undoFailed === 0) {
        toast.success(`Reverted ${undoOk} rule${undoOk === 1 ? "" : "s"}.`);
      } else {
        toast.error(`Reverted ${undoOk}, ${undoFailed} failed. See Error History.`);
      }
    }

    const undoAction =
      successCount > 0 ? { label: "Undo", onClick: () => void undoBulk() } : undefined;

    if (failureCount === 0) {
      toast.success(
        `${nextEnabled ? "Enabled" : "Disabled"} ${successCount} rule${successCount === 1 ? "" : "s"}.`,
        undoAction ? { action: undoAction, duration: 8000 } : undefined,
      );
    } else if (successCount > 0) {
      toast.error(
        `${nextEnabled ? "Enabled" : "Disabled"} ${successCount}, ${failureCount} failed. See Error History.`,
        undoAction ? { action: undoAction, duration: 10000 } : undefined,
      );
    }

    setBulkBusy(false);
  }

  async function submitCreate(payload: RuleCreateSubmit): Promise<void> {
    if (creating) return;
    setCreating(true);
    const dupSource = dialog?.mode === "duplicate" ? dialog.source : null;
    const draft: Rule = {
      id: newRuleId(),
      name: payload.name,
      isCategory: false,
      // Plan 83 backlog item 12: preserve the source rule's chain and
      // conditions on duplicate so the copy is a working starting point
      // instead of an empty shell. `appliesBefore` is deliberately kept
      // (references are still valid IDs) but callers may prune it later
      // in the editor.
      appliesBefore: dupSource ? [...dupSource.appliesBefore] : [],
      conditions: dupSource ? dupSource.conditions.map((c) => ({ ...c })) : [],
      pocketSize: payload.pocketSize,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    try {
      const saved = await save(draft);
      toast.success(dupSource ? `Rule duplicated: ${saved.name}` : `Rule created: ${saved.name}`);
      const id = String(toIntId(String(saved.id)));
      void navigate({ to: "/setup/rules/$id", params: { id } });
    } catch (err) {
      reportFacadeError(`${dupSource ? "duplicate" : "create"}-rule`, err);

      throw err;
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(row: Rule): Promise<void> {
    if (row.id === UNCATEGORIZED_RULE_ID) return;

    if (window.confirm(`Delete rule "${row.name}"? This cannot be undone.`) === false) return;
    try {
      await remove(row.id);
      toast.success(`Rule deleted: ${row.name}`);
    } catch (err) {
      reportFacadeError("delete-rule", err);
    }
  }

  // Plan 83 backlog item 12: Duplicate now opens the shared 2-col
  // RuleCreateDialog in duplicate mode. Operators can review / rename
  // the copy before it lands in the library, which prevents accidental
  // "(copy)"-suffix clutter and lets duplicate-name validation fire in
  // the same modal used for create.
  function handleDuplicate(row: Rule): void {
    setDialog({
      mode: "duplicate",
      source: row,
    });
  }

  // Plan 83 backlog item 11c. Inline enable/disable toggle for rules.
  // Missing `enabled` == enabled per model.ts convention, so the first
  // toggle from an unwritten row flips to explicit `false`. Errors surface
  // through the same reporter used by save/remove; no swallowing.
  async function handleToggleEnabled(row: Rule): Promise<void> {
    const nextEnabled = row.enabled === false;
    const now = new Date().toISOString();
    try {
      await save({ ...row, enabled: nextEnabled, updatedAt: now });
      console.info("[setup.rules] toggle-enabled", {
        id: row.id,
        enabled: nextEnabled,
      });
      recordRuleToggle({
        ruleId: row.id,
        ruleName: row.name,
        prev: row.enabled,
        next: nextEnabled,
        source: RuleAuditSourceType.Single,
      });
    } catch (err) {
      reportFacadeError("toggle-enabled", err);
    }
  }

  if (pathname !== "/setup/rules") {
    return <Outlet />;
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-ca-bg text-ca-ink"
      data-hydrated={hydrated ? "true" : "false"}
    >
      <SectionTopBar section={SectionIdType.Home} active="setup" />
      <div className="border-b border-ca-border bg-ca-panel px-hmi-4 py-hmi-3">
        <div className="flex flex-wrap items-center justify-between gap-hmi-3">
          <div className="min-w-0">
            <h1 className="text-hmi-h2 font-semibold text-ca-ink">Rules</h1>
            <p className="text-hmi-body text-ca-ink-muted">
              Shared rule library. Categories are managed separately.
            </p>
          </div>
          <div className="flex items-center gap-hmi-2">
            <Link
              to="/setup/categories"
              preload="intent"
              className={BUTTON_SECONDARY}
              data-testid="setup-rules-manage-categories"
            >
              <FolderOpen size={14} aria-hidden />
              Manage Categories
            </Link>
            <button
              type="button"
              className={BUTTON_PRIMARY}
              onClick={() => setDialog({ mode: "create" })}
              disabled={creating}
              data-testid="setup-rules-new-rule"
            >
              <Plus size={14} aria-hidden />
              New Rule
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-hmi-3 border-b border-ca-border bg-ca-panel-2 px-hmi-4 py-hmi-2">
        <div
          className={`${CHIP_BASE} border-ca-select bg-ca-panel text-ca-ink shadow-hmi-panel`}
          data-testid="setup-rules-count-chip"
        >
          <Sparkles size={12} aria-hidden />
          Rules ({rules.length})
        </div>
        <label className="ml-auto flex min-w-[220px] items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink focus-within:border-ca-select">
          <Search size={12} aria-hidden className="text-ca-ink-muted" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search by name  (press / )"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (KeyboardKeyType.isEscape(e.key) && query) {
                e.preventDefault();
                setQuery("");
              }
            }}
            className="w-full bg-transparent text-hmi-body text-ca-ink outline-none placeholder:text-ca-ink-muted"
            aria-label="Search rules by name"
            data-testid="setup-rules-search"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              data-testid="setup-rules-search-clear"
              className={`inline-flex h-5 w-5 items-center justify-center rounded-sm text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink ${FOCUS_RING}`}
            >
              <X size={12} aria-hidden />
            </button>
          ) : null}
        </label>
        <label className="flex items-center gap-hmi-2 text-hmi-caption text-ca-ink-muted">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKind)}
            className="rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
            aria-label="Sort rules"
            data-testid="setup-rules-sort"
          >
            <option value="name">Name (A-Z)</option>
            <option value="deps">Dependencies (most first)</option>
          </select>
        </label>
        <label className="flex items-center gap-hmi-2 text-hmi-caption text-ca-ink-muted">
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
            aria-label="Filter rules by enabled status"
            data-testid="setup-rules-status"
          >
            <option value="any">Any ({rules.length})</option>
            <option value="enabled">Enabled only ({rules.length - disabledCount})</option>
            <option value="disabled">Disabled only ({disabledCount})</option>
          </select>
        </label>
      </div>

      {visibleRules.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-hmi-3 border-b border-ca-border bg-ca-panel px-hmi-4 py-hmi-1 text-hmi-caption text-ca-ink-muted"
          data-testid="setup-rules-bulk-bar"
        >
          <span>
            Bulk actions on {visibleRules.length} visible rule
            {visibleRules.length === 1 ? "" : "s"}{" "}
            <span className="text-ca-ink-muted/70">
              ({visibleEnableableCount} disabled, {visibleDisableableCount} enabled)
            </span>
          </span>
          <div className="ml-auto flex items-center gap-hmi-2">
            <button
              type="button"
              onClick={() => void bulkSetEnabled(true)}
              disabled={bulkBusy || visibleEnableableCount === 0}
              data-testid="setup-rules-bulk-enable"
              title={
                visibleEnableableCount === 0
                  ? "No disabled rules in the current view"
                  : `Enable ${visibleEnableableCount} rule(s)`
              }
              className={`${CHIP_BASE} border-ca-border bg-ca-panel-2 text-ca-ink hover:border-ca-select disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Power size={12} aria-hidden />
              Enable {visibleEnableableCount || ""}
            </button>
            <button
              type="button"
              onClick={() => void bulkSetEnabled(false)}
              disabled={bulkBusy || visibleDisableableCount === 0}
              data-testid="setup-rules-bulk-disable"
              title={
                visibleDisableableCount === 0
                  ? "No enabled rules in the current view"
                  : `Disable ${visibleDisableableCount} rule(s)`
              }
              className={`${CHIP_BASE} border-ca-border bg-ca-panel-2 text-ca-ink hover:border-ca-select disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <PowerOff size={12} aria-hidden />
              Disable {visibleDisableableCount || ""}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {visible.length === 0 ? (
          <EmptyState
            icon={query ? Search : Sparkles}
            title={query ? `No rules match "${query}"` : "No rules yet"}
            description={
              query
                ? "Try clearing the search or switching the filter."
                : "Create a rule here, or manage categories from the separate category screen."
            }
            actions={
              query
                ? [
                    {
                      label: "Clear search",
                      variant: "secondary",
                      onClick: () => setQuery(""),
                      testId: "setup-rules-empty-clear",
                    },
                  ]
                : [
                    {
                      label: "New Rule",
                      onClick: () => setDialog({ mode: "create" }),
                      testId: "setup-rules-empty-new-rule",
                    },
                    {
                      label: "Manage Categories",
                      variant: "secondary",
                      onClick: () => void navigate({ to: "/setup/categories" }),
                      testId: "setup-rules-empty-manage-categories",
                    },
                  ]
            }
            testId="setup-rules-empty"
          />
        ) : (
          <ul className="divide-y divide-ca-border" data-testid="setup-rules-list">
            {visible.map((row) => (
              <RuleRow
                key={row.id}
                row={row}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onToggleEnabled={handleToggleEnabled}
              />
            ))}
          </ul>
        )}
      </div>

      <RuleCreateDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        onSubmit={submitCreate}
        existingNames={all.map((r) => r.name)}
        initialKind="Rule"
        kindMode="rule"
        sourceName={dialog?.mode === "duplicate" ? dialog.source.name : undefined}
        sourceConditions={dialog?.mode === "duplicate" ? dialog.source.conditions : undefined}
      />
    </div>
  );
}

import { RuleKindBadge } from "@/components/rules/RuleKindBadge";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { HtmlTag } from "@/lib/enums/html";

interface RuleRowProps {
  row: Rule;
  onDelete: (row: Rule) => Promise<void>;
  onDuplicate: (row: Rule) => void;
  onToggleEnabled: (row: Rule) => Promise<void>;
}

function RuleRow({ row, onDelete, onDuplicate, onToggleEnabled }: RuleRowProps): ReactElement {
  const builtin = row.id === UNCATEGORIZED_RULE_ID;
  const id = String(toIntId(String(row.id)));
  // Missing == enabled by contract in model.ts (Plan 83 backlog 11c).
  const enabled = row.enabled !== false;
  const target = { to: "/setup/rules/$id" as const, params: { id } };
  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const navigate = useNavigate();
  // Plan 100 step 38. Anchors natively activate on Enter but not on
  // Space. The Rules list is a keyboard-primary surface (V4 §17), so
  // add Space -> navigate. Guard against key events originating from
  // nested interactives (delete button) via target check.
  const onKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (KeyboardKeyType.isSpace(e.key) === false && e.key !== "Spacebar") return;

    if (e.currentTarget !== e.target) return;
    e.preventDefault();
    void navigate(target).catch((err) => {
      console.error("[setup.rules row] Space nav failed", { id, err });
    });
  };

  return (
    <li className="relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            {...target}
            preload="intent"
            className={`flex items-center gap-hmi-3 px-hmi-4 py-hmi-2 text-ca-ink hover:bg-ca-panel-2 ${
              enabled ? "" : "opacity-60"
            } ${FOCUS_RING}`}
            data-testid="setup-rules-row-link"
            data-kind="rule"
            data-enabled={enabled ? "true" : "false"}
            onKeyDown={onKeyDown}
          >
            <RulePreviewThumbnail rule={row} />
            <RuleKindBadge rule={row} />
            <span className="min-w-0 flex-1 truncate text-hmi-body">
              {row.name}
              {!enabled ? (
                <span
                  className="ml-hmi-2 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ca-ink-muted"
                  data-testid="setup-rules-row-disabled-badge"
                >
                  Disabled
                </span>
              ) : null}
            </span>
            <span
              className="inline-flex shrink-0 items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 font-mono text-[13px] tabular-nums text-ca-ink-muted"
              title={`Applies before ${row.appliesBefore.length} rule(s)`}
            >
              <ArrowRight size={11} aria-hidden />
              {row.appliesBefore.length}
            </span>
            {row.pocketSize ? (
              <span className="shrink-0 rounded-sm border border-ca-border px-hmi-2 py-0.5 font-mono text-[11px] tabular-nums text-ca-ink-muted">
                P{row.pocketSize}
              </span>
            ) : null}
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? "Disable" : "Enable"} rule ${row.name}`}
              data-testid="setup-rules-row-enable-toggle"
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-ca-panel-2 ${
                enabled ? "text-ca-select" : "text-ca-ink-muted"
              } ${FOCUS_RING}`}
              onClick={(e) => {
                stop(e);
                void onToggleEnabled(row);
              }}
              onKeyDown={(e) => {
                // Prevent the outer Space -> navigate handler from swallowing
                // the toggle activation. Enter/Space here means "toggle".
                if (KeyboardKeyType.isEnterOrSpace(e.key)) e.stopPropagation();
              }}
              title={enabled ? "Disable rule" : "Enable rule"}
            >
              {enabled ? <Power size={14} aria-hidden /> : <PowerOff size={14} aria-hidden />}
            </button>
            <button
              type="button"
              className={ROW_DELETE}
              onClick={(e) => {
                stop(e);
                void onDelete(row);
              }}
              aria-label={`Delete rule ${row.name}`}
              disabled={builtin}
              title={builtin ? "Built-in category cannot be deleted" : undefined}
            >
              <Trash2 size={14} aria-hidden />
            </button>
            <ChevronRight size={14} aria-hidden className="shrink-0 text-ca-ink-muted" />
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent data-testid={`setup-rules-row-menu-${id}`}>
          <ContextMenuItem asChild>
            <Link {...target} preload="intent" data-testid="setup-rules-row-menu-open">
              <Pencil size={12} aria-hidden className="mr-2" />
              Open editor
            </Link>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => void onDuplicate(row)}
            data-testid="setup-rules-row-menu-duplicate"
          >
            <Copy size={12} aria-hidden className="mr-2" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => void onToggleEnabled(row)}
            data-testid="setup-rules-row-menu-toggle-enabled"
          >
            {enabled ? (
              <PowerOff size={12} aria-hidden className="mr-2" />
            ) : (
              <Power size={12} aria-hidden className="mr-2" />
            )}
            {enabled ? "Disable rule" : "Enable rule"}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={builtin}
            onSelect={() => void onDelete(row)}
            data-testid="setup-rules-row-menu-delete"
            className="text-ca-danger focus:text-ca-danger"
          >
            <Trash2 size={12} aria-hidden className="mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </li>
  );
}
