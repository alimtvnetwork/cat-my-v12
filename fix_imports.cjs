const fs = require("fs");
const path = "src/routes/projects/$projectId/index.tsx";
let code = fs.readFileSync(path, "utf8");

// We need to add HmiShell and icons to the imports
if (!code.includes("HmiShell")) {
  code = code.replace(
    /import \{ Plus, Play, Download, Archive, /g,
    'import { Plus, Play, Download, Archive, FileCode, Image, SplitSquareHorizontal, Camera, '
  );
  code = `import { HmiShell } from "@/components/hmi/HmiShell";\n` + code;
}

// Fix activeTab typing since I changed it to capitalized strings
code = code.replace(
  /const \[activeTab, setActiveTab\] = useState<"overview" \| "analysis">\("overview"\);/,
  'const [activeTab, setActiveTab] = useState<string>("Overview");'
);
// Also remove OverviewError and OverviewNotFound which might be exported but don't exist
code = code.replace(
  /errorComponent: OverviewError,\n  notFoundComponent: OverviewNotFound,/,
  ""
);

fs.writeFileSync(path, code);
console.log("Imports fixed");
