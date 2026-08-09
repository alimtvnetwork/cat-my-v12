"""Emit an HTML tradeoff report comparing threshold candidates.

Reads a denial JSONL (as produced by `export_denial_events.py` or the
checked-in fixture) and writes a self-contained HTML file summarising:

  - Baseline percentile stats (p50/p95/p99, σ, sample size)
  - Threshold candidates (p95, p95+2σ, p99, p99+3σ) with trip count,
    false-positive count, false-negative count, and labeled-bucket count

Usage:
    python3 scripts/security/tradeoff_report.py \\
        --in tests/fixtures/security/denial_sample.jsonl \\
        --out /tmp/denial_tradeoff.html
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import sys
from dataclasses import asdict, is_dataclass
from html import escape
from pathlib import Path

from app.core.security.denial_metrics import (
    BaselineStats,
    CandidateResult,
    evaluate_all,
    load_rows,
)

log = logging.getLogger("ca.scripts.tradeoff_report")


def render_html(source: Path, stats: BaselineStats, results: list[CandidateResult]) -> str:
    rows_html = "\n".join(
        f"<tr><td>{escape(r.name)}</td><td>{r.threshold}</td>"
        f"<td>{escape(r.formula)}</td>"
        f"<td>{r.trips}</td><td>{r.fp}</td><td>{r.fn}</td>"
        f"<td>{r.labeled_buckets}</td></tr>"
        for r in results
    )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Denial-burst threshold tradeoff report</title>
<style>
  body {{ font-family: system-ui, sans-serif; max-width: 880px; margin: 2rem auto; padding: 0 1rem; }}
  table {{ border-collapse: collapse; width: 100%; margin: 1rem 0; }}
  th, td {{ border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: right; }}
  th:first-child, td:first-child {{ text-align: left; }}
  caption {{ text-align: left; font-weight: 600; margin-bottom: 0.4rem; }}
  code {{ background: #f4f4f4; padding: 0.1rem 0.3rem; border-radius: 3px; }}
</style>
</head><body>
<h1>Denial-burst threshold tradeoff report</h1>
<p>Source: <code>{escape(str(source))}</code></p>
<h2>Baseline</h2>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Sample size (rows)</td><td>{stats.sample_size}</td></tr>
  <tr><td>Buckets (actor × minute)</td><td>{stats.buckets}</td></tr>
  <tr><td>p50</td><td>{stats.p50}</td></tr>
  <tr><td>p95</td><td>{stats.p95}</td></tr>
  <tr><td>p99</td><td>{stats.p99}</td></tr>
  <tr><td>σ (bucket count)</td><td>{stats.sigma}</td></tr>
</table>
<h2>Threshold candidates</h2>
<table>
  <caption>Each row records the exact <code>formula</code> used to derive the threshold from the baseline above.
  FP/FN require rows tagged <code>label=&quot;attack&quot;</code> or <code>label=&quot;legit&quot;</code>;
  untagged rows contribute to trips only.</caption>
  <tr><th>Candidate</th><th>Threshold</th><th>Formula</th><th>Trips</th><th>FP</th><th>FN</th><th>Labeled buckets</th></tr>
  {rows_html}
</table>
</body></html>
"""


CANDIDATE_FIELDS = (
    "name", "threshold", "formula",
    "trips", "fp", "fn", "labeled_buckets",
    "baseline_p50", "baseline_p95", "baseline_p99", "baseline_sigma",
    "baseline_sample_size", "baseline_buckets",
)



def _as_dict(obj: object) -> dict:
    if is_dataclass(obj):
        return asdict(obj)
    return {k: getattr(obj, k) for k in CANDIDATE_FIELDS if hasattr(obj, k)}


