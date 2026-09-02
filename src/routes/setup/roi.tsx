import { createFileRoute } from "@tanstack/react-router";
import { EditorSetupExperience } from "@/components/editor";
import {
  SetupErrorComponent,
  SetupNotFoundComponent,
} from "@/components/editor/setup/SetupBoundaries";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardRoiSetup } from "@/components/setup/StandardRoiSetup";

export const Route = createFileRoute("/setup/roi")({
  head: () => ({
    meta: [
      { title: "Control Automation, ROI" },
      {
        name: "description",
        content: "Edit regions of interest, anchors, and masks for the selected inspection tool.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    const pick = (k: string) =>
      typeof search[k] === "string" && (search[k] as string).length > 0
        ? (search[k] as string)
        : undefined;

    return {
      project: pick("project"),
      ruleset: pick("ruleset"),
      rule: pick("rule"),
    };
  },
  component: RoiEditor,
  errorComponent: SetupErrorComponent,
  notFoundComponent: SetupNotFoundComponent,
});

function RoiEditor() {
  const search = Route.useSearch();
  const { mode } = useUiMode();

  if (mode === UiModeType.Standard) {
    return <StandardRoiSetup />;
  }

  return (
    <EditorSetupExperience
      projectId={search.project}
      rulesetId={search.ruleset}
      preselectRuleId={search.rule}
    />
  );
}
