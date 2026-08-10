import * as fs from 'fs';

let content = fs.readFileSync('src/lib/editor/validation.functions.ts', 'utf8');
content = content.replace(/ok: true, isFail: false, version:/g, 'ok: true, version:');
content = content.replace(/ok: false, isFail: true, reason/g, 'ok: false, reason');
content = content.replace(/ok: false, isFail: true, engine:/g, 'ok: false, engine:');
content = content.replace(/ok: true, isFail: false, engine:/g, 'ok: true, engine:');
content = content.replace(/ok: true, isFail: false, latencyMs:/g, 'ok: true, latencyMs:');

fs.writeFileSync('src/lib/editor/validation.functions.ts', content, 'utf8');

let wh = fs.readFileSync('src/lib/editor/worker-health-store.ts', 'utf8');
wh = wh.replace(/ok: true, isFail: false\n/g, 'ok: true\n');
wh = wh.replace(/ok: false, isFail: true, reason/g, 'ok: false, reason');
fs.writeFileSync('src/lib/editor/worker-health-store.ts', wh, 'utf8');

