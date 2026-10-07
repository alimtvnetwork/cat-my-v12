import { createFileRoute } from "@tanstack/react-router";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { WhiteBoxMarkingTool } from "@/components/vision/WhiteBoxMarkingTool";

export const Route = createFileRoute("/setup/white-boxes")({
  component: WhiteBoxesScreen,
});

function WhiteBoxesScreen() {
  return (
    <StandardAppShell
      activeNav="setup"
      title="Greyscale Pattern Matching"
      subtitle="Greyscale pattern detection with numbered feature review"
    >
      <WhiteBoxMarkingTool actionButtonLabel="Save Pattern" />
    </StandardAppShell>
  );
}
