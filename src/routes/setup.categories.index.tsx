import { SectionIdType } from "@/components/nav/SectionTopBar";
import { useMemo, useRef, useState, type ReactElement, type MouseEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronRight,
  Copy,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionTopBar } from "@/components/nav/SectionTopBar";
import { RuleCreateDialog, type RuleCreateSubmit } from "@/components/rules/RuleCreateDialog";
import { RulePreviewThumbnail } from "@/components/rules/RulePreviewThumbnail";
import { showToastError } from "@/lib/errors/notify";
import { UNCATEGORIZED_RULE_ID, type Rule, type RuleId } from "@/lib/rules/model";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";

export enum SortKindType {
  Name = "name",
  Deps = "deps",
}
export type SortKind = SortKindType;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-select focus-visible:ring-offset-2 focus-visible:ring-offset-ca-panel";
const CHIP_BASE = `inline-flex items-center gap-hmi-2 rounded-sm border px-hmi-3 py-hmi-1 text-hmi-body transition-colors ${FOCUS_RING}`;
const BUTTON_PRIMARY = `inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition-opacity hover:opacity-90 ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-60`;
const BUTTON_SECONDARY = `inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-ink transition-colors hover:border-ca-select hover:bg-ca-panel-2 ${FOCUS_RING}`;
const ROW_DELETE = `inline-flex h-7 w-7 items-center justify-center rounded-sm text-ca-ink-muted transition-colors hover:bg-ca-panel-2 hover:text-ca-danger ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-30`;

export const Route = createFileRoute("/setup/categories/")({
  staticData: { crumb: "Categories" },
  head: () => ({
    meta: [
      { title: "Categories, Setup" },
      {
        name: "description",
        content: "Manage shared rule categories separately from the rule editing list.",
      },
    ],
  }),
  component: SetupCategoriesPage,
});

function newCategoryId(): RuleId {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `cat-${raw}` as RuleId;
}

function nowIso(): string {
  return new Date().toISOString();
}

function reportCategoryError(op: string, err: unknown): void {
  showToastError(`Category operation failed: ${op}`, err, { method: op });
  console.error(`[setup.categories] ${op}`, err);
}

