import os

base_dir = r"D:\work\cat-my\.lovable\plans\subtasks\91-standard-ui-deep-fixes"
os.makedirs(base_dir, exist_ok=True)

categories = [
    {
        "range": (1, 20),
        "title": "Right Panel Resizing & Fluidity",
        "root_cause": "The right-side panel elements in Standard UI lack dynamic resize handles and fluid constraints (e.g. max-width is hardcoded).",
        "action": "Implement a resizable splitter (similar to modern rule-based system). Ensure the container respects fluid flex boundaries. Update CSS to remove hardcoded pixel widths and implement percentages/flex-grow."
    },
    {
        "range": (21, 40),
        "title": "Menu Overlapping and Header Z-Index",
        "root_cause": "Dropdown menus in the standard mode have conflicting z-indexes or lack absolute positioning isolation, causing them to clip under the canvas.",
        "action": "Audit header drop-downs. Apply a strict z-index scale (e.g., z-50 for menus). Ensure popper/floating UI libraries are anchored correctly to the bounding box."
    },
    {
        "range": (41, 60),
        "title": "Grayscale Button Conversion (Cancel/OK)",
        "root_cause": "Buttons are color-tuned or improperly faded. Cancel buttons specifically look disabled.",
        "action": "Convert the component strictly to grayscale variables (e.g., bg-gray-200, hover:bg-gray-300). Remove color-tuning styles. Ensure contrast ratio is >4.5:1. Verify click targets are active."
    },
    {
        "range": (61, 80),
        "title": "Global Error Modal Integration",
        "root_cause": "Silent failures exist because actions do not wrap their API calls or state mutations in the spec/03-error-manage envelope.",
        "action": "Wrap the assigned component's actions in `apperror.Wrap()` or the frontend equivalent. Trigger the global Error Modal on failure. Never swallow errors."
    },
    {
        "range": (81, 100),
        "title": "Component Clickability & Unblocking",
        "root_cause": "Pointer-events are restricted or overlapping transparent divs block clicks.",
        "action": "Audit pointer-events. Remove transparent overlays blocking the components. Ensure `onClick` handlers are properly wired without propagation suppression unless necessary."
    }
]

for i in range(1, 101):
    cat = next(c for c in categories if c["range"][0] <= i <= c["range"][1])
    content = f"""# Subtask {i:02d}: {cat['title']} Part {i - cat['range'][0] + 1}

## Issue Description
User reported: "I cannot resize the stuff on the right side panel. Everything looks like just there, but it does not work. I cannot click stuff. Things are broken. And the most important part is the coloring of the buttons."

## Root Cause Analysis
{cat['root_cause']}

## Required Action (What to Fix)
{cat['action']}
- Component Target: Component chunk #{i}
- Strict Rules: Apply <= 15 lines per function, no nested if statements, and ensure boolean variables use positive prefixes (is/has).

## Instructions for Agent
1. Read `spec/03-error-manage` for error architecture.
2. Isolate the target component code.
3. Apply the fix as described in 'Required Action'.
4. Commit your changes locally.
"""
    file_path = os.path.join(base_dir, f"{i:02d}-task.md")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print(f"Generated 100 detailed subtasks in {base_dir}")
