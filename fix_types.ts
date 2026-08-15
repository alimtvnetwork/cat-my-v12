import * as fs from "fs";
import * as path from "path";

function processDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let originalContent = content;

      // Simple replacement for internal types to add isFail: true/false.
      // But doing it automatically via regex is risky.
      // I'll search for where ok: true and ok: false are returned/defined.

      // For MathNumericResult:
      if (content.includes("MathNumericResult")) {
        content = content.replace(/ok: true;/g, "ok: true; isFail: false;");
        content = content.replace(/ok: false;/g, "ok: false; isFail: true;");
        content = content.replace(/ok: true,/g, "ok: true, isFail: false,");
        content = content.replace(/ok: false,/g, "ok: false, isFail: true,");
      }

      // For WorkerHealth:
      if (content.includes("WorkerHealth")) {
        content = content.replace(/ok: true;/g, "ok: true; isFail: false;");
        content = content.replace(/ok: false;/g, "ok: false; isFail: true;");
        content = content.replace(/ok: true,/g, "ok: true, isFail: false,");
        content = content.replace(/ok: false,/g, "ok: false, isFail: true,");
      }

      if (originalContent !== content) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log("Modified types: " + fullPath);
      }
    }
  }
}

// Check other common locations for type definitions
processDir("src/lib/camera");
processDir("src/lib/editor");
