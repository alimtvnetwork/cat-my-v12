import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 35 step 11 / Plan 88 follow-up: LayersToolbar. Primary actions
// (Delete, Import SVG) stay inline. Secondary/batch actions (Group,
// Ungroup, Merge, Mark present/absent) move into a "…" overflow menu so
// the toolbar stays scannable at HMI density.
import {
  AlertTriangle,
  Eye,
  EyeOff,
  FolderMinus,
  FolderPlus,
  Merge,
  MoreHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { type EditorRule, type EditorRuleKind } from "@/lib/editor/types";
import { LayerSourceType, PresenceModeType } from "@/lib/enums/editor";
import type { RuleGroup } from "@/lib/editor/store/rules-slice";
import { parseSvgSource } from "@/components/editor/design-mode/svg-import";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * RE-09 payload emitted by the Layers panel Import SVG button. Carries
 * both the raw uploaded source (so the receiver can persist a round-trip
 * `params.shapeSvg`) and the parsed path/viewBox for renderer wiring.
 */
export interface LayersImportedSvg {
  svg: string;
  svgPath: string;
  viewBoxW: number;
  viewBoxH: number;
  source: LayerSourceType;
  fileName: string;
}

export interface LayersToolbarProps {
  rules: readonly EditorRule[];
  groups: readonly RuleGroup[];
  selectedIds: readonly string[];
  onGroup: () => void;
  onUngroup: () => void;
  onMerge: () => void;
  onDelete: () => void;
  onSetAcceptance?: (mode: PresenceModeType.Present | PresenceModeType.Absent) => void;
  onImportSvg?: (payload: LayersImportedSvg) => void;
}

export function LayersToolbar({
  rules,
  groups,
  selectedIds,
  onGroup,
  onUngroup,
  onMerge,
  onDelete,
  onSetAcceptance,
  onImportSvg,
}: LayersToolbarProps) {
  const selected = rules.filter((r) => selectedIds.includes(r.id));
  const anyLocked = selected.some((r) => r.isLocked);
  const canGroup = selected.length >= 2;
  const canUngroup = groups.some((g) => g.ruleIds.some((id) => selectedIds.includes(id)));
  const firstKind = selected[0]?.kind;
  const canMerge =
    selected.length >= 2 && !!firstKind && selected.every((r) => r.kind === firstKind);
  const canDelete = selected.length >= 1 && !anyLocked;
  const canAcceptance = selected.length >= 1 && !anyLocked && !!onSetAcceptance;
  const canImport = !!onImportSvg && selectedIds.length >= 1 && !anyLocked;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleImportFile(file: File): Promise<void> {
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = parseSvgSource(text);
      onImportSvg?.({
        svg: text,
        svgPath: parsed.svgPath,
        viewBoxW: parsed.viewBoxW,
        viewBoxH: parsed.viewBoxH,
        source: parsed.source,
        fileName: file.name,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ClientLogger.error("[layers] SVG import failed", { fileName: file.name, error: msg });
      setImportError(msg);
    }
  }

  const readPresence = (r: EditorRule): "present" | "absent" | null => {
    const params = (r as unknown as { params?: Record<string, unknown> }).params;
    const raw = params?.acceptancePresence;

    return raw === "present" || raw === "absent" ? raw : null;
  };
  const overwriteMismatch = { present: 0, absent: 0 };
  let totalOverwrite = 0;
  for (const r of selected) {
    const existing = readPresence(r);

    if (!existing) continue;
    totalOverwrite += 1;

    if (existing !== "present") overwriteMismatch.present += 1;

    if (existing !== "absent") overwriteMismatch.absent += 1;
  }

  const hasOverflow = canGroup || canUngroup || canMerge || canAcceptance;

  return (
    <div
      role="toolbar"
      aria-label="Layer actions"
      className="editor-layers-toolbar flex items-center gap-hmi-1 px-hmi-2 py-hmi-1 border-b border-ca-border bg-ca-panel-2/40"
    >
      <ToolbarButton
        label={anyLocked ? "Cannot delete locked layers" : "Delete selected layers"}
        disabled={!canDelete}
        onClick={onDelete}
        icon={<Trash2 size={16} />}
        danger
      />
      {onImportSvg ? (
        <>
          <ToolbarButton
            label={
              canImport
                ? "Import SVG onto selected layers (stored as rule.params.shapeSvg)"
                : "Select at least one unlocked layer to import an SVG"
            }
            disabled={!canImport}
            onClick={() => fileRef.current?.click()}
            icon={<Upload size={16} />}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            data-testid="layers-import-svg-file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";

              if (file) void handleImportFile(file);
            }}
          />
          {importError ? (
            <span
              role="alert"
              title={importError}
              className="inline-flex items-center gap-[3px] px-hmi-1 py-[1px] text-[11px] font-semibold uppercase tracking-wide text-ca-err border border-ca-err/40 bg-ca-err/10 rounded-sm"
            >
              <AlertTriangle size={11} aria-hidden />
              <span>SVG error</span>
            </span>
          ) : null}
        </>
      ) : null}

      {hasOverflow ? (
        <>
          <div className="mx-hmi-1 h-4 w-px bg-ca-border" aria-hidden />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More layer actions"
                title="More layer actions"
                className="editor-rule-icon relative"
                data-testid="layers-overflow-trigger"
                data-warn={totalOverwrite > 0 ? "true" : undefined}
              >
                <MoreHorizontal size={16} />
                {totalOverwrite > 0 ? (
                  <AlertTriangle
                    size={9}
                    aria-hidden
                    className="absolute -top-[3px] -right-[3px] text-ca-warn drop-shadow-[0_0_2px_var(--color-ca-panel)]"
                  />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {onSetAcceptance ? (
                <>
                  <DropdownMenuLabel>Acceptance</DropdownMenuLabel>
                  <DropdownMenuItem
                    disabled={!canAcceptance}
                    onSelect={() => onSetAcceptance?.(PresenceModeType.Present)}
                  >
                    <Eye size={14} className="mr-2" aria-hidden />
                    Mark as must be present
                    {canAcceptance && overwriteMismatch.present > 0 ? (
                      <span className="ml-auto text-[10px] font-semibold uppercase text-ca-warn">
                        overwrites {overwriteMismatch.present}
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canAcceptance}
                    onSelect={() => onSetAcceptance?.(PresenceModeType.Absent)}
                  >
                    <EyeOff size={14} className="mr-2" aria-hidden />
                    Mark as must be absent
                    {canAcceptance && overwriteMismatch.absent > 0 ? (
                      <span className="ml-auto text-[10px] font-semibold uppercase text-ca-warn">
                        overwrites {overwriteMismatch.absent}
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuLabel>Grouping</DropdownMenuLabel>
              <DropdownMenuItem disabled={!canGroup} onSelect={onGroup}>
                <FolderPlus size={14} className="mr-2" aria-hidden />
                Group selected layers
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canUngroup} onSelect={onUngroup}>
                <FolderMinus size={14} className="mr-2" aria-hidden />
                Ungroup selected
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canMerge} onSelect={onMerge}>
                <Merge size={14} className="mr-2" aria-hidden />
                Merge selected rules
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}

      {/* "N selected" chip removed (v3.947.0): redundant with the row highlight. */}
    </div>
  );
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  icon,
  danger,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`editor-rule-icon relative ${danger ? "editor-rule-icon-danger" : ""} disabled:opacity-30`}
    >
      {icon}
    </button>
  );
}
