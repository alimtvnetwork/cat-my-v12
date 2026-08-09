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
      className="mx-auto w-full max-w-5xl space-y-hmi-4 p-hmi-6"
      data-project-id={projectId}
    >
      <h2
        id="categories-tab-heading"
        className="flex items-center gap-2 text-hmi-title text-ca-ink"
      >
        <Tag className="h-5 w-5 text-ca-primary" aria-hidden /> Categories
      </h2>
      <div className="flex gap-hmi-2 rounded-lg border border-ca-border bg-ca-panel p-hmi-3">
        <input
          value={newName}
          onChange={(event) => setNewName(event.currentTarget.value)}
          placeholder="New category"
          className="min-w-0 flex-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            addProjectCategory(projectId, newName);
            setNewName("");
          }}
          disabled={newName.trim() === ""}
          className="rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <div className="grid grid-cols-1 gap-hmi-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4">
          <h3 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Category CRUD
          </h3>
          <div className="mt-hmi-3 space-y-hmi-2">
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
              <EmptyState
                icon={FolderPlus}
                title={seeded.title ?? "No categories yet"}
                description={
                  seeded.body ?? "Add a category above to group rule sets for this project."
                }
                actions={
                  seeded.cta
                    ? [
                        {
                          label: seeded.cta.label,
                          onClick: seeded.cta.onClick,
                          testId: seeded.cta.testId,
                          variant: "secondary" as const,
                        },
                      ]
                    : undefined
                }
                testId="project-categories-empty"
              />
            ) : null}
          </div>
        </div>
        <div className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4">
          <h3 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Rule assignment
          </h3>
          <div className="mt-hmi-3 space-y-hmi-2">
            {rulesets.map((rule) => (
              <label
                key={rule.id}
                className="grid grid-cols-[minmax(0,1fr)_12rem] items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 p-hmi-2 text-hmi-body text-ca-ink"
              >
                <span className="truncate">{rule.name}</span>
                <select
                  value={rule.categoryName ?? ""}
                  onChange={(event) =>
                    updateRulesetCategory(rule.id, event.currentTarget.value || undefined)
                  }
                  className="rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-ca-ink focus:border-ca-select focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {rulesets.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No rule sets yet"
                description="Create a rule set to assign it to a category."
                testId="project-categories-rulesets-empty"
              />
            ) : null}
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 p-hmi-2">
      <input
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        onBlur={() => onRename(name)}
        aria-label={`Rename ${category}`}
        className="min-w-0 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
      />
      <span className="text-hmi-caption text-ca-ink-muted">{count}</span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${category}`}
        className="grid h-8 w-8 place-items-center rounded-sm border border-ca-border text-ca-ng hover:bg-ca-ng/10"
      >
        <Trash2 aria-hidden size={14} />
      </button>
    </div>
  );
}
