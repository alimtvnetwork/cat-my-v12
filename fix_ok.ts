import * as fs from 'fs';
import * as path from 'path';

function processDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Use regex to replace .ok === false with .isFail, but skip res.ok or upstreamResp.ok if we see them.
            // Let's replace r.ok === false, result.ok === false, v.ok === false, out.ok === false, etc.
            // Basically (\w+)\.ok === false.
            content = content.replace(/(\w+)\.ok === false/g, (match, p1) => {
                if (p1 === 'res' || p1 === 'resp' || p1 === 'response' || p1 === 'upstreamResp' || p1 === 'workerResp' || p1 === 'h') {
                    // h.ok === false in worker-health-store.ts - wait, I added isFail to WorkerHealth!
                    if (p1 === 'h' || p1 === 'res') {
                        // wait, in calibration.functions.ts res is a Response.
                        // let's specifically skip res in calibration.functions.ts and validation.functions.ts
                        if (fullPath.includes('calibration.functions.ts') || fullPath.includes('validation.functions.ts')) {
                            if (p1 === 'res') return match;
                        }
                    }
                    if (p1 === 'resp' || p1 === 'response' || p1 === 'upstreamResp' || p1 === 'workerResp') return match;
                }
                return ${p1}.isFail;
            });
            
            // Also replace .ok === true with !.isFail ? NO, we don't need to replace ok === true unless we want to, but the rule says "Refactor the ~49 instances of .ok === false".

            if (originalContent !== content) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Modified ok check: ' + fullPath);
            }
        }
    }
}
processDir('src/lib/camera');
processDir('src/lib/editor');
