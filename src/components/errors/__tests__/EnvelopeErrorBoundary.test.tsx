// @vitest-environment jsdom
import { render, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { EnvelopeErrorBoundary } from "@/components/errors/EnvelopeErrorBoundary";
import { ENVELOPE_ERROR_EVENT, EnvelopeError } from "@/lib/be-fetch";
import { useErrorStore } from "@/lib/errors/errorStore";
import type { CapturedError } from "@/types/errors";

function reset() {
  useErrorStore.setState({ history: [], currentError: null, isOpen: false });
}

describe("EnvelopeErrorBoundary (Plan 90 Step 103)", () => {
  beforeEach(reset);

  it("opens the modal when beFetch dispatches ENVELOPE_ERROR_EVENT", () => {
    render(
      <EnvelopeErrorBoundary>
        <div>ok</div>
      </EnvelopeErrorBoundary>,
    );

    const err = new EnvelopeError({
      code: "E_BE_UNAVAILABLE",
      backendMessage: "down",
      endpoint: "/api/x",
      method: "GET",
      responseStatus: 0,
      correlationId: "cid-test-1",
      envelope: null,
    });
    const captured: CapturedError = useErrorStore.getState().captureError(err, {}, err.code);

    expect(useErrorStore.getState().isOpen).toBe(false);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(ENVELOPE_ERROR_EVENT, {
          detail: { captured, error: err },
        }),
      );
    });
    expect(useErrorStore.getState().isOpen).toBe(true);
    expect(useErrorStore.getState().currentError?.code).toBe("E_BE_UNAVAILABLE");
  });
});
