import { createFileRoute } from "@tanstack/react-router";
import { EditorSetupExperience } from "@/components/editor";
import {
  SetupErrorComponent,
  SetupNotFoundComponent,
} from "@/components/editor/setup/SetupBoundaries";

export const Route = createFileRoute("/setup/reference")({
  head: () => ({
    meta: [
      { title: "Control Automation, Reference image" },
      {
        name: "description",
        content: "Capture or import the reference image used to train the inspection tools.",
      },
    ],
  }),
  component: ReferenceScreen,
  errorComponent: SetupErrorComponent,
  notFoundComponent: SetupNotFoundComponent,
});

function ReferenceScreen() {
  return <EditorSetupExperience />;
}
