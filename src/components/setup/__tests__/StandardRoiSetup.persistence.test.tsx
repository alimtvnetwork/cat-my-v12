// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import {
  StandardRoiSetup,
  resolveStandardRuleSetId,
  findMatchingRuleItem,
} from "../StandardRoiSetup";
import { DataSourceType } from "@/lib/data-source";
import {
  RULESET_SCHEMA_VERSION,
  RuleKindType,
  ToleranceKindType,
  DraftOriginType,
  type RuleSetEnvelope,
  type RuleItem,
} from "@/lib/rules/draftStore";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

let mockDataSource = DataSourceType.Backend;
vi.mock("@/lib/data-source", () => ({
  useDataSource: () => mockDataSource,
  DataSourceType: {
    Backend: "backend",
    Local: "local",
    Seed: "seed",
  },
}));

const mockLoadRuleSet = vi.fn();
vi.mock("@/lib/rules/loadRuleSet", () => ({
  loadRuleSet: (...args: unknown[]) => mockLoadRuleSet(...args),
}));

const mockSaveRuleSet = vi.fn();
vi.mock("@/lib/rules/saveRuleSet", () => ({
  saveRuleSet: (...args: unknown[]) => mockSaveRuleSet(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/components/layout/StandardAppShell", () => ({
  StandardAppShell: ({
    children,
    actions,
    subtitle,
  }: {
    children: React.ReactNode;
    actions: React.ReactNode;
    subtitle: string;
  }) => (
    <div data-testid="app-shell">
      <div data-testid="subtitle">{subtitle}</div>
      <div data-testid="actions">{actions}</div>
      <div data-testid="content">{children}</div>
    </div>
  ),
}));

function createSampleEnvelope(): RuleSetEnvelope {
  const rule1: RuleItem = {
    Id: 1,
    Kind: RuleKindType.Presence,
    Enabled: true,
    Shape: {
      Type: "rect",
      X: 150,
      Y: 250,
      W: 400,
      H: 300,
    },
    Tolerance: { Kind: ToleranceKindType.Pct, Value: 5 },
    Params: { _LegacyId: "rule-sample-1" },
  };

  const rule2: RuleItem = {
    Id: 2,
    Kind: RuleKindType.Match,
    Enabled: true,
    Shape: {
      Type: "rect",
      X: 50,
      Y: 60,
      W: 70,
      H: 80,
    },
    Tolerance: { Kind: ToleranceKindType.Pct, Value: 5 },
    Params: { _LegacyId: "rule-sample-2" },
  };

  return {
    SchemaVersion: RULESET_SCHEMA_VERSION,
    RuleSetId: 1,
    Name: "Test Recipe",
    Version: 3,
    Enabled: true,
    Rules: [rule1, rule2],
    DraftMeta: {
      ClientId: "test-client",
      UpdatedAt: "2026-09-16T12:00:00Z",
      Origin: DraftOriginType.Server,
    },
  };
}

describe("StandardRoiSetup persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDataSource = DataSourceType.Backend;
  });

  afterEach(() => {
    cleanup();
  });

  it("resolves RuleSetId and matches RuleItem correctly", () => {
    expect(resolveStandardRuleSetId("42")).toBe(42);
    expect(resolveStandardRuleSetId("1")).toBe(1);

    const env = createSampleEnvelope();
    expect(findMatchingRuleItem(env.Rules, "1")?.Id).toBe(1);
    expect(findMatchingRuleItem(env.Rules, "2")?.Id).toBe(2);
    expect(findMatchingRuleItem(env.Rules, "rule-sample-1")?.Id).toBe(1);
    expect(findMatchingRuleItem(env.Rules, "rule-sample-2")?.Id).toBe(2);
    expect(findMatchingRuleItem(env.Rules, undefined)?.Id).toBe(1);
  });

  it("hydrates from RuleSetEnvelope and restores X/Y/W/H correctly", async () => {
    const sampleEnv = createSampleEnvelope();
    mockLoadRuleSet.mockResolvedValueOnce(sampleEnv);

    render(<StandardRoiSetup rulesetId="1" ruleId="1" />);

    expect(mockLoadRuleSet).toHaveBeenCalledWith(1, { suppressCapture: true });

    await waitFor(() => {
      const subtitle = screen.getByTestId("subtitle").textContent;
      expect(subtitle).toContain("X:150 Y:250 W:400 H:300");
    });
  });

  it("Apply saves through shared saveRuleSet, modifies only selected shape, and keeps unrelated rules untouched", async () => {
    const sampleEnv = createSampleEnvelope();
    mockLoadRuleSet.mockResolvedValueOnce(sampleEnv);
    mockSaveRuleSet.mockImplementation(async (env: RuleSetEnvelope) => ({
      ...env,
      Version: env.Version + 1,
    }));

    render(<StandardRoiSetup rulesetId="1" ruleId="1" />);

    await waitFor(() => {
      expect(screen.getByTestId("subtitle").textContent).toContain("X:150 Y:250 W:400 H:300");
    });

    // Reset Full button changes X to 100, Y to 100, W to 440, H to 320
    fireEvent.click(screen.getByRole("button", { name: "Reset Full" }));

    await waitFor(() => {
      expect(screen.getByTestId("subtitle").textContent).toContain("X:100 Y:100 W:440 H:320");
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(mockSaveRuleSet).toHaveBeenCalledTimes(1);
    });

    const savedEnv: RuleSetEnvelope = mockSaveRuleSet.mock.calls[0][0];
    expect(savedEnv.RuleSetId).toBe(1);
    expect(savedEnv.Version).toBe(3); // Preserves Version in outbound call
    expect(savedEnv.Name).toBe("Test Recipe");

    // Selected rule shape changed
    const rule1 = savedEnv.Rules.find((r) => r.Id === 1);
    expect(rule1?.Shape.X).toBe(100);
    expect(rule1?.Shape.Y).toBe(100);
    expect(rule1?.Shape.W).toBe(440);
    expect(rule1?.Shape.H).toBe(320);

    // Unrelated rule shape untouched
    const rule2 = savedEnv.Rules.find((r) => r.Id === 2);
    expect(rule2?.Shape.X).toBe(50);
    expect(rule2?.Shape.Y).toBe(60);
    expect(rule2?.Shape.W).toBe(70);
    expect(rule2?.Shape.H).toBe(80);

    // Apply stays on screen
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("OK saves through shared saveRuleSet and navigates to /setup", async () => {
    const sampleEnv = createSampleEnvelope();
    mockLoadRuleSet.mockResolvedValueOnce(sampleEnv);
    mockSaveRuleSet.mockImplementation(async (env: RuleSetEnvelope) => ({
      ...env,
      Version: env.Version + 1,
    }));

    render(<StandardRoiSetup rulesetId="1" ruleId="1" />);

    await waitFor(() => {
      expect(screen.getByTestId("subtitle").textContent).toContain("X:150 Y:250 W:400 H:300");
    });

    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() => {
      expect(mockSaveRuleSet).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/setup" });
    });
  });

  it("Cancel does NOT save and navigates to /setup", async () => {
    const sampleEnv = createSampleEnvelope();
    mockLoadRuleSet.mockResolvedValueOnce(sampleEnv);

    render(<StandardRoiSetup rulesetId="1" ruleId="1" />);

    await waitFor(() => {
      expect(screen.getByTestId("subtitle").textContent).toContain("X:150 Y:250 W:400 H:300");
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockSaveRuleSet).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/setup" });
  });
});
