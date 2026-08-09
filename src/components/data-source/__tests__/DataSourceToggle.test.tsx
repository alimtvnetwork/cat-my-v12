// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceToggle } from "../DataSourceToggle";
import { __resetDataSourceForTests, getDataSource } from "@/lib/data-source";

describe("<DataSourceToggle />", () => {
  beforeEach(() => {
    __resetDataSourceForTests();
  });
  afterEach(() => {
    cleanup();
  });

  it("renders both options and defaults to seed", () => {
    render(<DataSourceToggle />);
    const seed = screen.getByLabelText(/use seed sample data/i);
    const backend = screen.getByLabelText(/use live backend/i);
    expect(seed.getAttribute("data-state")).toBe("on");
    expect(backend.getAttribute("data-state")).toBe("off");
  });

  it("switches to backend after confirming and probe success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    render(<DataSourceToggle fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await userEvent.click(screen.getByLabelText(/use live backend/i));
    await userEvent.click(await screen.findByRole("button", { name: /^switch$/i }));
    await waitFor(() => expect(getDataSource()).toBe("backend"));
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("stays on seed when probe fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 503, statusText: "Service Unavailable" }));
    render(<DataSourceToggle fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await userEvent.click(screen.getByLabelText(/use live backend/i));
    await userEvent.click(await screen.findByRole("button", { name: /^switch$/i }));
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled());
    expect(getDataSource()).toBe("seed");
  });
});
