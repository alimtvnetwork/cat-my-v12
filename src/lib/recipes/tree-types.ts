// Plan 03 step 1. Tree-view enums (dedicated file per CODE RED rule 9).
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §3.4.
// Typed enums with `Type` suffix, PascalCase members. No string literals
// for node kinds / drop positions / move kinds anywhere in the tree.

export enum TreeNodeKindType {
  Project = "Project",
  Recipe = "Recipe",
  Rule = "Rule",
}

export enum TreeDropPositionType {
  Before = "Before",
  Into = "Into",
  After = "After",
}

export enum TreeMoveKindType {
  ReorderRecipe = "ReorderRecipe",
  ReorderRule = "ReorderRule",
  MoveRuleToRecipe = "MoveRuleToRecipe",
}
