/**
 * Plan 64 step 83: New Rule Set dialog with auto-name + clone modes.
 * Root cause: existing "new ruleset" path is per-project image upload; no
 * top-level Setup > Rules creation existed. Modes: New, Clone Reference,
 * Clone Snapshot. Persistence lands with step 85.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cloneRulesetReference,
  cloneRulesetSnapshot,
  nextRuleSetName,
} from "@/lib/rulesets-clone.functions";

export enum ModeType {
  New = "new",
  Reference = "reference",
  Snapshot = "snapshot",
}
export type Mode = ModeType;

export interface NewRuleSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNames: readonly string[];
  cloneCandidates?: ReadonlyArray<{ id: string; name: string }>;
  onCreated?: (result: { rulesetId: string; name: string; mode: Mode }) => void;
}

export function NewRuleSetDialog({
  open,
  onOpenChange,
  existingNames,
  cloneCandidates = [],
  onCreated,
}: NewRuleSetDialogProps) {
  const cloneRef = useServerFn(cloneRulesetReference);
  const cloneSnap = useServerFn(cloneRulesetSnapshot);
  const defaultName = useMemo(() => nextRuleSetName(existingNames), [existingNames]);
  const [name, setName] = useState(defaultName);
  const [mode, setMode] = useState<Mode>(ModeType.New);
  const [sourceId, setSourceId] = useState<string>(cloneCandidates[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (mode === "new") {
        const rulesetId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `rs-${Date.now().toString(36)}`;
        console.info("[NewRuleSetDialog] synthetic new", { rulesetId, name });
        onCreated?.({ rulesetId, name, mode });
      } else {
        if (!sourceId) throw new Error("Pick a rule set to clone from");
        const fn = mode === "reference" ? cloneRef : cloneSnap;
        const res = await fn({ data: { sourceRulesetId: sourceId, name } });
        onCreated?.({ rulesetId: res.rulesetId, name, mode });
      }

      onOpenChange(false);
    } catch (e) {
      console.error("[NewRuleSetDialog] submit failed", e);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Rule Set</DialogTitle>
          <DialogDescription>
            Create a blank rule set or clone from an existing one. Reference clones inherit parent
            edits; Snapshot clones are frozen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="rs-name">Name</Label>
            <Input id="rs-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Mode</legend>
            {([ModeType.New, ModeType.Reference, ModeType.Snapshot] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="rs-mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                {m === ModeType.New && "New (blank)"}
                {m === ModeType.Reference && "Clone as Reference (inherits parent edits)"}
                {m === ModeType.Snapshot && "Clone as Snapshot (frozen copy)"}
              </label>
            ))}
          </fieldset>

          {mode !== ModeType.New && (
            <div>
              <Label htmlFor="rs-source">Source rule set</Label>
              <select
                id="rs-source"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {cloneCandidates.length === 0 && <option value="">No candidates</option>}
                {cloneCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || name.trim() === ""}>
            {busy ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
