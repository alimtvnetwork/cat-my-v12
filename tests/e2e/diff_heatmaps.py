"""Image-diff heatmaps for hero + wrap/truncate screenshots.

Compares each current screenshot in
- tests/reports/padding-tokens/
- tests/reports/item-rows-long-labels/
against a baseline copy under tests/reports/baselines/<subdir>/<file>.
First run seeds the baseline (no diffs). Later runs write a red-tinted
heatmap of pixel deltas plus a side-by-side composite so any centering
regression is visually obvious.

Outputs:
- tests/reports/diff-heatmaps/<subdir>/<name>.heatmap.png
- tests/reports/diff-heatmaps/<subdir>/<name>.compare.png
- tests/reports/diff-heatmaps/index.html   (thumbnails + metrics)

Non-zero exit only when total-diff ratio exceeds 2% on any screenshot,
which is well beyond alignment jitter but catches real regressions.
"""

import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SOURCES = [
    Path("tests/reports/padding-tokens"),
    Path("tests/reports/item-rows-long-labels"),
    Path("tests/reports/home-regression"),
    Path("tests/reports/topnav-states"),
    Path("tests/reports/editor-settings-regression"),
]

BASELINE_ROOT = Path("tests/reports/baselines")
OUT_ROOT = Path("tests/reports/diff-heatmaps")
THRESHOLD_RATIO = 0.02  # 2 percent changed pixels = fail
PIXEL_DELTA = 12  # per-channel delta counted as "changed"


def to_rgb(img: Image.Image) -> Image.Image:
    return img.convert("RGB")


def diff_arrays(a: np.ndarray, b: np.ndarray) -> tuple[np.ndarray, float]:
    # Align sizes by cropping to shared area if the run resized.
    h = min(a.shape[0], b.shape[0])
    w = min(a.shape[1], b.shape[1])
    a = a[:h, :w]
    b = b[:h, :w]
    delta = np.abs(a.astype(np.int16) - b.astype(np.int16)).max(axis=2)
    changed = delta > PIXEL_DELTA
    return delta.astype(np.uint8), float(changed.mean())


def heatmap(delta: np.ndarray, base: np.ndarray) -> Image.Image:
    # Fade the base to 40 percent, overlay red where delta is high.
    faded = (base.astype(np.float32) * 0.4).astype(np.uint8)
    intensity = np.clip(delta.astype(np.float32) * 3, 0, 255).astype(np.uint8)
    r = np.maximum(faded[..., 0], intensity)
    g = np.minimum(faded[..., 1], 255 - intensity)
    b = np.minimum(faded[..., 2], 255 - intensity)
    return Image.fromarray(np.stack([r, g, b], axis=-1), "RGB")


def side_by_side(baseline: Image.Image, current: Image.Image, hm: Image.Image) -> Image.Image:
    h = max(baseline.height, current.height, hm.height)
    w = baseline.width + current.width + hm.width + 20
    canvas = Image.new("RGB", (w, h), (24, 24, 27))
    canvas.paste(baseline, (0, 0))
    canvas.paste(current, (baseline.width + 10, 0))
    canvas.paste(hm, (baseline.width + current.width + 20, 0))
    return canvas


def process() -> tuple[list[dict], list[str]]:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    BASELINE_ROOT.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    failures: list[str] = []

    for src_dir in SOURCES:
        if not src_dir.exists():
            continue
        sub = src_dir.name
        baseline_dir = BASELINE_ROOT / sub
        out_dir = OUT_ROOT / sub
        baseline_dir.mkdir(parents=True, exist_ok=True)
        out_dir.mkdir(parents=True, exist_ok=True)

        for shot in sorted(src_dir.glob("*.png")):
            baseline_path = baseline_dir / shot.name
            if not baseline_path.exists():
                shutil.copy(shot, baseline_path)
                rows.append(
                    {"sub": sub, "name": shot.name, "ratio": 0.0, "seeded": True}
                )
                continue

            cur = to_rgb(Image.open(shot))
            base = to_rgb(Image.open(baseline_path))
            cur_np = np.array(cur)
            base_np = np.array(base)
            delta, ratio = diff_arrays(base_np, cur_np)

            hm = heatmap(delta, base_np[: delta.shape[0], : delta.shape[1]])
            hm.save(out_dir / f"{shot.stem}.heatmap.png")
            # Resize base/cur to match delta area for a clean composite.
            base_crop = Image.fromarray(base_np[: delta.shape[0], : delta.shape[1]])
            cur_crop = Image.fromarray(cur_np[: delta.shape[0], : delta.shape[1]])
            side_by_side(base_crop, cur_crop, hm).save(
                out_dir / f"{shot.stem}.compare.png"
            )

            rows.append(
                {"sub": sub, "name": shot.name, "ratio": ratio, "seeded": False}
            )
            if ratio > THRESHOLD_RATIO:
                failures.append(f"{sub}/{shot.name} ratio={ratio:.3%}")

    return rows, failures


def render_index(rows: list[dict]) -> None:
    def status(r: dict) -> str:
        if r["seeded"]:
            return '<span style="color:#0369a1">seeded</span>'
        if r["ratio"] > THRESHOLD_RATIO:
            return f'<span style="color:#b91c1c">fail ({r["ratio"]:.2%})</span>'
        if r["ratio"] > 0.005:
            return f'<span style="color:#b45309">watch ({r["ratio"]:.2%})</span>'
        return f'<span style="color:#047857">pass ({r["ratio"]:.2%})</span>'

    body = []
    for r in rows:
        if r["seeded"]:
            body.append(
                f"<tr><td>{r['sub']}</td><td>{r['name']}</td><td>{status(r)}</td><td></td></tr>"
            )
            continue
        stem = Path(r["name"]).stem
        cmp_path = f"{r['sub']}/{stem}.compare.png"
        body.append(
            f"<tr><td>{r['sub']}</td><td>{r['name']}</td><td>{status(r)}</td>"
            f'<td><a href="{cmp_path}"><img src="{cmp_path}" style="height:120px"></a></td></tr>'
        )
    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Diff heatmaps</title>
<style>
  body {{ font: 14px system-ui, sans-serif; margin: 2rem; background: #f9fafb; }}
  table {{ border-collapse: collapse; background: white; }}
  th, td {{ border: 1px solid #e5e7eb; padding: .5rem; vertical-align: top; }}
  th {{ background: #f3f4f6; text-align: left; }}
  img {{ display: block; }}
</style></head><body>
<h1>Screenshot diff heatmaps</h1>
<p>Baselines live in <code>tests/reports/baselines/</code>. Delete a file
there to reseed. Threshold: {THRESHOLD_RATIO:.0%} changed pixels.</p>
<table><thead><tr><th>Dir</th><th>Screenshot</th><th>Status</th><th>baseline &middot; current &middot; heatmap</th></tr></thead>
<tbody>{''.join(body)}</tbody></table>
</body></html>"""
    (OUT_ROOT / "index.html").write_text(html)


def main() -> int:
    rows, failures = process()
    render_index(rows)
    print(f"diff-heatmaps: {len(rows)} shot(s), {len(failures)} failure(s)")
    for f in failures:
        print(f"  {f}")
    print(f"  report: {OUT_ROOT / 'index.html'}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
