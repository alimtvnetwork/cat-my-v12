import { useUiMode, UiModeType } from "@/hooks/useUiMode";

export function UiModeSwitch(): React.JSX.Element | null {
  const { mode, toggleMode } = useUiMode();
  const isStandard = mode === UiModeType.Standard;

  return (
    <div className="group flex shrink-0 items-center gap-2 font-sans select-none">
      <span
        className={`w-[70px] whitespace-nowrap text-right text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
          isStandard ? "text-ca-ink-muted font-normal" : "text-ca-ink font-semibold"
        }`}
      >
        Modern
      </span>

      <button
        type="button"
        onClick={toggleMode}
        aria-label={`Toggle UI mode. Current mode: ${isStandard ? "Standard" : "Modern"}`}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-select focus-visible:ring-offset-1 ${
          isStandard ? "bg-ca-select" : "bg-ca-ink-muted/40"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            isStandard ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>

      <span
        className={`w-[70px] whitespace-nowrap text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
          isStandard ? "text-ca-ink font-semibold" : "text-ca-ink-muted font-normal"
        }`}
      >
        Standard
      </span>
    </div>
  );
}
