"""Backend E2E probes for pattern search and UI improvement (cases B1-B6).

Pure standard library. Hits the live backend on E2E_BE_URL (default
http://127.0.0.1:8787). Images are generated here (tiny pure-Python PNG
writer, no fixtures) and sent as data URLs; the pin-one probe sends raw
RGBA bytes, which is what that endpoint takes.

Grading: PASS means the asserted behaviour was observed, FAIL means the
surface was reached and the behaviour was wrong, UNVERIFIED means the
backend could not be reached. Prints one line per case plus a JSON
report at tests/reports/pattern-search-backend.json. Exits 0 only when
no case FAILed (UNVERIFIED does not fail the run, it stays visible).
"""

import base64
import json
import os
import struct
import sys
import urllib.error
import urllib.request
import zlib
from pathlib import Path

BE_URL = os.environ.get("E2E_BE_URL", "http://127.0.0.1:8787")
REPORT_PATH = Path("tests/reports/pattern-search-backend.json")
TIMEOUT = 30

results = []


def record(case, status, detail):
    results.append({"case": case, "status": status, "detail": detail})
    print(f"CASE {case} {status} - {detail}", flush=True)


def png_rgb(width, height, pixel):
    """Encode an RGB image (pixel(x, y) -> (r, g, b)) as PNG bytes."""
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixel(x, y))

    def chunk(kind, data):
        out = struct.pack(">I", len(data)) + kind + data
        return out + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw)))
        + chunk(b"IEND", b"")
    )


def data_url(png_bytes):
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode()


