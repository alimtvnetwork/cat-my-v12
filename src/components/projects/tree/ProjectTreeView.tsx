// Plan 03 step 3. Project → Recipe → Rule tree view with drag-and-drop.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §4–§5.
// Depths: 0 = Project (single root, not draggable), 1 = Recipe, 2 = Rule.
// @dnd-kit: PointerSensor (distance 4) + KeyboardSensor; SortableContext
// per level; drop position from pointer Y thirds; §5.1 move matrix
// enforced in tree-dnd.ts; single commit path commitTreeMove.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FolderOpen, Layers, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { TreeRow } from "./TreeRow";
import { TreeToolbar } from "./TreeToolbar";
import { DraggableTreeRow } from "./DraggableTreeRow";
import { useTreeDnd, sortableIdFor } from "./useTreeDnd";
import { TreeNodeKindType, TreeDropPositionType } from "@/lib/recipes/tree-types";
import { useRecipesForProject, useRecipeActions } from "@/lib/recipes/useRecipeLibrary";
import { ensureSeedRecipes } from "@/lib/recipes/seed";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import { ClientLogger } from "@/lib/observability/client-logger";
import type { DndNodeRef } from "./tree-dnd";

export interface TreeSelection {
  kind: TreeNodeKindType;
  id: string;
}

interface ProjectTreeViewProps {
  projectId: string;
  projectName: string;
  selection: TreeSelection | null;
  onSelectNode: (selection: TreeSelection) => void;
}

const MAX_SEED_RULES = 6;

function readExpanded(projectId: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(`ui.project-tree.expanded.${projectId}`);

    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch (err) {
    ClientLogger.warn("[project-tree] failed to read expanded state", err);
  }

  return {};
}

