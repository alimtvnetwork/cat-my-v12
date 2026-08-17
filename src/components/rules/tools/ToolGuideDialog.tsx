// Extended per-tool documentation modal, opened by the "View full guide"
// button inside each Tools palette tooltip. Purely presentational; the
// caller owns open state and which tool to render.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TOOL_GUIDES } from "./toolGuides";
import { TOOL_TOOLTIPS, type ToolId } from "./toolTooltipMap";

interface Props {
  toolId: ToolId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToolGuideDialog({ toolId, open, onOpenChange }: Props): React.JSX.Element | null {
  const tip = toolId ? TOOL_TOOLTIPS[toolId] : null;
  const guide = toolId ? TOOL_GUIDES[toolId] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="tool-guide-dialog"
        className="max-h-[80vh] max-w-[560px] overflow-y-auto"
      >
        {tip && guide ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[15px]">
                <span>{tip.title}</span>
                <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 py-[1px] text-[10px] font-mono tabular-nums text-ca-ink-muted">
                  {tip.hotkey.toUpperCase()}
                </kbd>
              </DialogTitle>
              <DialogDescription className="text-[13px]">{guide.summary}</DialogDescription>
            </DialogHeader>
            <div className="mt-2 space-y-4 text-[13px] leading-relaxed">
              {guide.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ca-ink-muted">
                    {section.heading}
                  </h3>
                  {section.paragraphs?.map((p, i) => (
                    <p key={i} className="mb-1 last:mb-0 text-ca-ink">
                      {p}
                    </p>
                  ))}
                  {section.bullets && section.bullets.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ca-ink marker:text-ca-ink-muted">
                      {section.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
