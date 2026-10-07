import type { EditorRule } from "@/lib/editor/types";

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  rulesetIds: string[];
  /**
   * Inspected device binding: references the target physical chip, circuit board,
   * or DUT (Device Under Test) this project is configured to inspect. Cleared via `setProjectDevice(id, null)`.
   */
  deviceId?: string;
  /** Plan 64 step 72: optional attachments captured at create time. */
  cameraName?: string;
  /**
   * Plan 78 slice 4 (I-SU-05 bind): reference to a CameraSetting from
   * `src/lib/camera/store.ts` library. Optional so pre-binding projects
   * hydrate untouched. Cleared via `setProjectCamera(id, null)`.
   */
  cameraSettingId?: string;
  categoryNames?: string[];
  /**
   * Plan 79 step 44 (V4 Mics Settings binding): optional reference to a
   * `MicSettings` entry from `src/lib/mic-settings/facade.ts`. Optional so
   * pre-binding projects hydrate untouched. Cleared via
   * `setProjectMicSettings(id, null)`.
   */
  micSettingsId?: string;
  /**
   * Plan 67 step 39 (PR-03): per-project AI Testing configuration.
   * All fields optional so existing persisted projects hydrate untouched.
   */
  aiSettings?: {
    model?: string;
    temperature?: number;
    systemPrompt?: string;
  };
}

export interface RuleSet {
  id: string;
  projectId: string;
  name: string;
  imageRef?: string;
  rules: EditorRule[];
  categoryName?: string;
  overrideMode?: "direct" | "reference" | "snapshot";
  parentRulesetId?: string;
}
