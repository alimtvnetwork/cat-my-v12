import { EmptyStateActionVariantType } from "@/components/common/EmptyState";
import { CommandIdType } from "@/lib/command-bus";
import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
import { SectionIdType } from "@/components/nav/SectionTopBar";
// Projects list route (Plan 34, steps 8 + 9). Shows all persisted projects
// and a Create dialog that calls `createProject` then navigates to
// `/projects/$projectId`.
import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FolderPlus,
  FolderOpen,
  Search,
  Sparkles,
  X,
  Upload,
  Pencil,
  Copy,
  Trash2,
  Play,
} from "lucide-react";
import { HmiShell } from "@/components/hmi";
import { SectionTopBar } from "@/components/nav/SectionTopBar";
import { useProjectStore } from "@/lib/projects/store";
import { useServerFn } from "@tanstack/react-start";
import { runProject } from "@/lib/run-project.functions";
import { StorageKey } from "@/lib/constants";
import { onCommand } from "@/lib/command-bus";
import { parseProjectExport } from "@/lib/export-project";
import { createFacadeStateStorage } from "@/lib/projects/facade";
import { EmptyState } from "@/components/common/EmptyState";
import { ProjectsIllustration } from "@/components/common/EmptyStateIllustrations";
import { SkeletonLine } from "@/components/ui/skeleton-primitives";
import { useSeededEmptyState } from "@/lib/seed/useSeededSurfaces";
import { useSeededEmptyStateAction } from "@/lib/seed/useSeededEmptyStateAction";
import { toIntParam } from "@/lib/ids/int-alias";

function useProjectStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState<boolean>(
    () => useProjectStore.persist?.hasHydrated?.() ?? true,
  );
  useEffect(() => {
    const persistApi = useProjectStore.persist;

    if (!persistApi) return;

    if (persistApi.hasHydrated()) {
      setHydrated(true);

      return;
    }

    const unsub = persistApi.onFinishHydration(() => setHydrated(true));

    return () => unsub();
  }, []);

  return hydrated;
}

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects, Control Automation" },
      {
        name: "description",
        content:
          "Create a new project or open an existing one. Projects contain rule sets, trial runs and AI testing.",
      },
      { property: "og:title", content: "Projects, Control Automation" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content: "Manage inspection projects in the Control Automation HMI.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsIndex,
});

export enum SortKeyType {
  Createddesc = "createdDesc",
  Createdasc = "createdAsc",
  Nameasc = "nameAsc",
  Namedesc = "nameDesc",
}
export type SortKey = SortKeyType;
type Prefs = { sort: SortKey; query: string };
const DEFAULT_PREFS: Prefs = { sort: SortKeyType.Createddesc, query: "" };

function parsePrefs(raw: string | null): Prefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const p = JSON.parse(raw) as Partial<Prefs>;

    return {
      sort: (["createdDesc", "createdAsc", "nameAsc", "nameDesc"] as SortKey[]).includes(
        p.sort as SortKey,
      )
        ? (p.sort as SortKey)
        : DEFAULT_PREFS.sort,
      query: typeof p.query === "string" ? p.query : "",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

// Plan 81: list-prefs read/write goes through the ProjectRepository
// facade so the /projects screen has a single seam like every other
// UI store. The facade adapter handles one-shot legacy-key migration
// internally, so this route never touches raw browser storage.
async function loadPrefs(): Promise<Prefs> {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    // createFacadeStateStorage migrates legacy payloads once behind
    // the seam, so this route only speaks to the facade.
    const raw = await createFacadeStateStorage().getItem(StorageKey.ProjectsListPrefs);

    return parsePrefs(raw);
  } catch {
    return DEFAULT_PREFS;
  }
}

