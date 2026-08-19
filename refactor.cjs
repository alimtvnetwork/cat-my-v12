const fs = require('fs');
const path = './src/components/editor/canvas/SelectionOverlay.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Add import
if (!content.includes('SelectionOverlayContextMenu')) {
  const importStatement = `import { SelectionOverlayContextMenu } from "./SelectionOverlayContextMenu";\n`;
  content = content.replace(
    `import { svgMaskDataUrl, type HudParamSpec } from "./SelectionOverlayUtils";`,
    `import { svgMaskDataUrl, type HudParamSpec } from "./SelectionOverlayUtils";\n${importStatement}`
  );
}

// 2. Remove hooks
// The hooks are from `useEffect(() => { \n    if (!contextMenu) { \n      return;` 
// up to `first?.focus();\n  }, [contextMenu, menuPos]);`
const hooksStartIdx = content.indexOf(`  useEffect(() => {\n    if (!contextMenu) {\n      return;\n    }\n    const closePointer`);
const hooksEndIdx = content.indexOf(`  }, [contextMenu, menuPos]);`) + `  }, [contextMenu, menuPos]);`.length;

if (hooksStartIdx !== -1 && hooksEndIdx !== -1) {
  content = content.slice(0, hooksStartIdx) + content.slice(hooksEndIdx + 1);
} else {
  console.log("Hooks not found!");
}

// 3. Replace menu JSX
// The JSX is from `{contextMenu && menuRule && typeof document !== "undefined"`
// to `document.body,\n          )\n        : null}`
const jsxStartIdx = content.indexOf(`{contextMenu && menuRule && typeof document !== "undefined"`);
const jsxEndStr = `            document.body,\n          )\n        : null}`;
const jsxEndIdx = content.indexOf(jsxEndStr) + jsxEndStr.length;

if (jsxStartIdx !== -1 && jsxEndIdx !== -1) {
  const replacementJSX = `{contextMenu && menuRule ? (
        <SelectionOverlayContextMenu
          contextMenu={contextMenu}
          menuRule={menuRule}
          rules={rules}
          onChangeKind={onChangeKind}
          onSetColor={onSetColor}
          onRotate={onRotate}
          onAction={onAction}
          onCloseContextMenu={onCloseContextMenu}
        />
      ) : null}`;
  content = content.slice(0, jsxStartIdx) + replacementJSX + content.slice(jsxEndIdx);
} else {
  console.log("JSX not found!");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Refactoring complete");
