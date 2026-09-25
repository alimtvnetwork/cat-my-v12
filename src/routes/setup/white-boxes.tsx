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
      subtitle="2-bit greyscale conversion with numbered pattern review"
    >
      <WhiteBoxMarkingTool actionButtonLabel="Save Pattern" />
    </StandardAppShell>
  );
}
