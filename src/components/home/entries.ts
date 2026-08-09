export interface HomeEntry {
  id: "projects" | "setup" | "trial-run" | "ai-testing";
  label: string;
  description: string;
  icon: string;
  to: "/projects" | "/setup" | "/run" | "/ai-testing";
}

export const HOME_ENTRIES: readonly HomeEntry[] = [
  {
    id: "projects",
    label: "Projects",
    description:
      "Create a project or open an existing one to reach setup, rules, images, test, and run.",
    icon: "▦",
    to: "/projects",
  },
  {
    id: "setup",
    label: "Setup",
    description:
      "Configure rules, camera, lighting, trigger, ROI, and reference for the active project.",
    icon: "⚙",
    to: "/setup",
  },
  {
    id: "trial-run",
    label: "Trial run",
    description: "Run the current rule set against a batch and review pass or fail outcomes.",
    icon: "▶",
    to: "/run",
  },
  {
    id: "ai-testing",
    label: "AI testing",
    description: "Evaluate rules with AI gate, review history, and tune thresholds.",
    icon: "◈",
    to: "/ai-testing",
  },
] as const;
