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

      // Fix newlines before return and throw.
      let lines = content.split("\n");
      let newLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();

        if (
          trimmed.startsWith("return ") ||
          trimmed === "return" ||
          trimmed === "return;" ||
          trimmed.startsWith("throw ") ||
          trimmed === "throw" ||
          trimmed === "throw;"
        ) {
          if (newLines.length > 0) {
            let prevLine = newLines[newLines.length - 1].trim();
            if (
              prevLine !== "" &&
              !prevLine.endsWith("{") &&
              !prevLine.endsWith(":") &&
              prevLine !== "}" &&
              !prevLine.startsWith("//") &&
              prevLine !== "});"
            ) {
              newLines.push("");
            }
          }
        }
        newLines.push(lines[i]);
      }

      let newContent = newLines.join("\n");
      if (originalContent !== newContent) {
        fs.writeFileSync(fullPath, newContent, "utf8");
        console.log("Modified newlines: " + fullPath);
      }
    }
  }
}

processDir("src/lib/camera");
processDir("src/lib/editor");
