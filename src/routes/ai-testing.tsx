// Top-level AI testing picker. Home tile "AI testing" lands here; user
// picks a project, then routes into /projects/$id/ai-testing.
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ProjectPicker } from "./trial-run";

export const Route = createFileRoute("/ai-testing")({
  head: () => ({
    meta: [
      { title: "AI testing, Control Automation" },
      { name: "description", content: "Pick a project to batch test a ruleset against a dataset." },
      { property: "og:title", content: "AI testing, Control Automation" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content: "Batch test rulesets across image datasets inside any project.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiTestingPicker,
});

function AiTestingPicker() {
  return (
    <ProjectPicker
      title="AI testing"
      lead="Pick a project to batch test a ruleset."
      Icon={Sparkles}
      subroute="ai-testing"
      active="ai-testing"
    />
  );
}