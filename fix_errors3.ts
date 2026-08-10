import * as fs from 'fs';

function r(file: string, a: string | RegExp, b: string) {
    let content = fs.readFileSync(file, 'utf8');
    let mod = content.replace(a, b);
    if (mod !== content) {
        fs.writeFileSync(file, mod, 'utf8');
        console.log('Fixed ' + file);
    }
}

r('src/lib/camera/facade.ts', /\{ ok: true \}/g, '{ ok: true; isFail: false }');
r('src/lib/camera/store.ts', /\{ ok: true \}/g, '{ ok: true; isFail: false }');
r('src/lib/editor/math/evaluator.ts', /ok: false, reason:/g, 'ok: false, isFail: true, reason:');
r('src/lib/editor/validation.functions.ts', /ok: true, version:/g, 'ok: true, isFail: false, version:');
r('src/lib/editor/validation.functions.ts', /ok: false, reason/g, 'ok: false, isFail: true, reason');
r('src/lib/editor/validation.functions.ts', /ok: false, engine:/g, 'ok: false, isFail: true, engine:');
r('src/lib/editor/validation.functions.ts', /ok: true, engine:/g, 'ok: true, isFail: false, engine:');
r('src/lib/editor/validation.functions.ts', /ok: true, latencyMs:/g, 'ok: true, isFail: false, latencyMs:');
r('src/lib/editor/worker-health-store.ts', /\{ ok: false, reason/g, '{ ok: false, isFail: true, reason');
