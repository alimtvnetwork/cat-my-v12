"""Generate deterministic labeled fixtures for the scorer calibration pass.

Run: `python worker/fixtures/build.py`. Writes PNGs and `labels.json`
into `worker/fixtures/data/`.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).parent / "data"
OUT.mkdir(parents=True, exist_ok=True)

RNG = np.random.default_rng(42)
SIZE = 200
ROI = {"x": 40, "y": 40, "width": 120, "height": 120}


def save(name: str, arr: np.ndarray) -> str:
    path = OUT / f"{name}.png"
    Image.fromarray(arr.astype(np.uint8)).save(path)
    return str(path.relative_to(Path(__file__).parent))


def flat(colour):
    return np.tile(np.array(colour, dtype=np.uint8), (SIZE, SIZE, 1))


def checker(a, b, cell=8):
    img = np.zeros((SIZE, SIZE, 3), dtype=np.uint8)
    for y in range(0, SIZE, cell):
        for x in range(0, SIZE, cell):
            img[y:y + cell, x:x + cell] = a if ((x // cell + y // cell) % 2 == 0) else b
    return img


def fill_fraction(fraction, fg=(0, 0, 0), bg=(255, 255, 255)):
    img = flat(bg)
    n = int(SIZE * SIZE * fraction)
    idx = RNG.choice(SIZE * SIZE, size=n, replace=False)
    ys, xs = np.divmod(idx, SIZE)
    img[ys, xs] = fg
    return img


def main() -> None:
    fixtures = []

    def add(name, arr, kind, params, expected):
        rel = save(name, arr)
        fixtures.append({
            "name": name,
            "path": rel,
            "kind": kind,
            "params": params,
            "roi": ROI,
            "expected": expected,
        })

    # Colour presence
    for i in range(3):
        add(f"colour_pass_{i}", flat([220 + i, 20, 30]), "C",
            {"targetRgb": [230, 20, 30], "tolerance": 40}, "pass")
        add(f"colour_fail_{i}", flat([20, 40, 200 + i]), "C",
            {"targetRgb": [230, 20, 30], "tolerance": 40}, "fail")

    # Reference match
    for i in range(3):
        add(f"reference_pass_{i}", flat([120 + i, 130, 140]), "R",
            {"referenceRgb": [120, 130, 140]}, "pass")
        add(f"reference_fail_{i}", flat([250, 30, 40]), "R",
            {"referenceRgb": [120, 130, 140]}, "fail")

    # Edge density
    for i in range(3):
        add(f"edges_pass_{i}", checker((10, 10, 10), (240, 240, 240), cell=6 + i), "K",
            {}, "pass")
        add(f"edges_fail_{i}", flat([180, 180, 180]), "K", {}, "fail")

    # Shape fill fraction
    for i, f in enumerate([0.48, 0.5, 0.52]):
        add(f"shape_pass_{i}", fill_fraction(f), "S",
            {"threshold": 128, "expectedFill": 0.5}, "pass")
    for i, f in enumerate([0.05, 0.1, 0.9]):
        add(f"shape_fail_{i}", fill_fraction(f), "S",
            {"threshold": 128, "expectedFill": 0.5}, "fail")

    # Empty
    for i in range(3):
        add(f"empty_pass_{i}", flat([250 + (-i), 250, 250]), "E",
            {"backgroundRgb": [255, 255, 255], "tolerance": 25}, "pass")
        add(f"empty_fail_{i}", checker((20, 20, 20), (255, 255, 255), cell=10), "E",
            {"backgroundRgb": [255, 255, 255], "tolerance": 25}, "fail")

    (Path(__file__).parent / "labels.json").write_text(json.dumps(fixtures, indent=2))
    print(f"wrote {len(fixtures)} fixtures to {OUT}")


if __name__ == "__main__":
    main()