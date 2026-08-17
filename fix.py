import os
import re

import_statement = 'import { ClientLogger } from "@/lib/observability/client-logger";\n'

def process_file(fp):
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    content = re.sub(r'\bconsole\.info\(', 'ClientLogger.info(', content)
    content = re.sub(r'\bconsole\.warn\(', 'ClientLogger.warn(', content)
    content = re.sub(r'\bconsole\.error\(', 'ClientLogger.error(', content)
    content = re.sub(r'\bconsole\.log\(', 'ClientLogger.info(', content)

    if content != original:
        if 'ClientLogger' not in original:
            if 'import { ClientLogger }' not in content:
                match = re.search(r'^import\s+.*?from\s+[\'\"].*?[\'\"];?\n', content, re.MULTILINE)
                if match:
                    content = content[:match.start()] + import_statement + content[match.start():]
                else:
                    content = import_statement + content

        with open(fp, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {fp}')

for root, _, files in os.walk(r'd:\work\cat-my\src\components'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            process_file(os.path.join(root, f))

for root, _, files in os.walk(r'd:\work\cat-my\src\lib'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            if 'client-logger.ts' in f:
                continue
            process_file(os.path.join(root, f))
