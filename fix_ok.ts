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

            content = content.replace(/(\w+)\.ok === false/g, (match, p1) => {
                if (p1 === 'res' || p1 === 'resp' || p1 === 'response' || p1 === 'upstreamResp' || p1 === 'workerResp' || p1 === 'h') {
                    if (p1 === 'h') {
                        // h is WorkerHealth, we can replace
                        return p1 + '.isFail';
                    }
                    if (p1 === 'res') {
                        if (fullPath.includes('calibration.functions.ts') || fullPath.includes('validation.functions.ts')) {
                            return match;
                        }
                    }
                    if (p1 === 'resp' || p1 === 'response' || p1 === 'upstreamResp' || p1 === 'workerResp') return match;
                }
                return p1 + '.isFail';
            });

            if (originalContent !== content) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Modified ok check: ' + fullPath);
            }
        }
    }
}
processDir('src/lib/camera');
processDir('src/lib/editor');
