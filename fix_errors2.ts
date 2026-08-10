import * as fs from 'fs';

function r(file: string, a: string | RegExp, b: string) {
    let content = fs.readFileSync(file, 'utf8');
    let mod = content.replace(a, b);
    if (mod !== content) {
        fs.writeFileSync(file, mod, 'utf8');
        console.log('Fixed ' + file);
    }
}

// In facade.ts, CameraRemoveOutcome has { ok: true } and { ok: false, kind: ... }.
r('src/lib/camera/facade.ts', 
  /export type CameraRemoveOutcome =[\s\S]*?\{ ok: false, kind: 'referenced', projects: string\[\] \};/m,
  "export type CameraRemoveOutcome =\n  | { ok: true, isFail: false }\n  | { ok: false, isFail: true, kind: 'validation', errors: import('zod').ZodIssue[] }\n  | { ok: false, isFail: true, kind: 'referenced', projects: string[] };"
);

// In store.ts, there's { ok: true } | { ok: false; failure: CameraFailure } maybe?
// Actually in store.ts, there's xport type StoreResult<T> = { ok: true, data: T } | { ok: false, failure: CameraFailure };?
