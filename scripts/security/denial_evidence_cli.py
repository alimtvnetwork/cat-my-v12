"""E2E denial-evidence CLI: export → baseline → markdown report.

Runs the three data-phase steps of Plan 29 in a single shot:

  1. (Optional) export denial events from the audit sink to JSONL.
  2. Compute baseline p50/p95/p99 + candidate FP/FN via
     `app.core.security.denial_metrics`.
  3. Emit an evidence markdown report alongside the JSONL and (optionally)
     the HTML tradeoff report.

Usage (offline replay of an existing JSONL — the default the fixture uses):
    python3 scripts/security/denial_evidence_cli.py \\
        --in tests/fixtures/security/denial_sample.jsonl \\
        --out-dir /tmp/denial-evidence

Usage (live export from a SQLite audit sink):
    python3 scripts/security/denial_evidence_cli.py \\
        --db path/to/audit.sqlite --window-hours 2160 \\
        --out-dir /tmp/denial-evidence
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

from app.core.security.denial_metrics import (
    BaselineStats,
    CandidateResult,
    evaluate_all,
    load_rows,
)
from scripts.security.tradeoff_report import render_html, write_pdf

log = logging.getLogger("ca.scripts.denial_evidence_cli")


def _run_export(db: Path, out_jsonl: Path, window_hours: int) -> None:
    # Local import: exporter pulls sqlite + audit_sink, no need to load
    # unless the caller actually asked for a live export.
    from scripts.security.export_denial_events import export

    log.info("evidence.export db=%s window_hours=%d out=%s", db, window_hours, out_jsonl)
    n = export(db, out_jsonl, window_hours)
    log.info("evidence.export.done rows=%d", n)


def _write_markdown(
    out_md: Path,
    source: Path,
    stats: BaselineStats,
    results: list[CandidateResult],
    html_path: Path | None,
    pdf_path: Path | None = None,
) -> None:
    lines = [
        "# Denial-burst evidence report",
        "",
        f"- Source JSONL: `{source}`",
        f"- Generated: {int(time.time())} (unix)",
    ]
    if html_path is not None:
        lines.append(f"- HTML tradeoff: `{html_path}`")
    if pdf_path is not None:
        lines.append(f"- PDF tradeoff: `{pdf_path}`")

    lines += [
        "",
        "## Baseline",
        "",
        "| metric | value |",
        "|---|---:|",
        f"| sample_size | {stats.sample_size} |",
        f"| buckets | {stats.buckets} |",
        f"| p50 | {stats.p50} |",
        f"| p95 | {stats.p95} |",
        f"| p99 | {stats.p99} |",
        f"| sigma | {stats.sigma} |",
        "",
        "## Candidates",
        "",
        "FP/FN and trip counts below were computed against the baseline in the previous section.",
        "The `formula` column records how each threshold was derived from that baseline.",
        "",
        "| name | threshold | formula | trips | FP | FN | labeled_buckets | baseline p50 | baseline p95 | baseline p99 | baseline σ |",
        "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in results:
        lines.append(
            f"| {r.name} | {r.threshold} | {r.formula} | {r.trips} | {r.fp} | {r.fn} "
            f"| {r.labeled_buckets} | {r.baseline_p50} | {r.baseline_p95} "
            f"| {r.baseline_p99} | {r.baseline_sigma} |"
        )
    lines.append("")
    out_md.write_text("\n".join(lines), encoding="utf-8")



def main(argv: list[str]) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    p = argparse.ArgumentParser(description="Denial-burst evidence pipeline")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--in", dest="in_path", type=Path, help="Existing JSONL to replay")
    src.add_argument("--db", dest="db_path", type=Path, help="Audit sink SQLite to export")
    p.add_argument("--window-hours", type=int, default=2160)
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--no-html", action="store_true", help="Skip the HTML tradeoff render")
    p.add_argument("--pdf", action="store_true",
                   help="Also render denial_tradeoff.pdf alongside the HTML report.")
    args = p.parse_args(argv)


    args.out_dir.mkdir(parents=True, exist_ok=True)

    if args.in_path is not None:
        jsonl = args.in_path
    else:
        jsonl = args.out_dir / "denial_events.jsonl"
        _run_export(args.db_path, jsonl, args.window_hours)

    log.info("evidence.load path=%s", jsonl)
    rows = load_rows(jsonl)
    stats, results = evaluate_all(rows)
    log.info(
        "evidence.baseline sample=%d p50=%d p95=%d p99=%d sigma=%s",
        stats.sample_size, stats.p50, stats.p95, stats.p99, stats.sigma,
    )

    html_path: Path | None = None
    if not args.no_html:
        html_path = args.out_dir / "denial_tradeoff.html"
        html_path.write_text(render_html(jsonl, stats, results), encoding="utf-8")
        log.info("evidence.html wrote=%s", html_path)

    pdf_path: Path | None = None
    if args.pdf:
        pdf_path = args.out_dir / "denial_tradeoff.pdf"
        write_pdf(pdf_path, jsonl, stats, results)
        log.info("evidence.pdf wrote=%s", pdf_path)


    md_path = args.out_dir / "denial_evidence.md"
    _write_markdown(md_path, jsonl, stats, results, html_path, pdf_path)
    log.info("evidence.markdown wrote=%s", md_path)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
