export function SafeZoneOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
      <div className="w-full h-full border-2 border-dashed border-ca-border/50 rounded-sm"></div>
    </div>
  );
}
