// Plan 81 step 13. Two-column create/duplicate dialog for the rules
// library. Left column collects name + kind + optional pocket size; right
// column shows a live preview of the row that will land in the list, so
// operators see the badge, dep count, and pocket chip before committing.
// Rename is not modal (auto-save in RuleMetadataBar owns it). Duplicate
// reuses this same dialog with a `sourceName` prop so the initial name is
// "Copy of <source>".

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, FolderOpen, Sparkles } from "lucide-react";
import { RulePreviewThumbnail } from "@/components/rules/RulePreviewThumbnail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ALL_POCKET_SIZES,
  type PocketSize,
  type Rule,
  type RuleId,
  type RuleCondition,
} from "@/lib/rules/model";

export interface RuleCreateSubmit {
  name: string;
  isCategory: boolean;
  pocketSize?: PocketSize;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the trimmed submission. Parent handles facade save. */
  onSubmit: (payload: RuleCreateSubmit) => Promise<void> | void;
  /** Names already in the library (lowercased) so we can flag duplicates inline. */
  existingNames: readonly string[];
  /** When set, the dialog is in "Duplicate" mode. */
  sourceName?: string;
  /**
   * Plan 83 backlog 15b. When duplicating, the source rule's conditions
   * are threaded in so the preview thumbnail reflects the copy's ROIs
   * instead of rendering as an empty shape. Never mutated here.
   */
  sourceConditions?: readonly RuleCondition[];
  /** Initial kind. Category disables the pocket size field. */
  initialKind?: "Rule" | "Category";
  /** Limit which kind can be created in route-specific flows. */
  kindMode?: "both" | "rule" | "category";
}

