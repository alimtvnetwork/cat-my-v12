import { Project, SyntaxKind, Node } from "ts-morph";
import { pascalCase } from "pascal-case";

const p = new Project({ tsConfigFilePath: "./tsconfig.json" });

function fixAll() {
  let fixes = 0;
  const diagnostics = p.getPreEmitDiagnostics();
  for (const d of diagnostics) {
    if (
      d.getCode() === 2322 ||
      d.getCode() === 2345 ||
      d.getCode() === 2367 ||
      d.getCode() === 2769
    ) {
      const msg = d.getMessageText().toString();
      // Match things like 'EmptyStateActionVariantType | undefined' or 'EmptyStateActionVariantType'
      const match = msg.match(/Type '\"([^\"]+)\"' is not assignable to type '([A-Za-z0-9_]+Type)/);
      if (match) {
        const literalValue = match[1];
        const enumName = match[2];

        const file = d.getSourceFile();
        if (file) {
          const pos = d.getStart();
          if (pos !== undefined) {
            const node = file.getDescendantAtPos(pos);
            if (node) {
              const strNode =
                node.getFirstDescendantByKind(SyntaxKind.StringLiteral) ||
                (Node.isStringLiteral(node) ? node : undefined);
              if (strNode && strNode.getLiteralText() === literalValue) {
                let memberName = pascalCase(literalValue);
                if (!memberName) memberName = "Empty";
                if (/^\d/.test(memberName)) memberName = "_" + memberName;
                memberName = memberName.replace(/[^a-zA-Z0-9_]/g, "");

                strNode.replaceWithText(`${enumName}.${memberName}`);

                const hasImport = file
                  .getImportDeclarations()
                  .some((i) => i.getNamedImports().some((ni) => ni.getName() === enumName));
                if (!hasImport) {
                  const exportFiles = p.getSourceFiles().filter((f) => f.getEnum(enumName));
                  if (exportFiles.length > 0) {
                    const exportFile = exportFiles[0];
                    let relPath = file.getDirectory().getRelativePathTo(exportFile);
                    if (relPath.startsWith("..")) {
                      relPath = "@/" + p.getDirectory("src")!.getRelativePathTo(exportFile);
                    } else {
                      if (!relPath.startsWith(".")) relPath = "./" + relPath;
                    }
                    relPath = relPath.replace(/\.tsx?$/, "");
                    file.addImportDeclaration({
                      namedImports: [enumName],
                      moduleSpecifier: relPath,
                    });
                  }
                }
                fixes++;
              }
            }
          }
        }
      }
    }
  }
  return fixes;
}

let totalFixes = 0;
while (true) {
  const f = fixAll();
  if (f === 0) break;
  totalFixes += f;
}

console.log(`Applied ${totalFixes} fixes`);
p.saveSync();
