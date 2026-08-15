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

      // Blindly do it for everything in camera that defines or returns ok: true / ok: false.
      // Wait, we need to be careful not to match things like res.ok === true
      content = content.replace(/ok: true;/g, "ok: true; isFail: false;");
      content = content.replace(/ok: false;/g, "ok: false; isFail: true;");
      content = content.replace(/ok: true,/g, "ok: true, isFail: false,");
      content = content.replace(/ok: false,/g, "ok: false, isFail: true,");

      if (originalContent !== content) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log("Modified camera types: " + fullPath);
      }
    }
  }
}
processDir("src/lib/camera");
