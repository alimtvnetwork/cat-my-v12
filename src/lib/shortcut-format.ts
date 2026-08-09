// Format a normalized combo string (e.g. `mod+shift+k`) as a human label
// suitable for a `<kbd>` element. Platform-aware: `mod` renders as
// Cmd on macOS, Ctrl elsewhere.
function isMac(): boolean {
  if (typeof navigator === "undefined") return false;

  return /mac|iphone|ipad/i.test(navigator.platform);
}

const MOD_LABEL: Record<string, string> = {
  meta: "Cmd",
  ctrl: "Ctrl",
  shift: "Shift",
  alt: "Alt",
};

export function formatComboForDisplay(combo: string): string {
  const parts = combo
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return combo;
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1);
  const mac = isMac();
  const labels = mods.map((m) => {
    if (m === "mod") return mac ? "Cmd" : "Ctrl";

    return MOD_LABEL[m] ?? m;
  });
  const keyLabel = key.length === 1 ? key.toUpperCase() : capitalize(key);

  return [...labels, keyLabel].join(" + ");
}

function capitalize(s: string): string {
  if (!s) return s;

  return s.charAt(0).toUpperCase() + s.slice(1);
}
