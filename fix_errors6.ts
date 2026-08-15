import * as fs from "fs";
import * as path from "path";

function walk(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, callback);
    else callback(p);
  });
}

walk("src/components", (p) => {
  if (!p.endsWith(".tsx") && !p.endsWith(".ts")) return;
  let content = fs.readFileSync(p, "utf-8");
  let changed = false;

  if (p.includes("PropertiesPalette.tsx")) {
    content = content.replace(/"info"/g, "PropertyPaletteIdType.Info");
    content = content.replace(/"history"/g, "PropertyPaletteIdType.History");
    content = content.replace(/"adjust"/g, "PropertyPaletteIdType.Adjust");
    content = content.replace(/"grid"/g, "PropertyPaletteIdType.Grid");
    content = content.replace(/"brush"/g, "PropertyPaletteIdType.Brush");
    content = content.replace(/"layers"/g, "PropertyPaletteIdType.Layers");
    content = content.replace(/"type"/g, "PropertyPaletteIdType.Type");
    content = content.replace(/"paragraph"/g, "PropertyPaletteIdType.Paragraph");
    content = content.replace(/"css"/g, "PropertyPaletteIdType.Css");
    content = content.replace(/"image"/g, "PropertyPaletteIdType.Image");
    content = content.replace(/"rail"/g, "ModeToggleTilePropsModeType.Rail");
    content = content.replace(/"accordion"/g, "ModeToggleTilePropsModeType.Accordion");
    content = content.replace(/"tabs"/g, "ModeToggleTilePropsModeType.Tabs");
    content = content.replace(/PropertiesPaneIdType\.Info/g, "PropertyPaletteIdType.Info");
    changed = true;
  }

  if (p.includes("RuleCreateDialog.tsx")) {
    content = content.replace(/=\s*"Rule"/g, "={RuleCreateDialogInitialKindType.Rule}");
    content = content.replace(/=\s*"Category"/g, "={RuleCreateDialogInitialKindType.Category}");
    content = content.replace(/=\s*"both"/g, "={RuleCreateDialogKindModeType.Both}");
    content = content.replace(/=\s*"rule"/g, "={RuleCreateDialogKindModeType.Rule}");
    content = content.replace(/=\s*"category"/g, "={RuleCreateDialogKindModeType.Category}");
    changed = true;
  }

  if (p.includes("ThemeController.tsx")) {
    content = content.replace(/"dark" \| "light"/g, "ApplyThemeClassResolvedType");
    changed = true;
  }

  if (p.includes("carousel.tsx")) {
    content = content.replace(/orientation\]/g, "orientation as CarouselPropsOrientationType]");
    content = content.replace(
      /orientation = "horizontal"/g,
      "orientation = CarouselPropsOrientationType.Horizontal",
    );
    changed = true;
  }

  if (p.includes("sidebar.tsx")) {
    content = content.replace(
      /state = "expanded"/g,
      "state = SidebarContextPropsStateType.Expanded",
    );
    content = content.replace(/side = "left"/g, "side = SidebarSideType.Left");
    content = content.replace(/side === "left"/g, "side === SidebarSideType.Left");
    content = content.replace(/side === "right"/g, "side === SidebarSideType.Right");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(p, content);
  }
});

walk("src/routes", (p) => {
  if (!p.endsWith(".tsx") && !p.endsWith(".ts")) return;
  let content = fs.readFileSync(p, "utf-8");
  let changed = false;

  if (p.includes("settings.trigger.tsx")) {
    // Fix conflicting import
    content = content.replace(
      /import { TriggerTimingDiagramPropsEdgeType } from '..\/..\/components\/settings\/TriggerTimingDiagram';\n/g,
      "",
    );
    content = content.replace(
      /type TriggerEdgeType = TriggerTimingDiagramPropsEdgeType;/g,
      "import { TriggerTimingDiagramPropsEdgeType } from '@/components/settings/TriggerTimingDiagram';",
    );
    content = content.replace(
      /import { TriggerTimingDiagramPropsEdgeType } from "@\/components\/settings\/TriggerTimingDiagram";\n/g,
      "",
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(p, content);
  }
});
