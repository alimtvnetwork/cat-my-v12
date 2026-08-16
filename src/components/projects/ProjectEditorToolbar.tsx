import type { Project, RuleSet } from "@/lib/projects/store";

interface Props {
  project: Project;
  rulesets: readonly RuleSet[];
}

export function ProjectEditorToolbar({ project, rulesets }: Props) {
  return (
    <div className="flex items-center justify-between border-b border-ca-border p-hmi-4">
      <div>
        <h2 className="text-hmi-title font-bold text-ca-ink">{project.name}</h2>
        <p className="text-hmi-caption text-ca-ink-muted">
          {rulesets.length} Rule Sets
        </p>
      </div>
      {/* Additional toolbar actions can be placed here */}
    </div>
  );
}
