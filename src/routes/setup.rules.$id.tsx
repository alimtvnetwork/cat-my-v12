import { SectionIdType } from "@/components/nav/SectionTopBar";
// Plan 79 step 23. Rule editor route shell.
//
// The real `<RuleEditor>` (step 24) plus metadata bar (step 25) and cycle
// wiring (step 26) will land here. This shell:
//   - Loads the rule via `useRulesLibrary().byId(id)`.
//   - Redirects to /setup/rules when the id resolves to a Category (wrong
//     surface: categories edit at /setup/categories/$id).
//   - Shows a not-found panel with a link back if the id is unknown.
//   - Renders name + minimal placeholder metadata to prove the route is
//     wired end-to-end before the real editor ships.

import { useEffect } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { SectionTopBar } from "@/components/nav/SectionTopBar";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import type { RuleId } from "@/lib/rules/model";
import { fromIntId } from "@/lib/rules/rule-id-alias";
import { EditorSetupExperience } from "@/components/editor";

export const Route = createFileRoute("/setup/rules/$id")({
  staticData: { crumb: "Rule editor" },
  head: ({ params }) => ({
    meta: [
      { title: `Edit rule, ${params.id}` },
      {
        name: "description",
        content:
          "Edit a rule from the shared library. Metadata, conditions, and applies-before ordering.",
      },
    ],
  }),
  component: RuleEditorRoute,
});

function RuleEditorRoute() {
  const { id } = Route.useParams();
  const { byId } = useRulesLibrary();
  const navigate = useNavigate();
  // Accept both integer aliases (canonical URL form) and legacy raw ids.
  const resolvedId = /^\d+$/.test(id) ? (fromIntId(Number(id)) ?? id) : id;
  const rule = byId(resolvedId as RuleId);

  useEffect(() => {
    if (rule && rule.isCategory) {
      // Wrong surface: bounce to the category editor without swallowing the id.
      void navigate({
        to: "/setup/categories/$id",
        params: { id: String(rule.id) },
        replace: true,
      });
    }
  }, [rule, navigate]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ca-bg text-ca-ink">
      <SectionTopBar section={SectionIdType.Home} active="setup" />
      {rule && !rule.isCategory ? (
        <EditorSetupExperience />
      ) : rule ? null : (
        <div className="flex flex-1 items-center justify-center px-hmi-4 py-hmi-6 text-hmi-body text-ca-ink-muted">
          Rule was deleted or the link is stale.
          <Link to="/setup/rules" preload="intent" className="ml-hmi-2 text-ca-select underline">
            Back to Rules
          </Link>
        </div>
      )}
    </div>
  );
}
