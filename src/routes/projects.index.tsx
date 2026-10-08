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
  Plus,
  Cpu,
} from "lucide-react";
import { HmiShell } from "@/components/hmi";
import { SectionTopBar } from "@/components/nav/SectionTopBar";
import { useProjectStore } from "@/lib/projects/store";
import { useCameraLibrary } from "@/lib/camera/useCameraLibrary";
import { useDeviceStore } from "@/lib/devices/store";
import { AddDeviceModal } from "@/components/devices/AddDeviceModal";
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
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardAppShell } from "@/components/layout/StandardAppShell";

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
  const [deviceId, setDeviceId] = useState("");
  const [rulesetNamesRaw, setRulesetNamesRaw] = useState("");
  const [categoryNamesRaw, setCategoryNamesRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);

  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const devices = useDeviceStore((s) => s.devices);

  const deviceOptions = useMemo(() => {
    return Object.values(devices).map((d) => ({
      id: d.id,
      label: `${d.name} (${d.id}) - ${d.packageType}`,
    }));
  }, [devices]);

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
    navigate({ to: "/projects/new" });
  }

  function closeDialog() {
    if (submitting) return;
    // no-op, as dialogOpen is removed
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
      const standardCategories = [
        "Presence / Absence",
        "Flaw Detection",
        "Count & Measure",
        "ID / OCR",
        "Color & Coating",
      ];
      const categoryNames =
        categoryNamesRaw.trim().length > 0
          ? categoryNamesRaw
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          : standardCategories;
      const projectId = createProject(trimmed, {
        deviceId: deviceId.trim() || undefined,
        cameraName: cameraName.trim() || undefined,
        rulesetNames,
        categoryNames,
      });
      console.info("[projects/new] created", {
        projectId,
        name: trimmed,
        deviceId: deviceId.trim() || null,
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

  const { mode } = useUiMode();

  const mainContent = (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto bg-[#0b0c10] text-ca-ink font-mono antialiased p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#333] pb-4">
          <div className="min-w-0 flex items-baseline gap-4">
            <h1 className="text-xl font-bold uppercase tracking-wider text-ca-ink flex items-center gap-2">
              <Cpu className="text-ca-primary" size={20} />
              Project Database
            </h1>
            <span className="text-xs tracking-widest tabular-nums text-ca-ink-muted">
              {hydrated ? `TOTAL: ${list.length}` : "LOADING..."}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label
              className="inline-flex cursor-pointer items-center gap-2 border border-[#333] bg-[#1a1c23] px-4 py-2 text-xs font-bold uppercase tracking-wider text-ca-ink hover:border-ca-primary transition-colors focus-within:border-ca-primary"
              aria-label="Import project from JSON or YAML"
            >
              <Upload aria-hidden size={14} />
              Import
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
              className="inline-flex items-center gap-2 bg-ca-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-ca-primary-hover transition-colors focus-visible:outline-none"
            >
              <Plus aria-hidden size={16} />
              New Project
            </button>
          </div>
        </header>

        {importErr ? (
          <div className="mb-4 rounded-sm border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-500">
            ERR: {importErr}
          </div>
        ) : null}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#1a1c23] p-3 border border-[#333]">
          <div className="relative flex-1 sm:max-w-md flex items-center">
            <Search
              aria-hidden
              size={14}
              className="absolute left-3 text-ca-ink-muted pointer-events-none"
            />
            <input
              type="search"
              value={prefs.query}
              onChange={(e) => setPrefs((p) => ({ ...p, query: e.target.value }))}
              placeholder="SEARCH PROJECTS..."
              aria-label="Filter projects by name"
              disabled={!hydrated || totalCount === 0}
              className="w-full bg-[#0b0c10] border border-[#333] py-2 pl-9 pr-3 text-xs text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-primary focus:outline-none disabled:opacity-50 uppercase"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-ca-ink-muted uppercase">Sort:</span>
            <select
              value={prefs.sort}
              onChange={(e) => setPrefs((p) => ({ ...p, sort: e.target.value as SortKey }))}
              aria-label="Sort projects"
              disabled={!hydrated || totalCount === 0}
              className="bg-[#0b0c10] border border-[#333] px-3 py-2 text-xs text-ca-ink focus:border-ca-primary focus:outline-none disabled:opacity-50 uppercase appearance-none cursor-pointer"
            >
              <option value="createdDesc">DESC (NEWEST)</option>
              <option value="createdAsc">ASC (OLDEST)</option>
              <option value="nameAsc">ALPHA (A-Z)</option>
              <option value="nameDesc">ALPHA (Z-A)</option>
            </select>
          </div>
        </div>

        {!hydrated ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-[#333] bg-[#1a1c23] p-5 h-32 animate-pulse flex flex-col justify-between">
                 <div className="h-4 bg-[#333] w-2/3"></div>
                 <div className="h-3 bg-[#333] w-1/3"></div>
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#444] bg-[#1a1c23]">
            <FolderOpen size={48} className="text-ca-ink-muted mb-4 opacity-50" />
            <h2 className="text-lg font-bold text-ca-ink uppercase tracking-widest mb-2">DB EMPTY</h2>
            <p className="text-sm text-ca-ink-muted text-center max-w-sm mb-6">
              No inspection projects exist in the current configuration matrix.
            </p>
            <button
              onClick={openDialog}
              className="border border-[#444] bg-transparent px-6 py-2 text-sm font-bold uppercase tracking-wider text-ca-ink hover:border-ca-primary transition-colors"
            >
              INITIALIZE PROJECT
            </button>
          </div>
        ) : showNoMatch ? (
           <div className="flex flex-col items-center justify-center p-12 border border-[#333] bg-[#1a1c23]">
             <span className="text-sm font-bold text-ca-ink-muted uppercase">QUERY_RESULT: 0 MATCHES</span>
           </div>
        ) : (
          <>
            {rowError ? (
              <div className="mb-4 rounded-sm border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-500">
                {rowError}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => {
                const busy = rowBusyId === p.id;
                const canRun = p.rulesetIds.length > 0 && !busy;

                return (
                  <div
                    key={p.id}
                    className="group relative flex flex-col border border-[#333] bg-[#1a1c23] transition-colors hover:border-ca-primary"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#333] transition-colors group-hover:bg-ca-primary" />
                    
                    <div className="p-4 flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          to="/projects/$projectId"
                          params={{ projectId: toIntParam(IntAliasNamespaceType.Project, p.id) }}
                          className="flex-1 min-w-0 pr-4 hover:opacity-80"
                        >
                          <h2 className="truncate text-base font-bold uppercase tracking-wider text-ca-ink">
                            {p.name}
                          </h2>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-ca-ink-muted">ID: {p.id.slice(0, 8)}</span>
                          </div>
                        </Link>
                        {p.deviceId && (
                           <div className="shrink-0 flex items-center justify-center border border-ca-primary/50 bg-ca-primary/10 px-2 py-0.5 text-[10px] text-ca-primary tracking-wider">
                              CAM_LINK
                           </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-wider">
                        <div className="border border-[#444] bg-[#0b0c10] px-2 py-1 text-ca-ink-muted">
                          {p.rulesetIds.length} {p.rulesetIds.length === 1 ? "RULESET" : "RULESETS"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#333] bg-[#0b0c10] px-4 py-2">
                      <div className="flex gap-2">
                         <button
                           title="Rename"
                           onClick={() => { setRowError(null); setRenameFor({ id: p.id, name: p.name }); }}
                           disabled={busy}
                           className="text-ca-ink-muted hover:text-ca-ink transition-colors disabled:opacity-50"
                         >
                           <Pencil size={14} />
                         </button>
                         <button
                           title="Duplicate"
                           onClick={() => void handleDuplicate(p.id)}
                           disabled={busy}
                           className="text-ca-ink-muted hover:text-ca-ink transition-colors disabled:opacity-50"
                         >
                           <Copy size={14} />
                         </button>
                         <button
                           title="Delete"
                           onClick={() => { setRowError(null); setDeleteFor({ id: p.id, name: p.name }); }}
                           disabled={busy}
                           className="text-ca-ink-muted hover:text-red-500 transition-colors disabled:opacity-50"
                         >
                           <Trash2 size={14} />
                         </button>
                      </div>
                      <button
                        onClick={() => void handleRun(p.id)}
                        disabled={!canRun}
                        className="flex items-center gap-2 border border-ca-primary bg-ca-primary/10 px-3 py-1 text-[10px] font-bold text-ca-primary hover:bg-ca-primary hover:text-black transition-colors disabled:opacity-30 disabled:border-[#444] disabled:text-[#444] disabled:bg-transparent"
                      >
                        <Play size={12} className={canRun ? "fill-current" : ""} />
                        EXECUTE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <AddDeviceModal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        onDeviceCreated={(created) => setDeviceId(created.id)}
      />

      {renameFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => { e.preventDefault(); commitRename(); }}
            className="w-full max-w-sm border border-[#444] bg-[#0b0c10] shadow-2xl"
          >
            <div className="border-b border-[#333] bg-[#1a1c23] px-4 py-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-ca-ink">RENAME PROJECT</h2>
            </div>
            <div className="p-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ca-ink-muted mb-2 block">
                NEW NAME
              </label>
              <input
                autoFocus
                value={renameFor.name}
                onChange={(e) => setRenameFor((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                className="w-full border border-[#444] bg-[#1a1c23] px-3 py-2 text-sm text-ca-ink focus:border-ca-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-2 border-t border-[#333] bg-[#1a1c23] p-4">
              <button
                type="button"
                onClick={() => setRenameFor(null)}
                className="flex-1 border border-[#444] px-4 py-2 text-xs font-bold uppercase tracking-wider text-ca-ink hover:bg-[#333]"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="flex-1 bg-ca-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-ca-primary-hover"
              >
                APPLY
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-red-500/50 bg-[#0b0c10] shadow-2xl">
            <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-red-500">DELETE PROJECT?</h2>
            </div>
            <div className="p-4">
              <p className="text-xs text-ca-ink leading-relaxed">
                <span className="font-bold text-red-400">WARNING:</span> This removes "{deleteFor.name}" and every ruleset it owns from this browser. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 border-t border-[#333] bg-[#1a1c23] p-4">
              <button
                type="button"
                onClick={() => setDeleteFor(null)}
                className="flex-1 border border-[#444] px-4 py-2 text-xs font-bold uppercase tracking-wider text-ca-ink hover:bg-[#333]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={commitDelete}
                className="flex-1 bg-red-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-600"
              >
                PURGE
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (mode === UiModeType.Standard) {
    return (
      <StandardAppShell activeNav="projects" title="PROJECTS_DB">
        {mainContent}
      </StandardAppShell>
    );
  }

  return (
    <HmiShell title="Projects">
      <SectionTopBar section={SectionIdType.Home} active="projects" />
      {mainContent}
    </HmiShell>
  );
}
