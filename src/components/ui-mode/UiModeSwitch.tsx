import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";

export function UiModeSwitch(): React.JSX.Element | null {
  const { mode, toggleMode } = useUiMode();
  const isStandard = mode === UiModeType.Standard;
  const modeName = isStandard ? "Standard" : "Modern";
  const explanation = isStandard
    ? "Standard is on. This is the production inspection shell. Click to switch to Modern, the earlier section layout."
    : "Modern is on. This is the earlier section layout. Click to switch to Standard, the production inspection shell.";

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleMode}
            aria-label={`Toggle UI mode. Current mode: ${modeName}. ${explanation}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-select"
          >
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                isStandard ? "bg-ca-select" : "bg-ca-ink-muted/40"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  isStandard ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-200">
              {modeName}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[260px] border border-white/15 bg-[#0f172a] px-3 py-2 text-left text-xs leading-snug text-slate-100"
        >
          {explanation}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
