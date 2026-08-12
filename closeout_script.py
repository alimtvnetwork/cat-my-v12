import os
import shutil
from pathlib import Path

def update_status(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("Status: pending", "Status: completed")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

def move_to_completed(filename, folder):
    src = Path(f".lovable/{folder}/pending/{filename}")
    dst = Path(f".lovable/{folder}/completed/{filename}")
    if src.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        update_status(src)
        shutil.move(str(src), str(dst))

def main():
    # Plan 35 closeout files
    os.makedirs(".lovable/memory/v2/plan35", exist_ok=True)
    with open(".lovable/memory/v2/plan35/50-slice-3.md", "w") as f:
        f.write("# Slice 3\nAll gaps closed.")
    with open(".lovable/memory/v2/plan35/60-closeout.md", "w") as f:
        f.write("# Closeout\nPlan 35 closed.")

    # Move plans for Plan 52
    for p in [29, 33, 47, 48, 49, 50, 51, 52]:
        for child in Path(".lovable/plans/pending").glob(f"{p}-*.md"):
            move_to_completed(child.name, "plans")

    # Move plans for Plan 59
    for p in [35, 56, 57, 58, 59]:
        for child in Path(".lovable/plans/pending").glob(f"{p}-*.md"):
            move_to_completed(child.name, "plans")
            
    # Move facades for Plan 80
    for child in Path(".lovable/pending-facades").glob("05-*.md"):
        dst = Path(".lovable/pending-facades/completed") / child.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(child), str(dst))
    for child in Path(".lovable/pending-facades").glob("06-*.md"):
        dst = Path(".lovable/pending-facades/completed") / child.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(child), str(dst))

    # Move plans for Plan 80
    for p in [79, 80]:
        for child in Path(".lovable/plans/pending").glob(f"{p}-*.md"):
            move_to_completed(child.name, "plans")

if __name__ == "__main__":
    main()
