export function SafeZoneOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none w-full h-full flex items-center justify-center">
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <rect
          x="10%"
          y="10%"
          width="80%"
          height="80%"
          fill="none"
          stroke="var(--color-ca-select)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <path d="M 10% 15% L 10% 10% L 15% 10%" fill="none" stroke="var(--color-ca-select)" strokeWidth="3" />
        <path d="M 85% 10% L 90% 10% L 90% 15%" fill="none" stroke="var(--color-ca-select)" strokeWidth="3" />
        <path d="M 90% 85% L 90% 90% L 85% 90%" fill="none" stroke="var(--color-ca-select)" strokeWidth="3" />
        <path d="M 15% 90% L 10% 90% L 10% 85%" fill="none" stroke="var(--color-ca-select)" strokeWidth="3" />
      </svg>
    </div>
  );
}
