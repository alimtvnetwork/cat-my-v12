import { useEffect, useState } from "react";

export function FpsBadge() {
  const [hasFps, setHasFps] = useState(false);
  useEffect(() => setHasFps(new URLSearchParams(window.location.search).has("debug")), []);

  return hasFps ? <span className="hmi-tabular text-hmi-badge">-- fps</span> : null;
}
