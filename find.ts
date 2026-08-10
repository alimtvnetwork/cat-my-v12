import { Project, SyntaxKind, UnionTypeNode } from 'ts-morph';
const p = new Project({ tsConfigFilePath: './tsconfig.json' });
const files = p.getSourceFiles('src/components/**/*.{ts,tsx}');
let found = 0;
for (const f of files) {
  for (const t of f.getTypeAliases()) {
    const node = t.getTypeNode();
    if (node && node.getKind() === SyntaxKind.UnionType) {
      const types = (node as UnionTypeNode).getTypeNodes();
      if (types.every(tt => tt.getKind() === SyntaxKind.LiteralType)) {
        console.log(f.getFilePath() + ' : ' + t.getName());
        found++;
      }
    }
  }
}
console.log('Found: ' + found);
