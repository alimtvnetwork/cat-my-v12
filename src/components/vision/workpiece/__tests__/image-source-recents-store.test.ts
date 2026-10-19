import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_RECENT_IMAGE_SOURCES,
  useImageSourceRecentsStore,
} from "../image-source-recents-store";

describe("image-source-recents-store", () => {
  beforeEach(() => {
    useImageSourceRecentsStore.setState({ recents: [] });
  });

  it("keeps the last 5 entries, newest first", () => {
    const { pushRecent } = useImageSourceRecentsStore.getState();

    for (let i = 1; i <= 7; i += 1) {
      pushRecent({ dataUrl: `data:image/jpeg;base64,${i}`, label: `img-${i}`, kind: "upload" });
    }

    const recents = useImageSourceRecentsStore.getState().recents;

    expect(recents).toHaveLength(MAX_RECENT_IMAGE_SOURCES);
    expect(recents[0].label).toBe("img-7");
    expect(recents[MAX_RECENT_IMAGE_SOURCES - 1].label).toBe("img-3");
  });

  it("moves an already-cached image to the front instead of duplicating it", () => {
    const { pushRecent } = useImageSourceRecentsStore.getState();

    pushRecent({ dataUrl: "data:a", label: "a", kind: "upload" });
    pushRecent({ dataUrl: "data:b", label: "b", kind: "camera" });
    pushRecent({ dataUrl: "data:a", label: "a", kind: "upload" });

    const recents = useImageSourceRecentsStore.getState().recents;

    expect(recents).toHaveLength(2);
    expect(recents[0].dataUrl).toBe("data:a");
    expect(recents[1].dataUrl).toBe("data:b");
  });

  it("removes an entry by id", () => {
    const { pushRecent, removeRecent } = useImageSourceRecentsStore.getState();

    pushRecent({ dataUrl: "data:a", label: "a", kind: "upload" });
    const id = useImageSourceRecentsStore.getState().recents[0].id;
    removeRecent(id);

    expect(useImageSourceRecentsStore.getState().recents).toHaveLength(0);
  });
});