def write_json(path: Path, source: Path, stats: object, results: list) -> None:
    payload = {
        "source": str(source),
        "baseline": _as_dict(stats),
        "candidates": [_as_dict(r) for r in results],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")


def write_csv(path: Path, results: list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=CANDIDATE_FIELDS)
        writer.writeheader()
        for r in results:
            row = _as_dict(r)
            writer.writerow({k: row.get(k, "") for k in CANDIDATE_FIELDS})


def write_pdf(path: Path, source: Path, stats: BaselineStats, results: list[CandidateResult]) -> None:
    """Render the tradeoff report as a PDF alongside the HTML output.

    Uses reportlab's Platypus flowables so the layout survives wide tables
    on Letter paper.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import landscape, letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import (
        Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )

    path.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(path), pagesize=landscape(letter),
                            title="Denial-burst threshold tradeoff report")
    story = [
        Paragraph("Denial-burst threshold tradeoff report", styles["Title"]),
        Paragraph(f"Source: {source}", styles["Normal"]),
        Spacer(1, 12),
        Paragraph("Baseline", styles["Heading2"]),
    ]
    baseline_rows = [
        ["Metric", "Value"],
        ["Sample size (rows)", stats.sample_size],
        ["Buckets (actor x minute)", stats.buckets],
        ["p50", stats.p50],
        ["p95", stats.p95],
        ["p99", stats.p99],
        ["sigma", stats.sigma],
    ]
    t1 = Table(baseline_rows, hAlign="LEFT")
    t1.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
    ]))
    story += [t1, Spacer(1, 12), Paragraph("Threshold candidates", styles["Heading2"])]

    header = ["Candidate", "Threshold", "Formula", "Trips", "FP", "FN", "Labeled"]
    body = [
        [r.name, r.threshold, r.formula, r.trips, r.fp, r.fn, r.labeled_buckets]
        for r in results
    ]
    t2 = Table([header, *body], hAlign="LEFT", repeatRows=1)
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(t2)
    doc.build(story)



def main(argv: list[str]) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    p = argparse.ArgumentParser(description="Denial threshold tradeoff report")
    p.add_argument("--in", dest="in_path", required=True, type=Path)
    p.add_argument("--out", dest="out_path", required=True, type=Path,
                   help="Path to write the HTML report.")
    p.add_argument("--json", dest="json_path", type=Path, default=None,
                   help="Optional: also write machine-readable JSON "
                        "(baseline stats + per-candidate rows) to this path.")
    p.add_argument("--csv", dest="csv_path", type=Path, default=None,
                   help="Optional: also write per-candidate rows as CSV to this path.")
    p.add_argument("--pdf", dest="pdf_path", type=Path, default=None,
                   help="Optional: also render the tradeoff report as PDF to this path.")
    args = p.parse_args(argv)


    log.info("tradeoff.start in=%s out=%s", args.in_path, args.out_path)
    rows = load_rows(args.in_path)
    stats, results = evaluate_all(rows)
    log.info(
        "tradeoff.baseline sample=%d buckets=%d p50=%d p95=%d p99=%d sigma=%s",
        stats.sample_size, stats.buckets, stats.p50, stats.p95, stats.p99, stats.sigma,
    )
    for r in results:
        log.info(
            "tradeoff.candidate name=%s threshold=%d formula=%r trips=%d fp=%d fn=%d labeled=%d "
            "baseline_p50=%d baseline_p95=%d baseline_p99=%d baseline_sigma=%s",
            r.name, r.threshold, r.formula, r.trips, r.fp, r.fn, r.labeled_buckets,
            r.baseline_p50, r.baseline_p95, r.baseline_p99, r.baseline_sigma,
        )

    args.out_path.parent.mkdir(parents=True, exist_ok=True)
    args.out_path.write_text(render_html(args.in_path, stats, results), encoding="utf-8")
    log.info("tradeoff.done wrote=%s", args.out_path)
    if args.json_path is not None:
        write_json(args.json_path, args.in_path, stats, results)
        log.info("tradeoff.done wrote_json=%s", args.json_path)
    if args.csv_path is not None:
        write_csv(args.csv_path, results)
        log.info("tradeoff.done wrote_csv=%s", args.csv_path)
    if args.pdf_path is not None:
        write_pdf(args.pdf_path, args.in_path, stats, results)
        log.info("tradeoff.done wrote_pdf=%s", args.pdf_path)
    return 0



if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
