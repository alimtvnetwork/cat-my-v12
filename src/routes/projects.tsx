// Projects layout (Plan 34, step 8): parent for /projects and children.
// Renders only <Outlet /> so the list route and future $projectId routes
// mount inside a single URL segment without adding chrome here.
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects")({
  component: () => <Outlet />,
});
