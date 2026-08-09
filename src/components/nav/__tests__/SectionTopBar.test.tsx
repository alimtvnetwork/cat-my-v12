import { SectionIdType } from "@/components/nav/SectionTopBar";
// Snapshot the sub-option contract per section id (Plan 34 step 3).
// Uses static render + a stub Link so we assert the sub-option list
// without pulling the full router.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { SectionTopBar, SECTION_OPTIONS, type SectionId } from "../SectionTopBar";

const SECTIONS: SectionId[] = [
  SectionIdType.Home,
  SectionIdType.Project,
  SectionIdType.Ruleset,
  SectionIdType.TrialRun,
  SectionIdType.AiTesting,
];

describe("SectionTopBar", () => {
  for (const section of SECTIONS) {
    it(`renders every sub-option for section "${section}"`, () => {
      const html = renderToStaticMarkup(<SectionTopBar section={section} />);
      expect(html).toContain(`data-section="${section}"`);
      for (const opt of SECTION_OPTIONS[section]) {
        expect(html).toContain(`data-option="${opt.id}"`);
        expect(html).toContain(`>${opt.label}<`);
      }
    });

    it(`marks the active option for section "${section}"`, () => {
      const first = SECTION_OPTIONS[section][0]?.id;

      if (!first) return;
      const html = renderToStaticMarkup(<SectionTopBar section={section} active={first} />);
      expect(html).toMatch(new RegExp(`data-option="${first}"[^>]*data-active="true"`));
    });
  }

  it("home section exposes exactly the 4 hub actions", () => {
    expect(SECTION_OPTIONS.home.map((o) => o.id)).toEqual([
      "setup",
      "projects",
      "trial-run",
      "ai-testing",
    ]);
  });
});
