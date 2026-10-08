const fs = require("fs");
const path = "src/routes/projects/$projectId/index.tsx";
let code = fs.readFileSync(path, "utf8");

// Add HmiShell to imports if not imported
if (!code.includes("import { HmiShell }")) {
  code = `import { HmiShell } from "@/components/hmi/HmiShell";\n` + code;
}

// Add icons to lucide-react import
code = code.replace(
  /import \{ Plus, Play, Download, Archive, /g,
  'import { Plus, Play, Download, Archive, FileCode, Image, SplitSquareHorizontal, Camera, FileDown, ScanSearch, '
);

// Fix OverviewError
code = code.replace(
  /errorComponent: OverviewError,\n  notFoundComponent: OverviewNotFound,/g,
  ""
);

// Fix activeTab
code = code.replace(
  /const \[activeTab, setActiveTab\] = useState<"overview" \| "analysis">\("overview"\);/g,
  'const [activeTab, setActiveTab] = useState<string>("Overview");'
);

fs.writeFileSync(path, code);
console.log("Fixed imports for real.");
