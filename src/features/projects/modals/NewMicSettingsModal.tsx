// Plan 80 steps 9 + 10. Modal to create a new MicSettings entry from the
// project editor without leaving the six-section flow.
//
// Root cause this fixes, in one sentence:
//   The Mics Settings "New…" dialog lived as an inline component inside
//   ProjectEditorSections.tsx, bloating that file past 1000 lines and
//   preventing isolated unit tests for the JSON-params validation path.
//
// Behaviour:
//   - Renders as a Radix dialog (aria-labelled).
//   - Name required, 1..80 chars.
//   - Params textarea is validated inline via JSON.parse; the error is
//     shown next to the field and Create is disabled until it parses.
//   - Empty textarea is treated as "no params" (defaults to {}).
//   - Non-object JSON (arrays, primitives, null) is rejected with a
//     specific error so the user does not save garbage into the facade.
//   - onSubmit receives the parsed object; the parent persists via
//     MicSettingsFacade so this modal stays UI-only and testable.
//   - Errors thrown by the parent are surfaced in the same inline slot.
import { useId, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface NewMicSettingsSubmit {
  name: string;
  params: Record<string, unknown>;
}

export interface NewMicSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after inline validation succeeds. May throw / reject to surface an inline error. */
  onSubmit: (data: NewMicSettingsSubmit) => Promise<void> | void;
}

interface ParseResult {
  ok: boolean;
  value: Record<string, unknown>;
  error: string | null;
}

export function validateMicParamsJson(raw: string): ParseResult {
  const trimmed = raw.trim();

  if (!trimmed) return { ok: true, value: {}, error: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return {
      ok: false,
      value: {},
      error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, value: {}, error: "Params must be a JSON object." };
  }

  return { ok: true, value: parsed as Record<string, unknown>, error: null };
}

export function NewMicSettingsModal({ open, onOpenChange, onSubmit }: NewMicSettingsModalProps): React.JSX.Element | null {
  const [name, setName] = useState("");
  const [json, setJson] = useState("{}");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameId = useId();
  const jsonId = useId();
  const jsonErrId = useId();

  const parsed = useMemo(() => validateMicParamsJson(json), [json]);
  const nameValid = name.trim().length > 0 && name.trim().length <= 80;
  const canSubmit = nameValid && parsed.ok && !busy;

  function reset(): void {
    setName("");
    setJson("{}");
    setSubmitError(null);
    setBusy(false);
  }

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) return;
    setSubmitError(null);
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), params: parsed.value });
      console.info("[NewMicSettingsModal] submitted", { name: name.trim() });
      reset();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[NewMicSettingsModal] submit failed", e);
      setSubmitError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent data-testid="new-mic-settings-modal" className="max-w-md">
        <DialogHeader>
          <DialogTitle>New mics setting</DialogTitle>
          <DialogDescription>
            Name the setting and provide an optional JSON parameter object. The setting is bound to
            the current project on save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-hmi-3">
          <label className="block text-hmi-caption text-ca-ink-muted" htmlFor={nameId}>
            Name
            <input
              id={nameId}
              data-testid="new-mic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="mt-1 w-full rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-hmi-body text-ca-ink"
              autoFocus
            />
          </label>
          <label className="block text-hmi-caption text-ca-ink-muted" htmlFor={jsonId}>
            Params (JSON object)
            <textarea
              id={jsonId}
              data-testid="new-mic-json"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              aria-invalid={parsed.ok === false}
              aria-describedby={parsed.ok ? undefined : jsonErrId}
              rows={6}
              className="mt-1 w-full rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 font-mono text-hmi-body text-ca-ink"
            />
          </label>
          {parsed.ok === false ? (
            <p
              id={jsonErrId}
              role="alert"
              data-testid="new-mic-json-error"
              className="text-hmi-caption text-ca-ng"
            >
              {parsed.error}
            </p>
          ) : null}
          {submitError ? (
            <p
              role="alert"
              data-testid="new-mic-submit-error"
              className="text-hmi-caption text-ca-ng"
            >
              {submitError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="new-mic-create"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="rounded-md border border-ca-border bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : "Create + bind"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
