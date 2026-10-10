export interface GreyscaleSliderCardProps {
  greyscaleLevel: number;
  onGreyscaleChange: (val: number) => void;
}

export function GreyscaleSliderCard(props: GreyscaleSliderCardProps): React.JSX.Element {
  return (
    <div className="space-y-2 rounded border border-[#303943] bg-[#182028] p-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#303943] pb-2 text-xs font-semibold uppercase tracking-[0.12em]">
        <span>Greyscale Level</span>
        <span className="rounded border border-ca-select/30 bg-ca-select/10 px-2 py-0.5 font-mono text-ca-select">
          {props.greyscaleLevel}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={255}
        value={props.greyscaleLevel}
        onChange={(e) => props.onGreyscaleChange(Number(e.target.value))}
        className="w-full accent-ca-select"
      />
    </div>
  );
}
