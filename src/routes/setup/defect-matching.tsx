import { createFileRoute } from "@tanstack/react-router";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { DefectMarkingTool } from "@/components/vision/standard/tools/defect-matching/DefectMarkingTool";

export const Route = createFileRoute("/setup/defect-matching")({
  component: DefectMatchingScreen,
});

function DefectMatchingScreen() {
  return (
    <StandardAppShell
      activeNav="setup"
      title="Defect Matching"
      subtitle="Register flaw pattern template and configure inverted rejection rule"
    >
      <DefectMarkingTool actionButtonLabel="Save Defect Rule" />
    </StandardAppShell>
  );
}