export function RuleCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  existingNames,
  sourceName,
  sourceConditions,
  initialKind = "Rule",
  kindMode = "both",
}: Props) {
  const titleId = useId();
  const descId = useId();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"Rule" | "Category">(initialKind);
  const [pocketSize, setPocketSize] = useState<PocketSize | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const availableKinds = useMemo(() => {
    if (kindMode === "rule") return ["Rule"] as const;

    if (kindMode === "category") return ["Category"] as const;

    return ["Rule", "Category"] as const;
  }, [kindMode]);
  const isClosed = !open;

  useEffect(() => {
    if (isClosed) return;
    setKind(kindMode === "rule" ? "Rule" : kindMode === "category" ? "Category" : initialKind);
    setPocketSize(undefined);
    setName(sourceName ? `Copy of ${sourceName}` : "");
    setSubmitting(false);
  }, [open, initialKind, kindMode, sourceName]);

  const trimmed = name.trim();
  const takenSet = useMemo(
    () => new Set(existingNames.map((n) => n.toLowerCase())),
    [existingNames],
  );
  const isDuplicate = trimmed.length > 0 && takenSet.has(trimmed.toLowerCase());
  const nameTooShort = trimmed.length === 0;
  const canSubmit = !nameTooShort && !isDuplicate && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: trimmed,
        isCategory: kind === "Category",
        pocketSize: kind === "Rule" ? pocketSize : undefined,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const modeLabel = sourceName ? "Duplicate" : "New";

  // Plan 83 backlog items 15 + 15b. Preview-only Rule shape so the
  // dialog's right column renders the same `RulePreviewThumbnail` the
  // list rows use. Synthetic id / timestamps are discarded before facade
  // save. When duplicating, `sourceConditions` carries the source rule's
  // ROIs into the preview so operators see the shapes they are cloning.
  const previewRule: Rule = useMemo(
    () => ({
      id: "__preview__" as RuleId,
      name: trimmed || (kind === "Rule" ? "New Rule" : "New Category"),
      isCategory: kind === "Category",
      pocketSize: kind === "Rule" ? pocketSize : undefined,
      appliesBefore: [],
      conditions: sourceConditions ? sourceConditions.map((c) => ({ ...c })) : [],
      createdAt: "1970-01-01T00:00:00.000Z",
      updatedAt: "1970-01-01T00:00:00.000Z",
    }),
    [trimmed, kind, pocketSize, sourceConditions],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="max-w-[720px] p-0"
        data-testid="rule-create-dialog"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-ca-border px-hmi-4 py-hmi-3">
            <DialogTitle id={titleId} className="text-hmi-h2 font-semibold text-ca-ink">
              {modeLabel} {kind}
            </DialogTitle>
            <DialogDescription id={descId} className="text-hmi-body text-ca-ink-muted">
              {sourceName
                ? `Create a copy of "${sourceName}". Dependencies are not copied.`
                : "Create a new entry in the shared rules library."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_260px]">
            {/* Form column */}
            <div className="space-y-hmi-3 px-hmi-4 py-hmi-3">
              <fieldset className="space-y-hmi-1">
                <legend className="text-hmi-body text-ca-ink-muted">Kind</legend>
                <div role="radiogroup" aria-label="Entry kind" className="flex gap-hmi-2">
                  {availableKinds.map((k) => {
                    const active = kind === k;
                    const Icon = k === "Rule" ? Sparkles : FolderOpen;

                    return (
                      <label
                        key={k}
                        className={`inline-flex flex-1 cursor-pointer items-center gap-hmi-2 rounded-sm border px-hmi-3 py-hmi-2 text-hmi-body transition-colors ${
                          active
                            ? "border-ca-select bg-ca-panel text-ca-ink"
                            : "border-ca-border bg-ca-panel-2 text-ca-ink-muted hover:border-ca-select hover:text-ca-ink"
                        }`}
                      >
                        <input
                          type="radio"
                          name="rule-kind"
                          value={k}
                          checked={active}
                          onChange={() => setKind(k)}
                          className="sr-only"
                        />
                        <Icon size={14} aria-hidden />
                        {k}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="flex flex-col gap-hmi-1">
                <span className="text-hmi-body text-ca-ink-muted">Name</span>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  maxLength={64}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={isDuplicate || nameTooShort}
                  aria-describedby={isDuplicate ? `${titleId}-dup` : undefined}
                  className="h-9 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
                  data-testid="rule-create-name-input"
                  placeholder={
                    kind === "Rule" ? "e.g. Reject shallow bores" : "e.g. Bore inspection"
                  }
                />
                {isDuplicate ? (
                  <span id={`${titleId}-dup`} role="alert" className="text-[12px] text-ca-danger">
                    A {kind.toLowerCase()} with this name already exists.
                  </span>
                ) : (
                  <span className="font-mono text-[12px] tabular-nums text-ca-ink-muted">
                    {trimmed.length}/64
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-hmi-1">
                <span className="text-hmi-body text-ca-ink-muted">
                  Pocket size {kind === "Category" ? "(rules only)" : "(optional)"}
                </span>
                <select
                  value={pocketSize ?? ""}
                  disabled={kind === "Category"}
                  onChange={(e) =>
                    setPocketSize(
                      e.target.value ? (Number(e.target.value) as PocketSize) : undefined,
                    )
                  }
                  className="h-9 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none disabled:opacity-50"
                  data-testid="rule-create-pocket-select"
                >
                  <option value="">Unset</option>
                  {ALL_POCKET_SIZES.map((p) => (
                    <option key={p} value={p}>{`P${p}`}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Preview column */}
            <aside
              aria-label="Preview"
              className="border-t border-ca-border bg-ca-panel-2 px-hmi-4 py-hmi-3 md:border-l md:border-t-0"
            >
              <div className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                Preview
              </div>
              <div className="mt-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-3 py-hmi-2">
                <div className="flex items-center gap-hmi-2">
                  <RulePreviewThumbnail rule={previewRule} />
                  <span
                    className={`inline-flex h-5 min-w-[64px] shrink-0 items-center justify-center rounded-sm px-hmi-2 text-[11px] font-semibold uppercase tracking-wide ${
                      kind === "Category"
                        ? "bg-ca-panel-2 text-ca-chrome-ink"
                        : "bg-ca-select text-ca-bg"
                    }`}
                  >
                    {kind}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-hmi-body text-ca-ink">
                    {trimmed || (kind === "Rule" ? "New Rule" : "New Category")}
                  </span>
                  <span className="inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 font-mono text-[13px] tabular-nums text-ca-ink-muted">
                    <ArrowRight size={11} aria-hidden />0
                  </span>
                  {kind === "Rule" && pocketSize ? (
                    <span className="rounded-sm border border-ca-border px-hmi-2 py-0.5 font-mono text-[11px] tabular-nums text-ca-ink-muted">
                      P{pocketSize}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-hmi-3 text-hmi-caption text-ca-ink-muted">
                {kind === "Category"
                  ? "Categories group rules and can appear in appliesBefore chains just like rules."
                  : "Rules run in the order defined by appliesBefore. You can add dependencies after creation."}
              </p>
            </aside>
          </div>

          <DialogFooter className="border-t border-ca-border px-hmi-4 py-hmi-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-ink hover:border-ca-select"
              data-testid="rule-create-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="rule-create-submit"
            >
              {submitting ? "Creating..." : `${modeLabel} ${kind}`}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
