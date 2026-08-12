import os
import glob

pending_dir = ".lovable/plans/pending"
completed_dir = ".lovable/plans/completed"

files_to_move = [
    "29-denial-burst-threshold-tuning.md",
    "33-plan-29-denial-burst-tuning-read-phase.md",
    "47-plan33-read-phase-kickoff.md",
    "48-plan33-server-fn-and-percentiles.md",
    "40-tools-images-spec-docs.md",
    "50-plan29-rollout-and-observability.md",
    "51-plan50-dashboard-and-alert-scaffold.md"
]

for f in files_to_move:
    src = os.path.join(pending_dir, f)
    dst = os.path.join(completed_dir, f)
    if os.path.exists(src):
        with open(src, "r") as src_file:
            content = src_file.read()
        content = content.replace("Status: pending", "Status: completed")
        with open(dst, "w") as dst_file:
            dst_file.write(content)
        os.remove(src)
