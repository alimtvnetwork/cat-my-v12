// Per-rule deep-link. The URL uses an integer alias (`$ruleId` = digits)
// so operators see friendly numeric ids instead of opaque slugs.
//
// The actual redirect (legacy uuid -> integer alias -> `/setup/roi`) is
// handled in the parent route component (`RulesetEditor`) because this
// route sits under a parent that does NOT render `<Outlet />`, so the
// child component and route lifecycle never mount. Keeping the file
// registered makes the URL a valid match (no 404 during the parent-side
// redirect) and gives us a home for the notFound fallback.
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { fromIntId } from "@/lib/rules/rule-id-alias";

export const Route = createFileRoute("/projects/$projectId/rulesets/$rulesetId/rules/$ruleId")({
  component: RuleFallback,
  notFoundComponent: () => (
    <div className="p-6 text-sm text-ca-fg-muted">
      Rule not found. The link may be stale; open the rule from the ruleset page.
    </div>
  ),
});

function RuleFallback() {
  const { projectId, rulesetId, ruleId } = Route.useParams();

  if (/^\d+$/.test(ruleId)) {
    const resolved = fromIntId(Number(ruleId));

    if (resolved) {
      return (
        <Navigate
          to="/setup/roi"
          search={{ project: projectId, ruleset: rulesetId, rule: resolved }}
          replace
        />
      );
    }
  }

  return (
    <div className="p-6 text-sm text-ca-fg-muted">
      Rule not found. The link may be stale; open the rule from the ruleset page.
    </div>
  );
}
