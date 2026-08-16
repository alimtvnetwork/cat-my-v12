import type { VisionFacade, CameraStatusResponse } from "./domain-facade";
import type { ReferenceImage } from "@/types/vision/ReferenceImage";
import { getActiveProfile } from "@/lib/seed/active-profile";
import { fetchBackend } from "@/lib/backend/http";
import { EnvelopeError } from "@/lib/backend/envelope";

class MockVisionFacade implements VisionFacade {
  async captureImage(cameraId: string): Promise<ReferenceImage> {
    return {
      id: `ref-mock-capture-${Date.now()}`,
      url: "/assets/seeds/default-pcb.jpg", // Seed mode parity
      width: 1920,
      height: 1080,
    };
  }

  async getCameraStatus(cameraId: string): Promise<CameraStatusResponse> {
    return {
      status: "connected",
      message: "Seed mode mock camera connected",
    };
  }

  async getReference(projectId: string): Promise<ReferenceImage | undefined> {
    return {
      id: "ref-default-pcb-1",
      url: "/assets/seeds/default-pcb.jpg",
      width: 1920,
      height: 1080,
    };
  }

  async setReference(projectId: string, imageId: string): Promise<void> {
    // Mock no-op for seed mode parity
  }
}

class ApiVisionFacade implements VisionFacade {
  async captureImage(cameraId: string): Promise<ReferenceImage> {
    const res = await fetchBackend<ReferenceImage>("camera/capture", {
      method: "POST",
      body: JSON.stringify({ cameraId })
    });
    if (!res.Results || res.Results.length === 0) {
      throw new Error("No image returned from capture");
    }
    return res.Results[0];
  }

  async getCameraStatus(cameraId: string): Promise<CameraStatusResponse> {
    const res = await fetchBackend<CameraStatusResponse>(`camera/status?cameraId=${cameraId}`);
    if (!res.Results || res.Results.length === 0) {
      throw new Error("No status returned");
    }
    return res.Results[0];
  }

  async getReference(projectId: string): Promise<ReferenceImage | undefined> {
    const res = await fetchBackend<ReferenceImage | undefined>(`images/reference?projectId=${projectId}`);
    if (!res.Results || res.Results.length === 0 || !res.Results[0]) {
      return undefined;
    }
    return res.Results[0] as ReferenceImage;
  }

  async setReference(projectId: string, imageId: string): Promise<void> {
    await fetchBackend<void>(`images/reference`, {
      method: "PUT",
      body: JSON.stringify({ projectId, imageId })
    });
  }
}

export const visionFacade: VisionFacade = new Proxy({} as VisionFacade, {
  get(target, prop: keyof VisionFacade) {
    const profile = getActiveProfile();
    const instance = profile ? new MockVisionFacade() : new ApiVisionFacade();
    return instance[prop];
  }
});
