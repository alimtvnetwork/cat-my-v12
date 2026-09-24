import { createFileRoute } from "@tanstack/react-router";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { Pin1MarkingTool } from "@/components/vision/standard/tools/pin1-config/Pin1MarkingTool";

export const Route = createFileRoute("/setup/pin1")({
  component: Pin1Screen,
});

function Pin1Screen() {
  return (
    <StandardAppShell
      activeNav="setup"
      title="Pin 1 Orientation Config"
      subtitle="Locate circular index dimple and configure orientation rule"
    >
      <Pin1MarkingTool actionButtonLabel="Save as Pin 1 Rule" />
    </StandardAppShell>
  );
}
