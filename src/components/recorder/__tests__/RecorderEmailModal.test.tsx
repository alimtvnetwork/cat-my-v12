// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { RecorderEmailModal } from "../RecorderEmailModal";
import { IssueCategoryType, type RecorderSession } from "@/lib/recorder/types";

const mockSession: RecorderSession = {
  id: "rec-test-email",
  startedAt: "2026-10-31T12:00:00.000Z",
  durationMs: 30000,
  initialRoute: "/projects/1",
  finalRoute: "/projects/1",
  routeHistory: ["/projects/1"],
  events: [],
  screenshots: [],
};

describe("RecorderEmailModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders null when isOpen is false", () => {
    const { container } = render(
      <RecorderEmailModal
        isOpen={false}
        onClose={vi.fn()}
        session={mockSession}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders email form when isOpen is true", () => {
    render(
      <RecorderEmailModal
        isOpen={true}
        onClose={vi.fn()}
        session={mockSession}
        summary={{
          title: "Test Glitch",
          description: "Detail",
          category: IssueCategoryType.UiGlitch,
          expectedBehavior: "Fixed",
          actualBehavior: "Broken",
        }}
      />
    );

    expect(screen.getByText("Direct Email Bug Dispatch")).not.toBeNull();
    expect(screen.getByPlaceholderText(/support@catvision.ai/i)).not.toBeNull();
    expect(screen.getByText("Send Email")).not.toBeNull();
  });

  it("calls POST /bug-reports on submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Status: { IsSuccess: true } }),
    });
    global.fetch = fetchMock;

    const onClose = vi.fn();

    render(
      <RecorderEmailModal
        isOpen={true}
        onClose={onClose}
        session={mockSession}
        summary={{
          title: "Test Glitch",
          description: "Detail",
          category: IssueCategoryType.UiGlitch,
          expectedBehavior: "Fixed",
          actualBehavior: "Broken",
        }}
      />
    );

    const input = screen.getByPlaceholderText(/support@catvision.ai/i);
    fireEvent.change(input, { target: { value: "engineer@catvision.ai" } });

    const submitBtn = screen.getByText("Send Email");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.email_to).toBe("engineer@catvision.ai");
      expect(body.channels).toEqual(["email"]);
    });
  });
});
