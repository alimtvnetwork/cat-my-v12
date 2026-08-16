const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, callback);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      callback(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // 1. Replace console.* with ClientLogger.*
  // Only for src/components and src/lib, but let's just do it for all if not excluded?
  // Wait, the prompt specifically said src/components and src/lib.
  if (filePath.includes(path.join('src', 'components')) || filePath.includes(path.join('src', 'lib'))) {
    const consoleRegex = /console\.(info|warn|error)\(/g;
    if (consoleRegex.test(content) && !filePath.includes('client-logger.ts')) {
      content = content.replace(consoleRegex, 'ClientLogger.$1(');
      
      // Add import if ClientLogger is used
      if (!content.includes('ClientLogger')) {
        // Find how many levels deep we are to construct relative import or use absolute import alias
        // Assuming there is a generic alias like `@/lib/observability/client-logger`
        const importStmt = `import { ClientLogger } from "@/lib/observability/client-logger";\n`;
        content = importStmt + content;
      } else if (!content.includes('import { ClientLogger')) {
         const importStmt = `import { ClientLogger } from "@/lib/observability/client-logger";\n`;
         content = importStmt + content;
      }
      changed = true;
    }
  }
  
  // 2. Replace instanceof EnvelopeError with .name === "EnvelopeError"
  const envelopeRegex1 = /(\w+)\s+instanceof\s+EnvelopeError/g;
  if (envelopeRegex1.test(content)) {
    content = content.replace(envelopeRegex1, '($1 as any).name === "EnvelopeError"');
    changed = true;
  }
  const envelopeRegex2 = /err\s+instanceof\s+EnvelopeError/g;
  if (envelopeRegex2.test(content)) {
    content = content.replace(envelopeRegex2, '(err as any).name === "EnvelopeError"');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walk(path.join(__dirname, 'src'), processFile);
