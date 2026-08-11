// Plan 87 Step 13: standardized toast surface. All non-error notifications
// go through these wrappers so tone, duration, and shape stay consistent
// across the app. Error toasts stay in `src/lib/errors/notify.ts` because
// they carry correlation ids, retry callbacks, and store capture.
//
// Rules:
//   - Success:  4 s, single-line title, optional description.
//   - Info:     5 s, neutral.
//   - Warning:  6 s, orange (sonner default warning styling).
//   - Actionable: caller supplies { label, onClick }, duration bumps to 8 s
//     so the user has time to react (Undo, View, etc.).
//
// Do NOT call `toast(...)` / `toast.success(...)` directly from feature code
// once migrated; call these helpers instead. The one exception is
// `src/lib/errors/notify.ts`, which owns the error path end-to-end.

import { toast } from "sonner";

type ToastId = string | number;

export interface NotifyOptions {
  description?: string;
  /** Optional single-action chip (Undo, View, Open, etc.). */
  action?: { label: string; onClick: () => void };
  /** Override default duration in ms. */
  durationMs?: number;
  /** Stable id so successive calls replace instead of stacking. */
  id?: ToastId;
}

const DURATIONS = {
  success: 4_000,
  info: 5_000,
  warning: 6_000,
  actionable: 8_000,
} as const;

function base(opts: NotifyOptions, fallback: number) {
  return {
    description: opts.description,
    duration: opts.durationMs ?? (opts.action ? DURATIONS.actionable : fallback),
    id: opts.id,
    action: opts.action
      ? {
          label: opts.action.label,
          onClick: () => {
            try {
              opts.action?.onClick();
            } catch (e) {
              console.error("[notify] action handler threw", e);
            }
          },
        }
      : undefined,
  };
}

export function notifySuccess(title: string, opts: NotifyOptions = {}): ToastId {
  return toast.success(title, base(opts, DURATIONS.success));
}

export function notifyInfo(title: string, opts: NotifyOptions = {}): ToastId {
  return toast(title, base(opts, DURATIONS.info));
}

export function notifyWarning(title: string, opts: NotifyOptions = {}): ToastId {
  return toast.warning(title, base(opts, DURATIONS.warning));
}

/** Dismiss a toast raised by any of the helpers above. */
export function dismissNotification(id: ToastId): void {
  toast.dismiss(id);
}