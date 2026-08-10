import * as fs from 'fs';

function r(file: string, a: string | RegExp, b: string) {
    let content = fs.readFileSync(file, 'utf8');
    let mod = content.replace(a, b);
    if (mod !== content) {
        fs.writeFileSync(file, mod, 'utf8');
        console.log('Fixed ' + file);
    }
}

r('src/lib/editor/validation.shared.ts', /ok: boolean;/g, 'ok: boolean;\n  isFail?: boolean;');
r('src/lib/editor/worker-health-store.ts', /ok: true\n/g, 'ok: true, isFail: false\n');
r('src/lib/editor/worker-health-store.ts', /ok: false, reason/g, 'ok: false, isFail: true, reason');