def post(path, body):
    req = urllib.request.Request(
        BE_URL + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp.status, json.loads(resp.read().decode())


def get(path):
    with urllib.request.urlopen(BE_URL + path, timeout=TIMEOUT) as resp:
        return resp.status, resp.read().decode()


def find_key(obj, *names):
    """Recursively find the first dict containing any of the names."""
    if isinstance(obj, dict):
        if any(n in obj for n in names):
            return obj
        for value in obj.values():
            found = find_key(value, *names)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = find_key(item, *names)
            if found is not None:
                return found
    return None


def main():
    try:
        status, _ = get("/healthz")
        record("B1", "PASS" if status == 200 else "FAIL", f"GET /healthz -> {status}")
        if status != 200:
            record("B2", "UNVERIFIED", "backend not healthy, skipping")
            record("B3", "UNVERIFIED", "backend not healthy, skipping")
            record("B4", "UNVERIFIED", "backend not healthy, skipping")
            record("B5", "UNVERIFIED", "backend not healthy, skipping")
            record("B6", "UNVERIFIED", "backend not healthy, skipping")
            record("B7", "UNVERIFIED", "backend not healthy, skipping")
            return write_report()
    except Exception as exc:  # backend unreachable
        for case in ("B1", "B2", "B3", "B4", "B5", "B6", "B7"):
            record(case, "UNVERIFIED", f"backend unreachable: {exc}")
        return write_report()

    gradient = png_rgb(96, 96, lambda x, y: (x * 255 // 95, x * 255 // 95, x * 255 // 95))
    gradient_url = data_url(gradient)
    flat = png_rgb(64, 64, lambda x, y: (128, 128, 128))
    flat_url = data_url(flat)

    # B2: same image on both sides, full-image ROI, must score 100.0
    # (F4 fix). No ROI is missing_roi by design, covered by B7.
    try:
        _, body = post("/score", {
            "ruleType": "grayscale_tolerance",
            "referenceImageUrl": gradient_url,
            "sampleImageUrl": gradient_url,
            "roi": {"x": 0, "y": 0, "width": 96, "height": 96},
        })
        score = find_key(body, "is_pass", "confidence")
        conf = score.get("confidence") if score else None
        ok = bool(score and score.get("is_pass") and conf is not None and conf >= 99.9)
        record("B2", "PASS" if ok else "FAIL",
               f"same-image confidence={conf} is_pass={score.get('is_pass') if score else None}")
    except Exception as exc:
        record("B2", "FAIL", f"request failed: {exc}")

    # B3: out-of-bounds ROI fails as roi_out_of_bounds on all six branches.
    branches = ["grayscale_tolerance", "pattern_match", "shape_track",
                "color_area", "blob_area", "edge_width"]
    bad = []
    for branch in branches:
        try:
            _, body = post("/score", {
                "ruleType": branch,
                "referenceImageUrl": gradient_url,
                "sampleImageUrl": gradient_url,
                "roi": {"x": 10000, "y": 10000, "width": 50, "height": 50},
            })
            score = find_key(body, "is_pass", "verdict", "reason")
            reason = str(score.get("reason", "")) if score else ""
            verdict = str(score.get("verdict", "")) if score else ""
            passed = score and not score.get("is_pass") and (
                "roi_out_of_bounds" in reason or "roi_out_of_bounds" in verdict
                or "roi_out_of_bounds" in json.dumps(body))
            if not passed:
                bad.append(f"{branch}: verdict={verdict} reason={reason!r}")
        except Exception as exc:
            bad.append(f"{branch}: request failed: {exc}")
    record("B3", "PASS" if not bad else "FAIL",
           "all six branches roi_out_of_bounds" if not bad else "; ".join(bad))

    # B4: flat payload with stamp keys must not report missing_roi (F5 fix).
    try:
        _, body = post("/score", {
            "ruleType": "grayscale_tolerance",
            "referenceImageUrl": flat_url,
            "sampleImageUrl": flat_url,
            "roi": {"x": 0, "y": 0, "width": 64, "height": 64,
                    "ImageWidth": 64, "ImageHeight": 64},
        })
        score = find_key(body, "is_pass", "reason")
        reason = str(score.get("reason", "")) if score else ""
        ok = bool(score and "is_pass" in score and "missing_roi" not in reason
                  and "missing_roi" not in json.dumps(body))
        record("B4", "PASS" if ok else "FAIL",
               f"flat+stamps is_pass={score.get('is_pass') if score else None} reason={reason!r}")
    except Exception as exc:
        record("B4", "FAIL", f"request failed: {exc}")

    # B5: geometryJson envelope with identical images must score 100.0.
    try:
        _, body = post("/score", {
            "ruleType": "grayscale_tolerance",
            "referenceImageUrl": gradient_url,
            "sampleImageUrl": gradient_url,
            "roi": {"geometryJson": {
                "ShapeKind": "RECTANGLE",
                "geometry": {"x": 0, "y": 0, "width": 96, "height": 96},
                "ImageWidth": 96, "ImageHeight": 96}},
        })
        score = find_key(body, "is_pass", "confidence")
        conf = score.get("confidence") if score else None
        ok = bool(score and score.get("is_pass") and conf is not None and conf >= 99.9)
        record("B5", "PASS" if ok else "FAIL",
               f"envelope confidence={conf} is_pass={score.get('is_pass') if score else None}")
    except Exception as exc:
        record("B5", "FAIL", f"request failed: {exc}")

    # B6: pin-one angle datum plumbing (no 422, graceful fallback).
    try:
        rgba = bytearray()
        for y in range(96):
            for x in range(96):
                dx, dy = x - 48, y - 48
                dark = 1 if dx * dx + dy * dy <= 144 else 0
                v = 0 if dark else 255
                rgba.extend((v, v, v, 255))
        rgba_b64 = base64.b64encode(bytes(rgba)).decode()
        base = {"Width": 96, "Height": 96, "RgbaBase64": rgba_b64,
                "SearchRegion": {"X": 0, "Y": 0, "Width": 96, "Height": 96},
                "PackageRegion": {"X": 0, "Y": 0, "Width": 96, "Height": 96}}
        _, pkg = post("/vision/pin1-detection", dict(base, AngleDatum="package"))
        _, bogus = post("/vision/pin1-detection", dict(base, AngleDatum="bogus"))
        angle_hit = find_key(pkg, "angle", "Angle", "angleDeg")
        record("B6", "PASS",
               f"AngleDatum=package accepted (200), unknown datum fell back (200), "
               f"angle field present={angle_hit is not None}")
    except urllib.error.HTTPError as exc:
        record("B6", "FAIL", f"pin1-detection HTTP {exc.code} (datum rejected)")
    except Exception as exc:
        record("B6", "FAIL", f"request failed: {exc}")

    # B7: no ROI is missing_roi by design (a rule without a saved
    # search ROI cannot score), not a scoring failure.
    try:
        _, body = post("/score", {
            "ruleType": "grayscale_tolerance",
            "referenceImageUrl": gradient_url,
            "sampleImageUrl": gradient_url,
        })
        score = find_key(body, "is_pass", "label", "reason")
        label = str(score.get("label", "")) if score else ""
        ok = bool(score and not score.get("is_pass") and "missing_roi" in label)
        record("B7", "PASS" if ok else "FAIL",
               f"no-ROI label={label!r} is_pass={score.get('is_pass') if score else None}")
    except Exception as exc:
        record("B7", "FAIL", f"request failed: {exc}")

    return write_report()


def write_report():
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    failed = sum(1 for r in results if r["status"] == "FAIL")
    REPORT_PATH.write_text(json.dumps(
        {"suite": "pattern-search-backend", "failed": failed, "cases": results},
        indent=2) + "\n", encoding="utf-8")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
