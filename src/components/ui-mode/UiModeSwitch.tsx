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
    <div className="flex items-center gap-2 font-sans select-none">
      <span
        className={`text-xs transition-colors ${
          isStandard ? "text-ca-ink-muted font-normal" : "text-ca-ink font-semibold"
        }`}
      >
        Modern
      </span>

      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleMode}
              aria-label={`Toggle UI mode. Current mode: ${modeName}. ${explanation}`}
              className="inline-flex shrink-0 cursor-pointer rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-select focus-visible:ring-offset-1"
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
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="end"
            collisionPadding={12}
            className="max-w-[240px] border border-white/15 bg-[#0f172a] px-3 py-2 text-left text-xs leading-snug text-slate-100"
          >
            {explanation}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <span
        className={`text-xs transition-colors ${
          isStandard ? "text-ca-ink font-semibold" : "text-ca-ink-muted font-normal"
        }`}
      >
        Standard
      </span>
    </div>
  );
}
