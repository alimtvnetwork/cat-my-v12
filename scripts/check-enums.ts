import { Project } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

project.addSourceFilesAtPaths("src/**/*.ts");
project.addSourceFilesAtPaths("src/**/*.tsx");

console.log("Analyzing enums for lowercase or snake_case values...");

for (const sourceFile of project.getSourceFiles()) {
  for (const enumDecl of sourceFile.getEnums()) {
    const enumName = enumDecl.getName();
    for (const member of enumDecl.getMembers()) {
      const val = member.getValue();
      if (typeof val === "string") {
        if (val !== val.charAt(0).toUpperCase() + val.slice(1) || val.includes("_")) {
          console.log(
            `Found invalid enum value: ${enumName}.${member.getName()} = "${val}" in ${sourceFile.getBaseName()}`,
          );
        }
      }
    }
  }
}
