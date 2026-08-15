const fs = require("fs");
const path = require("path");

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let originalContent = content;

      // Replace .ok === false with .isFail
      content = content.replace(/\.ok === false/g, ".isFail");

      // Fix newlines before return and throw.
      // Match any non-newline character, then a newline, then some spaces, then return or throw
      // But we need to make sure it's not the first statement in a block.
      // Actually, a simpler way is to use a regex and replace.

      // It's tricky to do this precisely with regex. Let's do it line by line.
      let lines = content.split("\n");
      let newLines = [];
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
          // Check if previous line exists, is not empty, and is not { or // or /* or : or similar block start
          if (newLines.length > 0) {
            let prevLine = newLines[newLines.length - 1].trim();
            if (
              prevLine !== "" &&
              !prevLine.endsWith("{") &&
              !prevLine.endsWith(":") &&
              prevLine !== "}" &&
              !prevLine.startsWith("//")
            ) {
              // Let's add a blank line
              newLines.push("");
            }
          }
        }
        newLines.push(lines[i]);
      }

      let newContent = newLines.join("\n");
      if (originalContent !== newContent) {
        fs.writeFileSync(fullPath, newContent, "utf8");
        console.log("Modified: " + fullPath);
      }
    }
  }
}

processDir("src/lib/camera");
processDir("src/lib/editor");
