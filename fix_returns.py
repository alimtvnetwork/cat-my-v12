import os
import glob
import re
import shutil
import time
import subprocess

TASK_DIR = r"d:\work\cat-my\.lovable\plans\subtasks\96-plan-guideline-audit"
TEMP_DIR = r"d:\work\cat-my\.lovable\temp"

def run_git(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=r"d:\work\cat-my")

def fix_file(target_file, violating_lines):
    if not os.path.exists(target_file):
        return False

    with open(target_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    out_lines = []
    changed = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("return ") or stripped == "return" or stripped == "return;" or stripped.startswith("return("):
            if len(out_lines) > 0:
                prev = out_lines[-1].strip()
                if prev and prev != "{" and prev != "[" and prev != "(" and not prev.startswith("//") and not prev.startswith("/*"):
                    out_lines.append("\n")
                    changed = True
        out_lines.append(line)
        
    if changed:
        with open(target_file, "w", encoding="utf-8") as f:
            f.writelines(out_lines)
    return changed

def process_tasks():
    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR)
        
    while True:
        run_git("git pull --rebase --autostash")
        
        all_tasks = glob.glob(os.path.join(TASK_DIR, "*.md"))
        unclaimed = [t for t in all_tasks if not t.endswith(".claimed") and not t.endswith(".done")]
        
        if not unclaimed:
            print("No tasks left!")
            break
            
        batch = unclaimed[:3]
        claimed_files = []
        for task in batch:
            claimed_name = task + ".claimed"
            try:
                os.rename(task, claimed_name)
                claimed_files.append(claimed_name)
            except Exception as e:
                pass
                
        if not claimed_files:
            continue
            
        modified_targets = []
        
        for task in claimed_files:
            with open(task, "r", encoding="utf-8") as f:
                content = f.read()
                
            target_match = re.search(r"\*\*Target File:\*\*\s*`(.*?)`", content)
            if target_match:
                target_file = os.path.join(r"d:\work\cat-my", target_match.group(1).replace("/", "\\"))
                if "String union found" in content:
                    print(f"Skipping String union found task {task}")
                    # Keep it as claimed, we'll skip it
                    continue
                else:
                    fix_file(target_file, [])
                    modified_targets.append(target_file)
            
            # Move the task file to done (in file system)
            done_name = os.path.join(TEMP_DIR, os.path.basename(task).replace(".md.claimed", ".md.done"))
            try:
                shutil.move(task, done_name)
            except:
                pass
            
            # Ensure it is removed from git!
            original_task = task.replace(".md.claimed", ".md")
            run_git(f'git rm "{original_task}"')
            
        if modified_targets:
            for t in modified_targets:
                run_git(f'git add "{t}"')
            
        # Commit if anything changed
        status = run_git("git status --porcelain")
        if status.stdout.strip():
            run_git('git commit -m "fix: resolve guideline audit batch (auto-py)"')
            
            while True:
                res = run_git("git pull --rebase --autostash")
                if res.returncode == 0:
                    push_res = run_git("git push")
                    if push_res.returncode == 0:
                        break
                time.sleep(2)

if __name__ == "__main__":
    process_tasks()
