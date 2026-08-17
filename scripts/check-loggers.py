import os
import sys
import re

def check_loggers():
    violating_files = []
    
    # Matches console.log, console.error, console.warn (excluding // comments if possible, but basic regex is fine for strict enforcement)
    pattern = re.compile(r'[^/]console\.(error|log|warn)\(')
    
    exclude_dirs = ['node_modules', '.git', 'dist', 'build', '__tests__', 'tests', 'coverage', '.lovable', 'scripts', 'generated', '.venv']
    # Exclude the logger utility itself
    exclude_files = ['client-logger.ts']
    
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.ts', '.tsx')) and file not in exclude_files:
                filepath = os.path.join(root, file)
                
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    for line_num, line in enumerate(f, 1):
                        if pattern.search(line) and not line.strip().startswith('//'):
                            violating_files.append((filepath, line_num, line.strip()))

    if violating_files:
        print("ERROR: Found raw console loggers used in application code.")
        print("Please use the centralized ClientLogger framework (src/lib/observability/client-logger.ts) instead.\n")
        for filepath, line_num, line in violating_files:
            print(f"  {filepath}:{line_num} -> {line}")
        sys.exit(1)
    else:
        print("SUCCESS: No raw console loggers found.")
        sys.exit(0)

if __name__ == '__main__':
    check_loggers()
