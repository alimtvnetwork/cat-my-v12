import re

file_path = "src/routes/projects/$projectId/index.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the ProjectOverview component entirely.
# First, let's just make it return WorkpieceAnalyzeWorkspace.
old_comp_pattern = re.compile(r'function ProjectOverview\(\) \{.*', re.DOTALL)

new_comp = """function ProjectOverview() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const [activeRulesetId, setActiveRulesetId] = useState<string | null>(null);

  if (!project) {
    console.warn("[projects/$projectId/index] project not found", { projectId });
    throw notFound();
  }

  const activeRuleset = (activeRulesetId ? rulesets.find((r) => r.id === activeRulesetId) : null) ?? rulesets[0];

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0b0c10]">
      {activeRuleset ? (
        <WorkpieceAnalyzeWorkspace
          key={activeRuleset.id}
          project={project}
          ruleset={activeRuleset}
          rulesets={rulesets}
          onSelectRuleset={(rid) => setActiveRulesetId(rid)}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-ca-ink-muted text-xs font-mono uppercase">No rulesets available.</p>
        </div>
      )}
    </div>
  );
}
"""

content = old_comp_pattern.sub(new_comp, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
