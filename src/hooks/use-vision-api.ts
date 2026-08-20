import { useQueryClient } from "@tanstack/react-query";
import { useAppQuery } from "@/lib/wrappers/use-app-query";
import { useAppMutation } from "@/lib/wrappers/use-app-mutation";
import { visionFacade } from "@/lib/facades/vision-facade";
import type { CameraStatusResponse } from "@/lib/facades/domain-facade";
import type { ReferenceImage } from "@/types/vision/ReferenceImage";

export const visionKeys = {
  all: ["vision"] as const,
  status: (cameraId: string) => [...visionKeys.all, "status", cameraId] as const,
  reference: (projectId: string) => [...visionKeys.all, "reference", projectId] as const,
};

export function useCameraStatus(cameraId: string) {
  return useAppQuery<CameraStatusResponse>({
    queryKey: visionKeys.status(cameraId),
    queryFn: () => visionFacade.getCameraStatus(cameraId),
    refetchInterval: 5000,
  });
}

export function useCaptureImage() {
  return useAppMutation<ReferenceImage, Error, string>({
    mutationFn: (cameraId: string) => visionFacade.captureImage(cameraId),
  });
}

export function useUpdateCameraSetting() {
  return useAppMutation<void, Error, { cameraId: string; key: string; value: number | string }>({
    mutationFn: ({ cameraId, key, value }) =>
      visionFacade.updateCameraSetting(cameraId, key, value),
  });
}

export function useUpdateTriggerMode() {
  return useAppMutation<void, Error, { cameraId: string; mode: string }>({
    mutationFn: ({ cameraId, mode }) => visionFacade.updateTriggerMode(cameraId, mode),
  });
}

export function useReferenceImage(projectId: string) {
  return useAppQuery<ReferenceImage | undefined>({
    queryKey: visionKeys.reference(projectId),
    queryFn: () => visionFacade.getReference(projectId),
  });
}

export function useSetReferenceImage() {
  const qc = useQueryClient();
  return useAppMutation<void, Error, { projectId: string; imageId: number }>({
    mutationFn: ({ projectId, imageId }) => visionFacade.setReference(projectId, imageId),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: visionKeys.reference(projectId) });
    },
  });
}
