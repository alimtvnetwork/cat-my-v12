import { DraftOriginType } from "@/lib/rules/draftStore";
// @vitest-environment jsdom
// Plan 90 Step 135 tests. SaveConflictModal presentational contract.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SaveConflictModal } from "../SaveConflictModal";
import type { SaveState } from "@/lib/rules/useSaveRuleSet";
import type { SaveRuleSetError } from "@/lib/rules/saveRuleSet";
import { RULESET_SCHEMA_VERSION, type RuleSetEnvelope } from "@/lib/rules/draftStore";

// Radix Dialog portals into document.body but also keeps aria-hidden markers
// under the render root, so getByTestId sees duplicates. Pick the first
// visible match (the portal content is the interactive one).
const pick = (id: string) => screen.getAllByTestId(id).at(-1) as HTMLElement;

function env(): RuleSetEnvelope {
  return {
    SchemaVersion: RULESET_SCHEMA_VERSION,
    RuleSetId: 3,
    Name: "Housing",
    Version: 1,
    Enabled: true,
    Rules: [],
    DraftMeta: {
      ClientId: "c-1",
      UpdatedAt: "2026-07-21T00:00:00Z",
      Origin: DraftOriginType.Indexeddb,
    },
  };
}

function conflictState(): SaveState {
  const err = new Error("stale version") as SaveRuleSetError;
  err.code = "E_BE_CONFLICT";
  err.httpStatus = 409;
  err.backendMessage = "stale version";

  return { kind: "conflict", localEnvelope: env(), error: err };
}

describe("SaveConflictModal", () => {
  it("renders nothing when state is not conflict", () => {
    const { container } = render(
      <SaveConflictModal
        state={{ kind: "idle" }}
        onReloadServer={vi.fn()}
        onOverwriteLocal={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.textContent).toBe("");
  });

  it("renders error code and envelope name on conflict", () => {
    render(
      <SaveConflictModal
        state={conflictState()}
        onReloadServer={vi.fn()}
        onOverwriteLocal={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(pick("save-conflict-error-code").textContent).toContain("E_BE_CONFLICT");
    expect(screen.getByText(/Housing/)).toBeTruthy();
  });

  it("routes clicks to the three resolvers with the local envelope", async () => {
    const reload = vi.fn();
    const overwrite = vi.fn();
    const cancel = vi.fn();
    render(
      <SaveConflictModal
        state={conflictState()}
        onReloadServer={reload}
        onOverwriteLocal={overwrite}
        onCancel={cancel}
      />,
    );
    fireEvent.click(pick("save-conflict-reload"));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(reload.mock.calls[0][0].RuleSetId).toBe(3);

    fireEvent.click(pick("save-conflict-overwrite"));
    await waitFor(() => expect(overwrite).toHaveBeenCalledTimes(1));

    fireEvent.click(pick("save-conflict-cancel"));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("disables buttons while a resolver is in-flight", async () => {
    let release!: () => void;
    const slow = vi.fn(
      () =>
        new Promise<void>((r) => {
          release = r;
        }),
    );
    render(
      <SaveConflictModal
        state={conflictState()}
        onReloadServer={slow}
        onOverwriteLocal={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(pick("save-conflict-reload"));
    await waitFor(() =>
      expect((pick("save-conflict-overwrite") as HTMLButtonElement).disabled).toBe(true),
    );
    release();
    await waitFor(() =>
      expect((pick("save-conflict-overwrite") as HTMLButtonElement).disabled).toBe(false),
    );
  });
});