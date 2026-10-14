export enum CounterVariantType {
  Total = "total",
  Ok = "ok",
  Ng = "ng",
}
export type CounterVariant = CounterVariantType;

const labelMap: Record<CounterVariant, string> = { total: "Total", ok: "Pass", ng: "Fail" };
const colorMap: Record<CounterVariant, string> = {
  total: "text-ca-ink",
  ok: "text-ca-ok",
  ng: "text-ca-ng",
};
const accentMap: Record<CounterVariant, string> = {
  total: "bg-ca-primary",
  ok: "bg-ca-ok",
  ng: "bg-ca-ng",
};

export interface CounterProps {
  variant: CounterVariant;
  value: number;
  onClick?: () => void;
  title?: string;
  "data-testid"?: string;
  "aria-live"?: "polite" | "assertive" | "off";
}

export function Counter({
  variant,
  value,
  onClick,
  title,
  "data-testid": testId,
  "aria-live": ariaLive,
}: CounterProps): React.JSX.Element | null {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${accentMap[variant]} shadow-[0_0_10px_currentColor]`}
          aria-hidden
        />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
          {labelMap[variant]}
        </span>
      </div>
      <span className={`hmi-tabular font-mono text-2xl font-black tracking-tight ${colorMap[variant]} drop-shadow-[0_0_12px_currentColor]`}>
        {value.toLocaleString()}
      </span>
    </>
  );

  const cls =
    "group relative flex flex-col items-start gap-1 px-4 py-2.5 rounded-2xl border border-ca-border/80 bg-gradient-to-b from-ca-panel/95 via-ca-panel/75 to-ca-bg/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_16px_-4px_rgba(0,0,0,0.5)] backdrop-blur-xl min-w-36 transition-all duration-200";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        data-testid={testId}
        aria-live={ariaLive}
        className={`${cls} text-left hover:border-ca-primary/60 hover:bg-ca-panel-2 hover:shadow-[0_0_16px_color-mix(in_oklab,var(--ca-primary)_25%,transparent)] focus:outline-none focus-visible:border-ca-primary focus-visible:ring-2 focus-visible:ring-ca-primary/30`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={cls} data-testid={testId} aria-live={ariaLive}>
      {inner}
    </div>
  );
}
