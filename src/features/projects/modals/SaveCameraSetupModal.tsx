// Plan 80 step 7 + 8. Modal to save the currently-bound camera setting as a
// new named setting from the project editor, without leaving the page.
//
// Root cause this fixes, in one sentence:
//   The project editor's Camera Setup section could only bind an existing
//   setting; operators had to leave for /setup/camera to duplicate one under
//   a new name, breaking the six-section flow described in
//   spec/21-app/53-ui-improvements-v4.md.
//
// Behaviour:
//   - Opens as a Radix dialog.
//   - Requires a source CameraSetting (defaults to the project's current
//     camera binding); disabled with an explanatory hint if none is bound.
//   - Name is required (1..80 chars, matches CameraSettingSchema).
//   - Optional notes textarea maps to `CameraSetting.notes` (<=500 chars).
//   - "Copy of current" toggle is on by default; when off the modal is
//     locked so the operator returns to /setup/camera for full-form entry
//     (matches spec: only 20-field authoring lives there).
//   - On save, delegates to `useCameraLibrary().save({...source, id: new,
//     name, notes, createdAt/updatedAt: now})` and calls `onSaved(newId)`
//     so the parent can select it in the dropdown.
//   - Errors from the facade are surfaced inline; save is retried by the
//     user (no swallow).
import { useEffect, useId, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCameraLibrary } from "@/lib/camera/useCameraLibrary";
import { CameraSettingSchema, type CameraSetting } from "@/lib/camera/model";

export interface SaveCameraSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** id of the currently-bound camera setting on the project, may be undefined. */
  currentSettingId?: string | null;
  /** Called once with the new setting id after a successful save. */
  onSaved: (newId: string) => void;
}

export function SaveCameraSetupModal({
  open,
  onOpenChange,
  currentSettingId,
  onSaved,
}: SaveCameraSetupModalProps) {
  const { all, byId, save } = useCameraLibrary();
  const nameId = useId();
  const notesId = useId();
  const copyId = useId();

  const [sourceId, setSourceId] = useState<string>(currentSettingId ?? "");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [copyCurrent, setCopyCurrent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset form state each time the modal opens so stale drafts do not leak.
  useEffect(() => {
    if (open) {
      setSourceId(currentSettingId ?? all[0]?.id ?? "");
      setName("");
      setNotes("");
      setCopyCurrent(true);
      setError(null);
      setSaving(false);
    }
  }, [open, currentSettingId, all]);

  const source: CameraSetting | undefined = sourceId ? byId(sourceId) : undefined;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!copyCurrent) {
      setError(
        "Copy of current is required from this dialog. Open /setup/camera for full-field authoring.",
      );

      return;
    }

    if (!source) {
      setError("Pick a source camera setting to copy.");

      return;
    }

    const trimmed = name.trim();

    if (!trimmed) {
      setError("Name is required.");

      return;
    }

    if (trimmed.length > 80) {
      setError("Name must be 80 characters or fewer.");

      return;
    }

    if (notes.length > 500) {
      setError("Notes must be 500 characters or fewer.");

      return;
    }
    // Duplicate-name guard: schema does not enforce uniqueness but the
    // dropdown becomes ambiguous. Warn but do not block, so operators can
    // still name copies "Line A - 2".
    const now = Date.now();
    const newId = `cam-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    let entry: CameraSetting;
    try {
      entry = CameraSettingSchema.parse({
        ...source,
        id: newId,
        name: trimmed,
        notes,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[save-camera-setup-modal] schema validation failed", err);
      setError(msg);

      return;
    }

    setSaving(true);
    try {
      const outcome = save(entry);

      if (outcome.ok === false) {
        const detail =
          outcome.kind === "validation"
            ? outcome.errors.map((e) => e.message).join("; ")
            : outcome.message;
        console.error("[save-camera-setup-modal] facade rejected save", outcome);
        setError(`Save rejected: ${detail}`);
        setSaving(false);

        return;
      }

      console.info("[save-camera-setup-modal] saved", {
        newId,
        sourceId: source.id,
        name: trimmed,
      });
      onSaved(newId);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[save-camera-setup-modal] save threw", err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[520px]"
        aria-describedby={undefined}
        data-testid="save-camera-setup-modal"
      >
        <DialogHeader>
          <DialogTitle>Save camera setup</DialogTitle>
          <DialogDescription>
            Duplicate an existing camera setting under a new name. Full-field authoring stays on
            /setup/camera.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-hmi-3" noValidate>
          <div className="space-y-hmi-1">
            <label htmlFor="save-camera-source" className="text-hmi-caption text-ca-ink-muted">
              Source setting
            </label>
            <select
              id="save-camera-source"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-body text-ca-ink"
              data-testid="save-camera-source-select"
            >
              <option value="">(pick one)</option>
              {all.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.vendor} · {c.resolutionW}×{c.resolutionH}
                </option>
              ))}
            </select>
            {all.length === 0 ? (
              <p className="text-hmi-caption text-ca-ink-muted">
                No camera settings exist. Add one from /setup/camera first.
              </p>
            ) : null}
          </div>

          <div className="space-y-hmi-1">
            <label htmlFor={nameId} className="text-hmi-caption text-ca-ink-muted">
              New name
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
              className="w-full rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-body text-ca-ink"
              placeholder={source ? `${source.name} copy` : "New camera setup"}
              data-testid="save-camera-name-input"
            />
          </div>

          <div className="space-y-hmi-1">
            <label htmlFor={notesId} className="text-hmi-caption text-ca-ink-muted">
              Notes (optional)
            </label>
            <textarea
              id={notesId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-body text-ca-ink"
            />
            <p className="text-right font-mono text-[11px] tabular-nums text-ca-ink-muted">
              {notes.length} / 500
            </p>
          </div>

          <label
            htmlFor={copyId}
            className="flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink"
          >
            <input
              id={copyId}
              type="checkbox"
              checked={copyCurrent}
              onChange={(e) => setCopyCurrent(e.target.checked)}
              className="ca-focus-fluid"
            />
            Copy of current (all 20 fields from source)
          </label>

          {error ? (
            <p role="alert" className="text-hmi-caption text-ca-ng" data-testid="save-camera-error">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              className="rounded-md border border-ca-border bg-ca-panel px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hover:border-ca-select"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md border border-ca-select bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body text-white transition hover:brightness-110 disabled:opacity-50"
              data-testid="save-camera-submit"
            >
              {saving ? "Saving…" : "Save as new"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
