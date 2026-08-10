import { Project, SyntaxKind, UnionTypeNode, SourceFile, Node, TypeAliasDeclaration, PropertySignature, ParameterDeclaration } from 'ts-morph';
import { pascalCase } from 'pascal-case';

const p = new Project({ tsConfigFilePath: './tsconfig.json' });
const files = p.getSourceFiles('src/components/**/*.{ts,tsx}');

let enumsToCreate: { file: SourceFile, name: string, members: string[], replaceNode: Node }[] = [];

for (const f of files) {
  f.forEachDescendant(node => {
    if (Node.isUnionTypeNode(node)) {
      const types = node.getTypeNodes();
      // Only string literals
      if (types.length > 0 && types.every(t => Node.isLiteralTypeNode(t) && t.getFirstChildByKind(SyntaxKind.StringLiteral))) {
        // Collect string values
        const members = types.map(t => t.getFirstChildByKind(SyntaxKind.StringLiteral)!.getLiteralText());
        
        // Find a good name
        let enumName = "";
        
        const parent = node.getParent();
        if (Node.isTypeAliasDeclaration(parent)) {
          enumName = parent.getName();
          if (!enumName.endsWith("Type")) enumName += "Type";
          enumsToCreate.push({ file: f, name: enumName, members, replaceNode: parent });
        } else if (Node.isPropertySignature(parent)) {
          const propName = parent.getName();
          // Find closest interface or type alias
          const grandParent = parent.getFirstAncestorByKind(SyntaxKind.InterfaceDeclaration) || parent.getFirstAncestorByKind(SyntaxKind.TypeAliasDeclaration);
          let prefix = grandParent ? grandParent.getName() : "";
          if (prefix === "Props") {
              const comp = parent.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) || parent.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
              if (comp) prefix = comp.getName() || "";
              else {
                 prefix = f.getBaseNameWithoutExtension();
              }
          } else if (!prefix) {
             prefix = f.getBaseNameWithoutExtension();
          }
          enumName = pascalCase(prefix + " " + propName) + "Type";
          enumsToCreate.push({ file: f, name: enumName, members, replaceNode: node });
        } else if (Node.isPropertyDeclaration(parent)) {
          const propName = parent.getName();
          const prefix = parent.getFirstAncestorByKind(SyntaxKind.ClassDeclaration)?.getName() || f.getBaseNameWithoutExtension();
          enumName = pascalCase(prefix + " " + propName) + "Type";
          enumsToCreate.push({ file: f, name: enumName, members, replaceNode: node });
        } else if (Node.isParameterDeclaration(parent)) {
          const func = parent.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) || parent.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) || parent.getFirstAncestorByKind(SyntaxKind.ArrowFunction);
          // If it's a destructured param, this might be tricky, let's just use filename
          let prefix = f.getBaseNameWithoutExtension();
          if (Node.isFunctionDeclaration(func) && func.getName()) {
            prefix = func.getName()!;
          }
          const paramName = parent.getName(); // Might be ObjectBindingPattern
          enumName = pascalCase(prefix + " " + (paramName.startsWith('{') ? "Param" : paramName)) + "Type";
          enumsToCreate.push({ file: f, name: enumName, members, replaceNode: node });
        }
      }
    }
  });
}

// Log what we found
for (const e of enumsToCreate) {
  console.log(`Will create: ${e.name} in ${e.file.getBaseName()} with members ${e.members.join(', ')}`);
}