function SetupCategoriesPage(): ReactElement {
  const { all, categories, save, remove } = useRulesLibrary();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKind>(SortKindType.Name);
  const [creating, setCreating] = useState(false);
  const [dialog, setDialog] = useState<
    null | { mode: "create" } | { mode: "duplicate"; source: Rule }
  >(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories;
    const rows = [...filtered];

    if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
    else
      rows.sort(
        (a, b) => b.appliesBefore.length - a.appliesBefore.length || a.name.localeCompare(b.name),
      );

    return rows;
  }, [categories, query, sort]);

  async function submitCreate(payload: RuleCreateSubmit): Promise<void> {
    if (creating) return;
    setCreating(true);
    const source = dialog?.mode === "duplicate" ? dialog.source : null;
    const draft: Rule = {
      id: newCategoryId(),
      name: payload.name,
      isCategory: true,
      notes: source?.notes,
      appliesBefore: source ? [...source.appliesBefore] : [],
      conditions: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    try {
      const saved = await save(draft);
      toast.success(
        source ? `Category duplicated: ${saved.name}` : `Category created: ${saved.name}`,
      );
      void navigate({ to: "/setup/categories/$id", params: { id: String(saved.id) } });
    } catch (err) {
      reportCategoryError(source ? "duplicate-category" : "create-category", err);

      throw err;
    } finally {
      setCreating(false);
    }
  }

  async function deleteCategory(row: Rule): Promise<void> {
    if (row.id === UNCATEGORIZED_RULE_ID) return;

    if (window.confirm(`Delete category "${row.name}"? This cannot be undone.`) === false) return;
    try {
      await remove(row.id);
      toast.success(`Category deleted: ${row.name}`);
    } catch (err) {
      reportCategoryError("delete-category", err);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ca-bg text-ca-ink">
      <SectionTopBar section={SectionIdType.Home} active="setup" />
      <div className="border-b border-ca-border bg-ca-panel px-hmi-4 py-hmi-3">
        <div className="flex flex-wrap items-center justify-between gap-hmi-3">
          <div className="min-w-0">
            <h1 className="text-hmi-h2 font-semibold text-ca-ink">Categories</h1>
            <p className="text-hmi-body text-ca-ink-muted">
              Manage category rows here. The Rules page shows rules only.
            </p>
          </div>
          <div className="flex items-center gap-hmi-2">
            <Link
              to="/setup/rules"
              preload="intent"
              className={BUTTON_SECONDARY}
              data-testid="setup-categories-back-rules"
            >
              <ChevronRight size={14} aria-hidden className="rotate-180" />
              Rules
            </Link>
            <button
              type="button"
              className={BUTTON_PRIMARY}
              onClick={() => setDialog({ mode: "create" })}
              disabled={creating}
              data-testid="setup-categories-new-category"
            >
              <Plus size={14} aria-hidden />
              New Category
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-hmi-3 border-b border-ca-border bg-ca-panel-2 px-hmi-4 py-hmi-2">
        <div
          className={`${CHIP_BASE} border-ca-select bg-ca-panel text-ca-ink shadow-hmi-panel`}
          data-testid="setup-categories-count-chip"
        >
          <FolderOpen size={12} aria-hidden />
          Categories ({categories.length})
        </div>
        <label className="ml-auto flex min-w-[220px] items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink focus-within:border-ca-select">
          <Search size={12} aria-hidden className="text-ca-ink-muted" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search categories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-hmi-body text-ca-ink outline-none placeholder:text-ca-ink-muted"
            aria-label="Search categories by name"
            data-testid="setup-categories-search"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              data-testid="setup-categories-search-clear"
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
            aria-label="Sort categories"
            data-testid="setup-categories-sort"
          >
            <option value="name">Name (A-Z)</option>
            <option value="deps">Dependencies (most first)</option>
          </select>
        </label>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {visible.length === 0 ? (
          <EmptyState
            icon={query ? Search : FolderOpen}
            title={query ? `No categories match "${query}"` : "No categories yet"}
            description={
              query
                ? "Clear the search to see all categories."
                : "Create a category, then attach rules to it from the rule editor."
            }
            actions={
              query
                ? [
                    {
                      label: "Clear search",
                      variant: "secondary",
                      onClick: () => setQuery(""),
                      testId: "setup-categories-empty-clear",
                    },
                  ]
                : [
                    {
                      label: "New Category",
                      onClick: () => setDialog({ mode: "create" }),
                      testId: "setup-categories-empty-new",
                    },
                  ]
            }
            testId="setup-categories-empty"
          />
        ) : (
          <ul className="divide-y divide-ca-border" data-testid="setup-categories-list">
            {visible.map((row) => (
              <CategoryRow
                key={row.id}
                row={row}
                onDuplicate={(source) => setDialog({ mode: "duplicate", source })}
                onDelete={deleteCategory}
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
        initialKind="Category"
        kindMode="category"
        sourceName={dialog?.mode === "duplicate" ? dialog.source.name : undefined}
      />
    </div>
  );
}

function CategoryRow({
  row,
  onDuplicate,
  onDelete,
}: {
  row: Rule;
  onDuplicate: (row: Rule) => void;
  onDelete: (row: Rule) => Promise<void>;
}): ReactElement {
  const builtin = row.id === UNCATEGORIZED_RULE_ID;
  const target = { to: "/setup/categories/$id" as const, params: { id: String(row.id) } };
  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <li className="relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            {...target}
            preload="intent"
            className={`flex items-center gap-hmi-3 px-hmi-4 py-hmi-2 text-ca-ink hover:bg-ca-panel-2 ${FOCUS_RING}`}
            data-testid="setup-categories-row-link"
          >
            <RulePreviewThumbnail rule={row} />
            <span className="inline-flex h-5 min-w-[72px] shrink-0 items-center justify-center rounded-sm bg-ca-panel-2 px-hmi-2 text-[11px] font-semibold uppercase tracking-wide text-ca-chrome-ink">
              Category
            </span>
            <span className="min-w-0 flex-1 truncate text-hmi-body">{row.name}</span>
            {builtin ? (
              <span className="shrink-0 rounded-sm border border-ca-border px-hmi-2 py-0.5 text-[11px] uppercase tracking-wide text-ca-ink-muted">
                Built-in
              </span>
            ) : null}
            <span
              className="inline-flex shrink-0 items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 font-mono text-[13px] tabular-nums text-ca-ink-muted"
              title={`Applies before ${row.appliesBefore.length} rule(s)`}
            >
              <ArrowRight size={11} aria-hidden />
              {row.appliesBefore.length}
            </span>
            <button
              type="button"
              className={ROW_DELETE}
              onClick={(e) => {
                stop(e);
                void onDelete(row);
              }}
              aria-label={`Delete category ${row.name}`}
              disabled={builtin}
              title={builtin ? "Built-in category cannot be deleted" : undefined}
            >
              <Trash2 size={14} aria-hidden />
            </button>
            <ChevronRight size={14} aria-hidden className="shrink-0 text-ca-ink-muted" />
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent data-testid={`setup-categories-row-menu-${String(row.id)}`}>
          <ContextMenuItem asChild>
            <Link {...target} preload="intent" data-testid="setup-categories-row-menu-open">
              <Pencil size={12} aria-hidden className="mr-2" />
              Open editor
            </Link>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => onDuplicate(row)}
            data-testid="setup-categories-row-menu-duplicate"
          >
            <Copy size={12} aria-hidden className="mr-2" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={builtin}
            onSelect={() => void onDelete(row)}
            data-testid="setup-categories-row-menu-delete"
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
