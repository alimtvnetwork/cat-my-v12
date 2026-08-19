import re

with open('src/components/editor/canvas/SelectionOverlay.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_statement = 'import { useSelectionOverlayGestures } from "./useSelectionOverlayGestures";\n'
if import_statement not in content:
    content = content.replace('import { SelectionOverlayContextMenu }', import_statement + 'import { SelectionOverlayContextMenu }')

# Replace the handlers
start_marker = "  const onHandleDown = (\n"
end_marker = "  const menuRule = contextMenu ? (rules.find((r) => r.id === contextMenu.ruleId) ?? null) : null;\n"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    replacement = """  const {
    onHandleDown,
    onHandleMove,
    onHandleUp,
    onRotateDown,
    onRotateMove,
    onRotateUp,
    onRotateKeyDown,
    onResizeKeyDown,
  } = useSelectionOverlayGestures({
    rule,
    rules,
    viewport,
    snap,
    dragRef,
    rotateRef,
    boxCenter,
    theta,
    rotationSnapDefault,
    setIsResizing,
    setIsRotating,
    setAtAngleBound,
    setAlignGuides,
    setAlignDebug,
    setLastTolerancePx,
    forceRender,
    onResize,
    setRotations,
    onRotate,
  });

"""
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open('src/components/editor/canvas/SelectionOverlay.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Replaced successfully")
else:
    print(f"Could not find markers! start_idx: {start_idx}, end_idx: {end_idx}")
