// Rulesets layout (Plan 34, step 13). Delegates chrome to the parent
// projects.$projectId layout; this segment only groups the list and
// per-ruleset child routes under one URL prefix.
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId/rulesets")({
  component: () => <Outlet />,
});
