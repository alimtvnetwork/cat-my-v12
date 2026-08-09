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

export function Counter({
  variant,
  value,
  onClick,
  title,
}: {
  variant: CounterVariant;
  value: number;
  onClick?: () => void;
  title?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-hmi-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accentMap[variant]}`} aria-hidden />
        <span className="font-hmi text-hmi-badge uppercase tracking-wider text-ca-ink-muted">
          {labelMap[variant]}
        </span>
      </div>
      <span className={`hmi-tabular text-hmi-counter font-semibold ${colorMap[variant]}`}>
        {value.toLocaleString()}
      </span>
    </>
  );
  const cls =
    "flex flex-col items-start gap-hmi-2 px-hmi-4 py-hmi-3 rounded-lg bg-ca-panel border border-ca-border min-w-32 transition-colors";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`${cls} text-left hover:border-ca-primary/60 hover:bg-ca-panel-2 focus:outline-none focus-visible:border-ca-primary focus-visible:ring-2 focus-visible:ring-ca-primary/30`}
      >
        {inner}
      </button>
    );
  }

  return <div className={cls}>{inner}</div>;
}
