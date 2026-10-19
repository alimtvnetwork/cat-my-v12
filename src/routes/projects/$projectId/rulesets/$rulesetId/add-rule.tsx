import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AddRulePanel } from "@/components/vision/workpiece/AddRulePanel";

export const Route = createFileRoute("/projects/$projectId/rulesets/$rulesetId/add-rule")({
  component: AddRuleRoute,
});

function AddRuleRoute() {
  const { projectId, rulesetId } = Route.useParams();
  const navigate = useNavigate();

  return (
    <AddRulePanel
      projectId={projectId}
      rulesetId={rulesetId}
      onRuleCreated={(resolvedRulesetId, ruleId) =>
        void navigate({
          to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
          params: { projectId, rulesetId: resolvedRulesetId, ruleId },
        })
      }
      onExit={() => void navigate({ to: "/projects/$projectId", params: { projectId } })}
    />
  );
}
