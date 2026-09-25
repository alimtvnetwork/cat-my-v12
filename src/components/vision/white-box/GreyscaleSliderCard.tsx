export interface GreyscaleSliderCardProps {
  greyscaleLevel: number;
  onGreyscaleChange: (val: number) => void;
}

export function GreyscaleSliderCard(props: GreyscaleSliderCardProps): React.JSX.Element {
  return (
    <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-1.5">
      <div className="flex items-center justify-between border-b border-ca-border pb-1 font-semibold uppercase text-xs">
        <span>Greyscale Level</span>
        <span className="font-mono text-ca-select">{props.greyscaleLevel}</span>
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
