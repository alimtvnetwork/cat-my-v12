import { createFileRoute } from "@tanstack/react-router";
import { BugReportingSettings } from "@/components/settings/BugReportingSettings";
import { StandardAppShell } from "@/components/layout/StandardAppShell";

export const Route = createFileRoute("/settings/bug-reporting")({
  head: () => ({
    meta: [
      { title: "Bug Reporting - Control Automation" },
      {
        name: "description",
        content: "Configure email + Supabase delivery for bug reports.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BugReportingPage,
});

function BugReportingPage(): React.JSX.Element | null {
  return (
    <StandardAppShell>
      <BugReportingSettings />
    </StandardAppShell>
  );
}
