import { Project, SyntaxKind, Node, SourceFile } from 'ts-morph';
import { pascalCase } from 'pascal-case';

const p = new Project({ tsConfigFilePath: './tsconfig.json' });
const files = p.getSourceFiles('src/components/**/*.{ts,tsx}');

function getSafeEnumMemberName(str: string): string {
    let name = pascalCase(str);
    if (!name) name = "Empty";
    if (/^\d/.test(name)) name = "_" + name;
    // Replace invalid chars
    name = name.replace(/[^a-zA-Z0-9_]/g, "");
    return name;
}

for (const f of files) {
  let toCreate: { name: string, members: string[], replaceNode: Node, isTypeAlias: boolean, parentName: string | undefined }[] = [];
  
  f.forEachDescendant(node => {
    if (Node.isUnionTypeNode(node)) {
      const types = node.getTypeNodes();
      if (types.length > 0 && types.every(t => Node.isLiteralTypeNode(t) && t.getFirstChildByKind(SyntaxKind.StringLiteral))) {
        const members = types.map(t => t.getFirstChildByKind(SyntaxKind.StringLiteral)!.getLiteralText());
        let enumName = "";
        let isTypeAlias = false;
        let parentName = undefined;
        
        const parent = node.getParent();
        if (Node.isTypeAliasDeclaration(parent)) {
          enumName = parent.getName();
          if (!enumName.endsWith("Type")) enumName += "Type";
          isTypeAlias = true;
          parentName = parent.getName();
          toCreate.push({ name: enumName, members, replaceNode: parent, isTypeAlias, parentName });
        } else if (Node.isPropertySignature(parent)) {
          const propName = parent.getName();
          const grandParent = parent.getFirstAncestorByKind(SyntaxKind.InterfaceDeclaration) || parent.getFirstAncestorByKind(SyntaxKind.TypeAliasDeclaration);
          let prefix = grandParent ? grandParent.getName() : "";
          if (prefix === "Props") {
              const comp = parent.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) || parent.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
              if (comp) prefix = comp.getName() || "";
              else prefix = f.getBaseNameWithoutExtension();
          } else if (!prefix) prefix = f.getBaseNameWithoutExtension();
          enumName = pascalCase(prefix + " " + propName) + "Type";
          toCreate.push({ name: enumName, members, replaceNode: node, isTypeAlias, parentName });
        } else if (Node.isPropertyDeclaration(parent)) {
          const propName = parent.getName();
          const prefix = parent.getFirstAncestorByKind(SyntaxKind.ClassDeclaration)?.getName() || f.getBaseNameWithoutExtension();
          enumName = pascalCase(prefix + " " + propName) + "Type";
          toCreate.push({ name: enumName, members, replaceNode: node, isTypeAlias, parentName });
        } else if (Node.isParameterDeclaration(parent)) {
          const func = parent.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) || parent.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) || parent.getFirstAncestorByKind(SyntaxKind.ArrowFunction);
          let prefix = f.getBaseNameWithoutExtension();
          if (Node.isFunctionDeclaration(func) && func.getName()) prefix = func.getName()!;
          const paramName = parent.getName();
          enumName = pascalCase(prefix + " " + (paramName.startsWith('{') ? "Param" : paramName)) + "Type";
          toCreate.push({ name: enumName, members, replaceNode: node, isTypeAlias, parentName });
        }
      }
    }
  });

  // Sort by pos descending to avoid offset issues when replacing
  toCreate.sort((a, b) => b.replaceNode.getPos() - a.replaceNode.getPos());

  let addedEnums = new Set<string>();

  for (const plan of toCreate) {
    if (addedEnums.has(plan.name)) continue; // avoid duplicates if any
    
    // Create Enum text
    let enumText = `\nexport enum ${plan.name} {\n`;
    for (const m of plan.members) {
      enumText += `  ${getSafeEnumMemberName(m)} = "${m}",\n`;
    }
    enumText += `}\n`;
    
    if (plan.isTypeAlias) {
      // Just replace the type alias with the enum directly, if the name matches.
      // Wait, we need to make sure we don't break things if we rename it.
      // If we rename from `PropertyPaletteId` to `PropertyPaletteIdType`, we need to rename references.
      // For now, let's just insert the enum at the top of the file, and replace the Node.
      f.insertText(plan.replaceNode.getStart(), enumText);
      if (plan.name !== plan.parentName) {
         // Replace node with a type alias that points to the new Enum to temporarily fix references, 
         // OR we just use ts-morph's rename feature!
         // Wait, if it's a TypeAlias, we can rename the node itself!
         const typeAliasNode = plan.replaceNode as import('ts-morph').TypeAliasDeclaration;
         if (plan.name !== plan.parentName) {
            typeAliasNode.rename(plan.name);
         }
         typeAliasNode.remove();
      } else {
         const typeAliasNode = plan.replaceNode as import('ts-morph').TypeAliasDeclaration;
         typeAliasNode.remove();
      }
    } else {
      // Inline union replacement
      f.insertText(0, enumText);
      plan.replaceNode.replaceWithText(plan.name);
    }
    addedEnums.add(plan.name);
  }
}

p.saveSync();
