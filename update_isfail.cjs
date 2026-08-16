const fs = require('fs');
const files = [
  'd:/work/cat-my/src/components/cli/UserConfigForm.tsx',
  'd:/work/cat-my/src/components/hmi/RunErrorDrawer.tsx',
  'd:/work/cat-my/src/lib/backend/http.ts',
  'd:/work/cat-my/src/lib/be-fetch.ts',
  'd:/work/cat-my/src/lib/camera/facade.ts',
  'd:/work/cat-my/src/routes/admin.security.denial-burst.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/if\s*\(\s*query\.isFail\b/g, 'if (query.isFail === true');
  c = c.replace(/if\s*\(\s*isFail\b/g, 'if (isFail === true');
  c = c.replace(/if\s*\(\s*q\.isFail\b/g, 'if (q.isFail === true');
  c = c.replace(/if\s*\(\s*!isFail\b/g, 'if (isFail === false');
  fs.writeFileSync(f, c);
});