export function ProjectTreeView(props: ProjectTreeViewProps): React.JSX.Element {
  const { projectId, projectName } = props;
  const recipes = useRecipesForProject(projectId);
  const { addRecipe, commitTreeMove } = useRecipeActions();
  const { rules } = useRulesLibrary();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => readExpanded(projectId));
  const seededRef = useRef(false);

  const ruleNameOf = useMemo(() => {
    const map = new Map<string, string>();

    for (const rule of rules) map.set(rule.id, rule.name);

    return (id: string): string => map.get(id) ?? id;
  }, [rules]);

  const describeNode = (ref: DndNodeRef): string => {
    if (ref.kind === TreeNodeKindType.Recipe) {
      return recipes.find((r) => r.id === ref.id)?.name ?? ref.id;
    }

    if (ref.kind === TreeNodeKindType.Rule) return ruleNameOf(ref.id);

    return projectName;
  };

  const dnd = useTreeDnd({ recipes, commitTreeMove, describeNode });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `ui.project-tree.expanded.${projectId}`,
        JSON.stringify(expanded),
      );
    } catch (err) {
      ClientLogger.warn("[project-tree] failed to persist expanded state", err);
    }
  }, [expanded, projectId]);

  useEffect(() => {
    if (seededRef.current || recipes.length > 0) return;
    if (window.localStorage.getItem(`ui.project-tree.seeded.${projectId}`)) return;

    const seedIds = rules
      .filter((rule) => rule.isCategory === false)
      .slice(0, MAX_SEED_RULES)
      .map((rule) => rule.id);
    const createdIds = ensureSeedRecipes(projectId, seedIds);
    window.localStorage.setItem(`ui.project-tree.seeded.${projectId}`, "1");
    seededRef.current = true;

    const firstId = createdIds[0];

    if (firstId) setExpanded({ [firstId]: true });
  }, [projectId, recipes.length, rules]);

  const setNodeExpanded = (id: string, isOpen: boolean): void => {
    setExpanded((prev) => ({ ...prev, [id]: isOpen }));
  };

  const expandAll = (): void => {
    const next: Record<string, boolean> = { [projectId]: true };

    for (const recipe of recipes) next[recipe.id] = true;

    setExpanded(next);
  };

  const handleNewRecipe = (name: string): void => {
    try {
      const recipe = addRecipe({ projectId, name });
      setNodeExpanded(recipe.id, true);
      props.onSelectNode({ kind: TreeNodeKindType.Recipe, id: recipe.id });
      toast.success(`Created recipe: ${recipe.name}`);
    } catch (err) {
      ClientLogger.error("[project-tree] addRecipe failed", { projectId, name, err });
      toast.error(err instanceof Error ? err.message : "Failed to create recipe");
    }
  };

  const isSelected = (kind: TreeNodeKindType, id: string): boolean =>
    props.selection?.kind === kind && props.selection.id === id;

  const indicatorFor = (sortableId: string): TreeDropPositionType | null =>
    dnd.overState?.sortableId === sortableId ? dnd.overState.position : null;

  const isValidFor = (sortableId: string): boolean =>
    dnd.overState?.sortableId === sortableId ? dnd.overState.isValid : true;

  const totalRules = recipes.reduce((sum, recipe) => sum + recipe.ruleIds.length, 0);
  const recipeSortableIds = recipes.map((r) => sortableIdFor(TreeNodeKindType.Recipe, r.id));

  return (
    <DndContext
      sensors={dnd.sensors}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDragEnd={dnd.onDragEnd}
      onDragCancel={dnd.onDragCancel}
    >
      <div className="flex min-h-0 flex-1 flex-col rounded-md border border-ca-border bg-ca-bg">
        <TreeToolbar
          onExpandAll={expandAll}
          onCollapseAll={() => setExpanded({})}
          onNewRecipe={handleNewRecipe}
        />
        <div
          role="tree"
          aria-label={`Project structure for ${projectName}`}
          onPointerMove={(event) => dnd.handlePointerMove(event.clientY)}
          className="min-h-0 flex-1 overflow-auto py-1"
        >
          <TreeRow
            depth={0}
            kind={TreeNodeKindType.Project}
            name={projectName}
            icon={<FolderOpen size={14} />}
            countLabel={`${recipes.length} recipes · ${totalRules} rules`}
            isExpanded={expanded[projectId] ?? true}
            hasChildren={recipes.length > 0}
            isSelected={isSelected(TreeNodeKindType.Project, projectId)}
            isEnabled
            onToggle={() => setNodeExpanded(projectId, !(expanded[projectId] ?? true))}
            onSelect={() => props.onSelectNode({ kind: TreeNodeKindType.Project, id: projectId })}
          />
          <SortableContext items={recipeSortableIds} strategy={verticalListSortingStrategy}>
            {(expanded[projectId] ?? true)
              ? recipes.map((recipe) => {
                  const isOpen = expanded[recipe.id] ?? true;
                  const recipeSortableId = sortableIdFor(TreeNodeKindType.Recipe, recipe.id);
                  const ruleSortableIds = recipe.ruleIds.map((ruleId) =>
                    sortableIdFor(TreeNodeKindType.Rule, ruleId),
                  );

                  return (
                    <Fragment key={recipe.id}>
                      <DraggableTreeRow
                        sortableId={recipeSortableId}
                        kind={TreeNodeKindType.Recipe}
                        dropIndicator={indicatorFor(recipeSortableId)}
                        isDropValid={isValidFor(recipeSortableId)}
                      >
                        <TreeRow
                          depth={1}
                          kind={TreeNodeKindType.Recipe}
                          name={recipe.name}
                          icon={<Layers size={14} />}
                          countLabel={`${recipe.ruleIds.length} rules`}
                          isExpanded={isOpen}
                          hasChildren={recipe.ruleIds.length > 0}
                          isSelected={isSelected(TreeNodeKindType.Recipe, recipe.id)}
                          isEnabled={recipe.isEnabled !== false}
                          onToggle={() => setNodeExpanded(recipe.id, !isOpen)}
                          onSelect={() =>
                            props.onSelectNode({ kind: TreeNodeKindType.Recipe, id: recipe.id })
                          }
                          onMoveKey={(direction) =>
                            dnd.handleMoveKey(TreeNodeKindType.Recipe, recipe.id, direction)
                          }
                        />
                      </DraggableTreeRow>
                      {isOpen ? (
                        <SortableContext
                          items={ruleSortableIds}
                          strategy={verticalListSortingStrategy}
                        >
                          {recipe.ruleIds.map((ruleId) => {
                            const ruleSortableId = sortableIdFor(TreeNodeKindType.Rule, ruleId);

                            return (
                              <DraggableTreeRow
                                key={ruleId}
                                sortableId={ruleSortableId}
                                kind={TreeNodeKindType.Rule}
                                dropIndicator={indicatorFor(ruleSortableId)}
                                isDropValid={isValidFor(ruleSortableId)}
                              >
                                <TreeRow
                                  depth={2}
                                  kind={TreeNodeKindType.Rule}
                                  name={ruleNameOf(ruleId)}
                                  icon={<ListChecks size={14} />}
                                  isExpanded={false}
                                  hasChildren={false}
                                  isSelected={isSelected(TreeNodeKindType.Rule, ruleId)}
                                  isEnabled
                                  onToggle={() => undefined}
                                  onSelect={() =>
                                    props.onSelectNode({ kind: TreeNodeKindType.Rule, id: ruleId })
                                  }
                                  onMoveKey={(direction) =>
                                    dnd.handleMoveKey(TreeNodeKindType.Rule, ruleId, direction)
                                  }
                                />
                              </DraggableTreeRow>
                            );
                          })}
                        </SortableContext>
                      ) : null}
                    </Fragment>
                  );
                })
              : null}
          </SortableContext>
          {recipes.length === 0 ? (
            <p className="px-3 py-4 text-xs text-ca-ink-muted">
              No recipes yet. Create one with the + Recipe button above.
            </p>
          ) : null}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {dnd.activeNode ? (
          <div className="rounded-sm border border-ca-select bg-ca-panel-2 opacity-90">
            <TreeRow
              depth={dnd.activeNode.kind === TreeNodeKindType.Recipe ? 1 : 2}
              kind={dnd.activeNode.kind}
              name={dnd.activeNode.name}
              icon={
                dnd.activeNode.kind === TreeNodeKindType.Recipe ? (
                  <Layers size={14} />
                ) : (
                  <ListChecks size={14} />
                )
              }
              isExpanded={false}
              hasChildren={false}
              isSelected={false}
              isEnabled
              onToggle={() => undefined}
              onSelect={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
      <div aria-live="polite" className="sr-only">
        {dnd.announcement}
      </div>
    </DndContext>
  );
}
