// @vitest-environment jsdom
// Plan 82. Reordering an image sample from the UI must update both the
// rendered DOM order (visible thumbnail list) and the persisted facade
// ordering (`listByProject` after the click, and after a fresh facade
// instance rehydrates from the same repo). This test protects the
// "single source of truth" contract between `ImageSamplesSection` and
// `ImageSamplesFacade`.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import { ImageSamplesSection } from "../ProjectEditorSections";
import {
  makeImageSamplesFacade,
  __setImageSamplesFacadeForTests,
} from "@/lib/image-samples/facade";
import type { ImageSample } from "@/lib/image-samples/model";
import {
  __setProjectRepositoryFacadeForTests,
  type ProjectRepositoryFacade,
} from "@/lib/projects/facade";
import type { Project } from "@/lib/projects/store";

function memoryRepo(): ProjectRepositoryFacade {
  const s = new Map<string, string>();

  return {
    kind: "memory",
    async readItem(k) {
      return s.get(k) ?? null;
    },
    async writeItem(k, v) {
      s.set(k, v);
    },
    async removeItem(k) {
      s.delete(k);
    },
  };
}

const DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function sample(id: string, orderIndex: number): ImageSample {
  return {
    id,
    projectId: "p1",
    name: `sample-${id}`,
    dataUrl: DATA_URL,
    width: 1,
    height: 1,
    byteSize: 128,
    capturedAt: "2026-07-18T00:00:00.000Z",
    source: "upload",
    orderIndex,
  };
}

function makeProject(): Project {
  // cameraSettingId=null means the `watchCameraDevices` effect early-returns,
  // so this test does not need to mock the media devices API.
  return {
    id: "p1",
    name: "Test project",
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
    rulesetIds: [],
    cameraSettingId: null,
    micSettingsId: null,
  } as unknown as Project;
}

let repo: ProjectRepositoryFacade;

beforeEach(() => {
  __setImageSamplesFacadeForTests(null);
  repo = memoryRepo();
  __setProjectRepositoryFacadeForTests(repo);
});

async function seedThree() {
  const f = makeImageSamplesFacade();
  await f.save(sample("a", 0));
  await f.save(sample("b", 1));
  await f.save(sample("c", 2));

  return f;
}

function readRowOrder(): string[] {
  const rows = screen.getAllByTestId("sample-row");

  return rows.map((r) => r.querySelector("img")?.getAttribute("alt") ?? "");
}

describe("ImageSamplesSection reordering", () => {
  afterEach(() => cleanup());

  it("move-down on the first row updates the rendered DOM order", async () => {
    await seedThree();
    render(<ImageSamplesSection project={makeProject()} />);
    await waitFor(() => expect(screen.getAllByTestId("sample-row")).toHaveLength(3));
    expect(readRowOrder()).toEqual(["sample-a", "sample-b", "sample-c"]);

    const firstDown = screen.getAllByTestId("sample-move-down")[0];
    await act(async () => {
      fireEvent.click(firstDown);
    });

    await waitFor(() => expect(readRowOrder()).toEqual(["sample-b", "sample-a", "sample-c"]));
  });

  it("move-up on the last row updates the rendered DOM order", async () => {
    await seedThree();
    render(<ImageSamplesSection project={makeProject()} />);
    await waitFor(() => expect(screen.getAllByTestId("sample-row")).toHaveLength(3));

    const ups = screen.getAllByTestId("sample-move-up");
    await act(async () => {
      fireEvent.click(ups[ups.length - 1]);
    });

    await waitFor(() => expect(readRowOrder()).toEqual(["sample-a", "sample-c", "sample-b"]));
  });

  it("persists the new order through the facade with contiguous orderIndex", async () => {
    const f = await seedThree();
    render(<ImageSamplesSection project={makeProject()} />);
    await waitFor(() => expect(screen.getAllByTestId("sample-row")).toHaveLength(3));

    const firstDown = screen.getAllByTestId("sample-move-down")[0];
    await act(async () => {
      fireEvent.click(firstDown);
    });

    await waitFor(() => {
      const rows = f.listByProject("p1");
      expect(rows.map((s) => s.id)).toEqual(["b", "a", "c"]);
      expect(rows.map((s) => s.orderIndex)).toEqual([0, 1, 2]);
    });
  });

  it("survives a fresh facade rehydrate against the same repo", async () => {
    await seedThree();
    render(<ImageSamplesSection project={makeProject()} />);
    await waitFor(() => expect(screen.getAllByTestId("sample-row")).toHaveLength(3));

    const firstDown = screen.getAllByTestId("sample-move-down")[0];
    await act(async () => {
      fireEvent.click(firstDown);
    });
    await waitFor(() => expect(readRowOrder()).toEqual(["sample-b", "sample-a", "sample-c"]));

    // Simulate a page refresh: drop the singleton, keep the repo, hydrate
    // a brand new facade from persisted state, and assert the order held.
    __setImageSamplesFacadeForTests(null);
    __setProjectRepositoryFacadeForTests(repo);
    const fresh = makeImageSamplesFacade();
    await fresh.__hydrate();
    expect(fresh.listByProject("p1").map((s) => s.id)).toEqual(["b", "a", "c"]);
  });
});
