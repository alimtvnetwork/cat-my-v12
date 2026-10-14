import { EmptyStateActionVariantType } from "@/components/common/EmptyState";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tag, Trash2, FolderPlus, Layers } from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { EmptyState } from "@/components/common/EmptyState";
import { useSeededEmptyStateAction } from "@/lib/seed/useSeededEmptyStateAction";

export const Route = createFileRoute("/projects/$projectId/categories")({
  staticData: { crumb: "Categories" },
  component: ProjectCategoriesTab,
});

function ProjectCategoriesTab() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const addProjectCategory = useProjectStore((s) => s.addProjectCategory);
  const renameProjectCategory = useProjectStore((s) => s.renameProjectCategory);
  const deleteProjectCategory = useProjectStore((s) => s.deleteProjectCategory);
  const updateRulesetCategory = useProjectStore((s) => s.updateRulesetCategory);
  const categories = project?.categoryNames ?? [];
  const [newName, setNewName] = useState("");
  const seeded = useSeededEmptyStateAction("categories.list");

  return (
    <section
      aria-labelledby="categories-tab-heading"
      className="flex min-h-0 flex-1 flex-col overflow-auto bg-[#06080d] text-ca-ink font-mono antialiased p-8"
      data-project-id={projectId}
    >
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <Tag className="text-ca-primary" size={22} aria-hidden />
            <h2 id="categories-tab-heading" className="text-2xl font-sans font-bold uppercase tracking-wider text-white">
              Taxonomy Manager
            </h2>
          </div>
          <div className="flex items-center gap-2.5">
             <span className="text-xs text-white/70 uppercase font-bold tracking-widest bg-white/[0.04] border border-white/10 rounded-full px-3.5 py-1 shadow-inner">
               {categories.length} CATEGORIES
             </span>
             <span className="text-xs text-white/70 uppercase font-bold tracking-widest bg-white/[0.04] border border-white/10 rounded-full px-3.5 py-1 shadow-inner">
               {rulesets.length} RULESETS
             </span>
          </div>
        </header>

        <div className="mb-8 flex gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div className="flex-1 relative">
             <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40 uppercase tracking-wider">NEW:</span>
             <input
               value={newName}
               onChange={(event) => setNewName(event.currentTarget.value)}
               placeholder="CATEGORY_NAME"
               className="w-full bg-black/60 border border-white/15 rounded-xl py-2.5 pl-14 pr-3 text-xs font-mono text-white focus:border-ca-primary focus:outline-none uppercase shadow-inner"
             />
          </div>
          <button
            type="button"
            onClick={() => {
              addProjectCategory(projectId, newName);
              setNewName("");
            }}
            disabled={newName.trim() === ""}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-ca-primary to-fuchsia-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_16px_color-mix(in_oklab,var(--ca-primary)_35%,transparent)] hover:brightness-110 disabled:opacity-30 transition-all active:scale-95"
          >
            <FolderPlus size={16} />
            ALLOCATE
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column: CRUD */}
          <div className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl overflow-hidden">
            <div className="border-b border-white/[0.08] bg-black/50 px-5 py-3.5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-ca-primary shadow-[0_0_8px_var(--ca-primary)]"></span>
                ACTIVE CATEGORIES
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {categories.map((category) => (
                <CategoryEditorRow
                  key={category}
                  category={category}
                  count={rulesets.filter((rule) => rule.categoryName === category).length}
                  onRename={(next) => renameProjectCategory(projectId, category, next)}
                  onDelete={() => deleteProjectCategory(projectId, category)}
                />
              ))}
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-xl bg-black/30">
                  <FolderPlus size={32} className="text-white/30 mb-3" />
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest">NO CATEGORIES DECLARED</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Column: Assignment */}
          <div className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl overflow-hidden">
            <div className="border-b border-white/[0.08] bg-black/50 px-5 py-3.5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/40"></span>
                RULESET ALLOCATION
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {rulesets.map((rule) => (
                <label
                  key={rule.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-white/10 bg-black/50 p-2.5 hover:border-white/20 transition-all cursor-pointer shadow-sm"
                >
                  <span className="truncate text-xs font-bold text-white tracking-wider pl-2 uppercase">{rule.name}</span>
                  <select
                    value={rule.categoryName ?? ""}
                    onChange={(event) =>
                      updateRulesetCategory(rule.id, event.currentTarget.value || undefined)
                    }
                    className="w-48 rounded-lg border border-white/15 bg-black/70 px-3 py-1.5 text-xs text-ca-primary font-bold uppercase tracking-wider focus:border-ca-primary focus:outline-none appearance-none shadow-inner"
                  >
                    <option value="">[ UNASSIGNED ]</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {rulesets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-xl bg-black/30">
                  <Layers size={32} className="text-white/30 mb-3" />
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest">NO RULESETS AWAITING</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryEditorRow({
  category,
  count,
  onRename,
  onDelete,
}: {
  category: string;
  count: number;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(category);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 p-2.5 transition-all focus-within:border-ca-primary hover:border-white/20 shadow-sm">
      <input
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        onBlur={() => onRename(name)}
        aria-label={`Rename ${category}`}
        className="flex-1 bg-transparent px-2 text-xs font-bold uppercase tracking-wider text-white focus:outline-none"
      />
      <div className="flex shrink-0 items-center gap-3 pr-2">
        <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase">
          {count} RULES
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${category}`}
          className="text-white/40 hover:text-rose-400 transition-colors"
        >
          <Trash2 aria-hidden size={16} />
        </button>
      </div>
    </div>
  );
}
