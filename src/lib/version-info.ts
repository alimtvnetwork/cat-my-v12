import versionData from "../../version.json";

export interface VersionInfo {
  name: string;
  shortName: string;
  version: string;
  releaseDate: string;
  commitHash: string;
  buildTarget: string;
  highlights: string[];
}

export const APP_VERSION_INFO: VersionInfo = {
  name: "Cat Vision, Cat I Vision",
  shortName: "CAT iVISION",
  version: `v${versionData.version}`,
  releaseDate: versionData.releaseDate,
  commitHash: "038f4b22",
  buildTarget: "HMI Production Web & Desktop",
  highlights: [
    "Browser window controls (fullscreen toggle, guided app exit with backend shutdown) in titlebar",
    "Application rebranding to Cat Vision, Cat I Vision",
    "Interactive corner-only ROI drag handles & multi-shape masks (Rectangle, Square, Circle)",
    "Layer stacking controls (Bring to Front, Send to Back) & tamper-proof layer locking",
    "In-app activity recorder with 60% JPEG capture, Email & Telegram dispatch options",
    "Simulation dwell slider (2s-10s, default 3s) & layout overlap fixes",
    "De-noised pocket inspection notifications & Live Camera toolbar controls",
  ],
};