function ProjectsIndex() {
  const hydrated = useProjectStoreHydrated();
  const projects = useProjectStore((s) => s.projects);
  const createProject = useProjectStore((s) => s.createProject);
  const importProjectBundle = useProjectStore((s) => s.importProjectBundle);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const navigate = useNavigate();
  const runProjectFn = useServerFn(runProject);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  // Plan 79 step 40: per-row action state.
  const [renameFor, setRenameFor] = useState<{ id: string; name: string } | null>(null);
  const [deleteFor, setDeleteFor] = useState<{ id: string; name: string } | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  // Plan 64 step 72: optional New Project attachments (camera / rulesets / categories).
  const [cameraName, setCameraName] = useState("");
  const [rulesetNamesRaw, setRulesetNamesRaw] = useState("");
  const [categoryNamesRaw, setCategoryNamesRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);

  // Plan 64 step 93: Command Palette "New Project" opens the create dialog.
  useEffect(() => {
    return onCommand(CommandIdType.CmdNewProject, () => {
      setDialogOpen(true);
      setError(null);
    });
  }, []);

  // SSR-safe: initial state is the default (matches server HTML). Hydrate
  // stored prefs post-mount to avoid a hydration mismatch on the sort/filter
  // controls (same class of bug as preview-mode-store.ts).
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  useEffect(() => {
    let isCancelled = false;
    loadPrefs().then((next) => {
      if (isCancelled) return;
      setPrefs(next);
      setPrefsHydrated(true);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const isPrefsUnhydrated = !prefsHydrated;

  useEffect(() => {
    if (isPrefsUnhydrated) return;
    void Promise.resolve(
      createFacadeStateStorage().setItem(StorageKey.ProjectsListPrefs, JSON.stringify(prefs)),
    ).catch(() => {
      /* ignore write failures; prefs are non-critical */
    });
  }, [prefs, prefsHydrated]);

  const list = useMemo(() => {
    const all = Object.values(projects);
    const q = prefs.query.trim().toLowerCase();
    const filtered = q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all;
    const sorted = [...filtered];
    switch (prefs.sort) {
      case "createdAsc":
        sorted.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "nameAsc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "nameDesc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "createdDesc":
      default:
        sorted.sort((a, b) => b.createdAt - a.createdAt);
    }

    return sorted;
  }, [projects, prefs]);

  const totalCount = Object.keys(projects).length;

  async function handleImportFile(file: File) {
    setImportErr(null);
    try {
      const text = await file.text();
      const format =
        file.name.toLowerCase().endsWith(".yaml") || file.name.toLowerCase().endsWith(".yml")
          ? "yaml"
          : "json";
      const parsed = parseProjectExport(text, format);
      const newId = importProjectBundle(parsed);
      console.info("[projects/index] imported", { newId, file: file.name });
      await navigate({ to: "/projects/$projectId", params: { projectId: newId } });
    } catch (e) {
      console.error("[projects/index] import failed", e);
      setImportErr(e instanceof Error ? e.message : String(e));
    }
  }

  function openDialog() {
    setName("");
    setCameraName("");
    setRulesetNamesRaw("");
    setCategoryNamesRaw("");
    setError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (submitting) return;
    setDialogOpen(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setError("Name is required.");

      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const rulesetNames = rulesetNamesRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const categoryNames = categoryNamesRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const projectId = createProject(trimmed, {
        cameraName: cameraName.trim() || undefined,
        rulesetNames,
        categoryNames,
      });
      console.info("[projects/new] created", {
        projectId,
        name: trimmed,
        rulesetCount: rulesetNames.length,
        categoryCount: categoryNames.length,
        cameraName: cameraName.trim() || null,
      });
      setDialogOpen(false);
      await navigate({ to: "/projects/$projectId", params: { projectId } });
    } catch (err) {
      console.error("[projects/new] create failed", err);
      setError(err instanceof Error ? err.message : "Could not create project.");
    } finally {
      setSubmitting(false);
    }
  }

  const showEmpty = hydrated && totalCount === 0;
  const showNoMatch = hydrated && totalCount > 0 && list.length === 0;
  const seededEmpty = useSeededEmptyState("projects.list");
  const seededAction = useSeededEmptyStateAction("projects.list");

  async function handleDuplicate(id: string): Promise<void> {
    setRowError(null);
    setRowBusyId(id);
    try {
      const newProjectId = duplicateProject(id);

      if (!newProjectId) throw new Error("Project not found");
      console.info("[projects/index] duplicated", { fromId: id, newId: newProjectId });
      await navigate({ to: "/projects/$projectId", params: { projectId: newProjectId } });
    } catch (err) {
      console.error("[projects/index] duplicate failed", err);
      setRowError(err instanceof Error ? err.message : String(err));
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleRun(id: string): Promise<void> {
    setRowError(null);
    setRowBusyId(id);
    try {
      const proj = projects[id];

      if (!proj) throw new Error("Project not found");
      const res = await runProjectFn({
        data: { projectId: id, rulesetIds: proj.rulesetIds },
      });
      console.info("[projects/index] run queued", { id, res });
      await navigate({ to: "/projects/$projectId/runs", params: { projectId: id } });
    } catch (err) {
      console.error("[projects/index] run failed", err);
      setRowError(err instanceof Error ? err.message : String(err));
    } finally {
      setRowBusyId(null);
    }
  }

  function commitRename(): void {
    if (!renameFor) return;
    const trimmed = renameFor.name.trim();

    if (trimmed.length === 0) {
      setRowError("Name is required.");

      return;
    }

    renameProject(renameFor.id, trimmed);
    console.info("[projects/index] renamed", { id: renameFor.id, name: trimmed });
    setRenameFor(null);
  }

  function commitDelete(): void {
    if (!deleteFor) return;
    deleteProject(deleteFor.id);
    console.info("[projects/index] deleted", { id: deleteFor.id });
    setDeleteFor(null);
  }

  return (
    <HmiShell title="Projects">
      <SectionTopBar section={SectionIdType.Home} active="projects" />
      <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-6">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-hmi-4 flex flex-wrap items-center justify-between gap-hmi-3 border-b border-ca-border pb-hmi-3">
            <div className="min-w-0 flex items-baseline gap-hmi-3">
              <h1 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                Projects
              </h1>
              <span className="text-hmi-caption tabular-nums text-ca-ink-muted">
                {hydrated ? `${list.length} / ${totalCount}` : "\u00A0"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-hmi-2">
              <label
                className="inline-flex shrink-0 cursor-pointer items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2/80 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:-translate-y-px hover:border-ca-select hover:bg-ca-panel-2 focus-within:outline focus-within:outline-2 focus-within:outline-ca-focus"
                aria-label="Import project from JSON or YAML"
              >
                <Upload aria-hidden size={16} />
                Import project
                <input
                  type="file"
                  accept=".json,.yaml,.yml,application/json,application/yaml"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0];

                    if (f) void handleImportFile(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={openDialog}
                className="inline-flex shrink-0 items-center gap-hmi-2 rounded-md bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--color-ca-select)_60%,transparent)] transition hover:-translate-y-px hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
              >
                <FolderPlus aria-hidden size={18} />
                Create project
              </button>
            </div>
          </header>

          {importErr ? (
            <p role="alert" className="mb-hmi-3 text-hmi-caption text-ca-ng">
              Import failed: {importErr}
            </p>
          ) : null}

          <div className="mb-hmi-4 flex flex-col gap-hmi-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative flex-1 sm:max-w-sm">
              <Search
                aria-hidden
                size={16}
                className="pointer-events-none absolute left-hmi-3 top-1/2 -translate-y-1/2 text-ca-ink-muted"
              />
              <input
                type="search"
                value={prefs.query}
                onChange={(e) => setPrefs((p) => ({ ...p, query: e.target.value }))}
                placeholder="Filter by name"
                aria-label="Filter projects by name"
                disabled={!hydrated || totalCount === 0}
                className="w-full rounded-sm border border-ca-border bg-ca-panel-2 py-hmi-2 pl-9 pr-hmi-3 text-hmi-body text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none disabled:opacity-50"
              />
            </label>
            <label className="flex items-center gap-hmi-2 text-hmi-caption text-ca-ink-muted">
              Sort
              <select
                value={prefs.sort}
                onChange={(e) => setPrefs((p) => ({ ...p, sort: e.target.value as SortKey }))}
                aria-label="Sort projects"
                disabled={!hydrated || totalCount === 0}
                className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none disabled:opacity-50"
              >
                <option value="createdDesc">Newest first</option>
                <option value="createdAsc">Oldest first</option>
                <option value="nameAsc">Name (A-Z)</option>
                <option value="nameDesc">Name (Z-A)</option>
              </select>
            </label>
          </div>

          {!hydrated ? (
            <ul
              role="status"
              aria-live="polite"
              aria-label="Loading projects"
              className="grid grid-cols-1 gap-hmi-3 md:grid-cols-2 xl:grid-cols-3"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <li
                  key={i}
                  className="flex flex-col rounded-lg border border-ca-border bg-ca-panel p-hmi-4 shadow-hmi-panel"
                  aria-hidden
                >
                  <SkeletonLine
                    width="66%"
                    height="calc(var(--text-hmi-header-size,1.25rem)*1.2)"
                  />
                  <SkeletonLine
                    className="mt-hmi-2"
                    width="33%"
                    height="var(--spacing-hmi-3, 0.75rem)"
                  />
                  <SkeletonLine
                    className="mt-hmi-1"
                    width="50%"
                    height="var(--spacing-hmi-3, 0.75rem)"
                  />
                </li>
              ))}
            </ul>
          ) : showEmpty ? (
            <EmptyState
              icon={FolderOpen}
              illustration={<ProjectsIllustration />}
              title={seededEmpty?.title ?? "No projects yet"}
              description={
                seededEmpty?.body ??
                "Create your first project to hold rule sets, trial runs and AI testing results."
              }
              actions={[
                ...(seededAction.cta
                  ? [
                      {
                        label: seededAction.cta.label,
                        onClick: seededAction.cta.onClick,
                        testId: seededAction.cta.testId,
                        variant: EmptyStateActionVariantType.Secondary as const,
                      },
                    ]
                  : []),
                {
                  label: "Create project",
                  onClick: openDialog,
                  testId: "projects-empty-create",
                  variant: EmptyStateActionVariantType.Primary,
                },
              ]}
              testId="projects-empty"
              className="rounded-lg border border-dashed border-ca-border bg-ca-panel"
            />
          ) : showNoMatch ? (
            <EmptyState
              title="No matches"
              description={`No projects match "${prefs.query}". Try a different filter.`}
              actions={[
                {
                  label: "Clear filter",
                  onClick: () => setPrefs((p) => ({ ...p, query: "" })),
                  testId: "projects-nomatch-clear",
                  variant: EmptyStateActionVariantType.Secondary,
                },
              ]}
              testId="projects-nomatch"
              className="rounded-lg border border-dashed border-ca-border bg-ca-panel"
            />
          ) : (
            <>
              {rowError ? (
                <p role="alert" className="mb-hmi-3 text-hmi-caption text-ca-ng">
                  {rowError}
                </p>
              ) : null}
              <ul className="grid grid-cols-1 gap-hmi-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((p) => {
                  const busy = rowBusyId === p.id;
                  const canRun = p.rulesetIds.length > 0 && !busy;
                  const initial = (p.name.trim().charAt(0) || "?").toUpperCase();

                  return (
                    <li
                      key={p.id}
                      className="group relative flex flex-col overflow-hidden rounded-lg border border-ca-border bg-ca-panel p-hmi-4 shadow-hmi-panel transition duration-200 hover:-translate-y-px hover:border-ca-select hover:bg-ca-panel-2/60 hover:shadow-[0_14px_36px_-16px_color-mix(in_oklab,var(--color-ca-select)_60%,transparent)] focus-within:border-ca-select"
                    >
                      {/* Left accent bar: neutral by default, brand on hover / focus-within. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-ca-border transition-colors duration-200 group-hover:bg-ca-select group-focus-within:bg-ca-select"
                      />
                      {/* Corner glow: only visible on hover, matches Home WorkflowCard idiom. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-40"
                        style={{
                          background:
                            "radial-gradient(circle at center, color-mix(in oklab, var(--color-ca-select) 60%, transparent) 0%, transparent 70%)",
                        }}
                      />
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: toIntParam(IntAliasNamespaceType.Project, p.id) }}
                        className="relative flex min-w-0 items-start gap-hmi-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                        aria-label={`Open ${p.name}`}
                      >
                        <div
                          aria-hidden
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-ca-border bg-gradient-to-br from-ca-panel-2 to-ca-select/25 font-display text-hmi-header font-black uppercase tracking-tight text-ca-ink shadow-inner"
                        >
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate font-display text-hmi-header font-black uppercase leading-tight tracking-tight text-ca-ink">
                            {p.name}
                          </h2>
                          <p className="mt-hmi-1 flex items-center gap-hmi-2 text-hmi-caption text-ca-ink-muted">
                            <span className="inline-flex items-center gap-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-[2px] tabular-nums">
                              {p.rulesetIds.length}{" "}
                              {p.rulesetIds.length === 1 ? "rule set" : "rule sets"}
                            </span>
                          </p>
                          <p
                            className="mt-hmi-1 truncate font-mono text-[11px] leading-tight text-ca-ink-muted/80"
                            title={p.id}
                          >
                            {p.id.slice(0, 8)}
                          </p>
                        </div>
                      </Link>
                      <div
                        className="relative mt-hmi-3 flex items-center gap-hmi-1 border-t border-ca-border/60 pt-hmi-3"
                        role="group"
                        aria-label={`Actions for ${p.name}`}
                      >
                        <RowIconButton
                          Icon={Play}
                          label={`Run ${p.name}`}
                          onClick={() => void handleRun(p.id)}
                          disabled={!canRun}
                          tone="primary"
                        />
                        <RowIconButton
                          Icon={Pencil}
                          label={`Rename ${p.name}`}
                          onClick={() => {
                            setRowError(null);
                            setRenameFor({ id: p.id, name: p.name });
                          }}
                          disabled={busy}
                        />
                        <RowIconButton
                          Icon={Copy}
                          label={`Duplicate ${p.name}`}
                          onClick={() => void handleDuplicate(p.id)}
                          disabled={busy}
                        />
                        <RowIconButton
                          Icon={Trash2}
                          label={`Delete ${p.name}`}
                          onClick={() => {
                            setRowError(null);
                            setDeleteFor({ id: p.id, name: p.name });
                          }}
                          disabled={busy}
                          tone="danger"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      {dialogOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ca-bg/70 p-hmi-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={closeDialog}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
            className="relative grid w-full max-w-3xl grid-cols-1 overflow-hidden rounded-xl border border-ca-border bg-ca-panel shadow-hmi-modal md:grid-cols-[minmax(0,1fr)_18rem]"
          >
            <button
              type="button"
              onClick={closeDialog}
              disabled={submitting}
              aria-label="Close"
              className="absolute right-hmi-3 top-hmi-3 z-10 grid h-8 w-8 place-items-center rounded-md text-ca-ink-muted transition hover:bg-ca-panel-2 hover:text-ca-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              <X aria-hidden size={16} />
            </button>

            <div className="p-hmi-6">
              <p className="inline-flex items-center gap-hmi-1 text-hmi-caption uppercase tracking-[0.2em] text-ca-select">
                <Sparkles aria-hidden size={12} />
                New workspace
              </p>
              <h2
                id="create-project-title"
                className="mt-hmi-1 font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink"
              >
                Create a project
              </h2>
              <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
                Projects hold rule sets, trial runs, and AI testing history for one inspection
                target.
              </p>

              <label className="mt-hmi-5 flex flex-col gap-hmi-2 text-hmi-body text-ca-ink">
                <span className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                  Project name
                </span>
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. QFN-2407-A"
                  aria-invalid={error ? true : undefined}
                  className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-3 text-hmi-body text-ca-ink shadow-inner outline-none transition placeholder:text-ca-ink-muted focus:border-ca-select focus:ring-2 focus:ring-ca-select/30"
                />
                <span className="text-hmi-caption text-ca-ink-muted">
                  Use the part number or lot code so it's easy to find later.
                </span>
              </label>
              <label className="mt-hmi-3 flex flex-col gap-hmi-2 text-hmi-body text-ca-ink">
                <span className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                  Camera (optional)
                </span>
                <input
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  placeholder="e.g. Basler ace 2 a2A2590"
                  className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
                />
              </label>
              <label className="mt-hmi-3 flex flex-col gap-hmi-2 text-hmi-body text-ca-ink">
                <span className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                  Rule Sets (comma-separated, optional)
                </span>
                <input
                  value={rulesetNamesRaw}
                  onChange={(e) => setRulesetNamesRaw(e.target.value)}
                  placeholder="e.g. Top, Bottom, Side"
                  className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
                />
              </label>
              <label className="mt-hmi-3 flex flex-col gap-hmi-2 text-hmi-body text-ca-ink">
                <span className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                  Categories (comma-separated, optional)
                </span>
                <input
                  value={categoryNamesRaw}
                  onChange={(e) => setCategoryNamesRaw(e.target.value)}
                  placeholder="e.g. Solder, OCR, Missing"
                  className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
                />
              </label>
              {error ? (
                <p
                  role="alert"
                  className="mt-hmi-3 rounded-md border border-ca-ng/40 bg-ca-ng/10 px-hmi-3 py-hmi-2 text-hmi-caption text-ca-ng"
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-hmi-6 flex justify-end gap-hmi-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={submitting}
                  className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-ink transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || name.trim().length === 0}
                  className="inline-flex items-center gap-hmi-2 rounded-md bg-ca-select px-hmi-5 py-hmi-2 text-hmi-body font-semibold text-ca-bg shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--color-ca-select)_60%,transparent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                >
                  <FolderPlus aria-hidden size={16} />
                  {submitting ? "Creating..." : "Create project"}
                </button>
              </div>
            </div>

            <aside
              aria-hidden
              className="relative hidden overflow-hidden border-l border-ca-border bg-gradient-to-br from-ca-panel-2 via-ca-panel-2 to-ca-select/15 p-hmi-5 md:block"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ca-select/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-ca-select/10 blur-3xl" />
              <p className="text-hmi-caption uppercase tracking-[0.2em] text-ca-ink-muted">
                Preview
              </p>
              <div className="mt-hmi-3 rounded-lg border border-ca-border bg-ca-panel p-hmi-4 shadow-hmi-panel">
                <h3 className="font-display text-hmi-header font-extrabold text-ca-ink">
                  {name.trim() || "Your project"}
                </h3>
                <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">0 rule sets</p>
                <p className="mt-hmi-1 font-mono text-hmi-caption text-ca-ink-muted">
                  proj_...
                  {name.trim() ? name.trim().slice(0, 6).toLowerCase().replace(/\s+/g, "-") : "new"}
                </p>
                <div className="mt-hmi-3 flex items-center gap-hmi-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-ca-select" />
                  <span className="h-1 w-8 rounded-full bg-ca-border" />
                </div>
              </div>
              <ul className="mt-hmi-4 space-y-hmi-2 text-hmi-caption text-ca-ink-muted">
                <li className="flex items-center gap-hmi-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ca-select" />
                  Rule sets and trial runs
                </li>
                <li className="flex items-center gap-hmi-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ca-select" />
                  AI testing history
                </li>
                <li className="flex items-center gap-hmi-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ca-select" />
                  Camera and lighting presets
                </li>
              </ul>
            </aside>
          </form>
        </div>
      ) : null}

      {renameFor ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ca-bg/70 p-hmi-4 backdrop-blur-md"
          onClick={() => setRenameFor(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitRename();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-ca-border bg-ca-panel p-hmi-5 shadow-hmi-modal"
          >
            <h2
              id="rename-project-title"
              className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink"
            >
              Rename project
            </h2>
            <label className="mt-hmi-3 flex flex-col gap-hmi-1 text-hmi-caption text-ca-ink-muted">
              Name
              <input
                autoFocus
                value={renameFor.name}
                onChange={(e) =>
                  setRenameFor((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
              />
            </label>
            <div className="mt-hmi-4 flex justify-end gap-hmi-2">
              <button
                type="button"
                onClick={() => setRenameFor(null)}
                className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hover:border-ca-select"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteFor ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ca-bg/70 p-hmi-4 backdrop-blur-md"
          onClick={() => setDeleteFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-ca-border bg-ca-panel p-hmi-5 shadow-hmi-modal"
          >
            <h2
              id="delete-project-title"
              className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink"
            >
              Delete project?
            </h2>
            <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
              This removes "{deleteFor.name}" and every ruleset it owns from this browser. This
              cannot be undone.
            </p>
            <div className="mt-hmi-4 flex justify-end gap-hmi-2">
              <button
                type="button"
                onClick={() => setDeleteFor(null)}
                className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hover:border-ca-select"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitDelete}
                className="rounded-md bg-ca-ng px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </HmiShell>
  );
}

function RowIconButton({
  Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  Icon: typeof Pencil;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "danger";
}) {
  const base =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-ca-border bg-ca-panel-2 text-ca-ink transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus disabled:cursor-not-allowed disabled:opacity-50";
  const toneCls =
    tone === "primary"
      ? " text-ca-select hover:text-ca-select"
      : tone === "danger"
        ? " text-ca-ng hover:text-ca-ng"
        : "";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={base + toneCls}
    >
      <Icon aria-hidden size={16} />
    </button>
  );
}
