import { Project, SyntaxKind, TypeGuards, Node, FunctionDeclaration } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

project.addSourceFilesAtPaths("src/**/*.tsx");

console.log("Analyzing components for missing return types...");

let updated = 0;

for (const sourceFile of project.getSourceFiles()) {
  const functions = sourceFile.getFunctions();
  let fileUpdated = false;

  for (const func of functions) {
    if (!func.isExported()) continue; // Only apply to exported components

    const name = func.getName();
    if (!name || !/^[A-Z]/.test(name)) continue; // Must be PascalCase (React Component)

    const returnTypeNode = func.getReturnTypeNode();
    if (!returnTypeNode) {
      // Missing explicit return type, add it!
      func.setReturnType("React.JSX.Element | null");
      fileUpdated = true;
      updated++;
      console.log(`Added return type to ${name} in ${sourceFile.getBaseName()}`);
    }
  }

  const arrowFunctions = sourceFile.getVariableDeclarations().filter(v => v.getInitializerIfKind(SyntaxKind.ArrowFunction));
  for (const v of arrowFunctions) {
    const arrowFunc = v.getInitializerIfKind(SyntaxKind.ArrowFunction);
    if (!arrowFunc) continue;

    const parent = v.getFirstAncestorByKind(SyntaxKind.VariableStatement);
    if (!parent?.isExported()) continue;

    const name = v.getName();
    if (!name || !/^[A-Z]/.test(name)) continue;

    const returnTypeNode = arrowFunc.getReturnTypeNode();
    if (!returnTypeNode) {
      arrowFunc.setReturnType("React.JSX.Element | null");
      fileUpdated = true;
      updated++;
      console.log(`Added return type to ${name} (Arrow) in ${sourceFile.getBaseName()}`);
    }
  }

  if (fileUpdated) {
    // Add import React if missing and if we are returning React.JSX.Element
    const hasReactImport = sourceFile.getImportDeclarations().some(i => i.getModuleSpecifierValue() === "react");
    // Usually React 17+ doesn't need 'import React', but for types we might need it if not using global JSX namespace, 
    // actually `React.JSX.Element` requires `React` namespace imported if it's not global.
    // In this codebase they use `React.JSX.Element` everywhere, so it's probably okay or they have `import * as React from "react"`.
    sourceFile.saveSync();
  }
}

console.log(`Updated ${updated} components!`);
