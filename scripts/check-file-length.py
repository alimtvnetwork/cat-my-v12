import os
import sys

def check_file_length():
    max_lines = 80
    violating_files = []
    
    # Exclude directories
    exclude_dirs = ['node_modules', '.git', 'dist', 'build', '__tests__', 'tests', 'generated', 'coverage', '.lovable', 'scripts', '.venv']
    
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.ts', '.tsx', '.py')) and not file.endswith('.d.ts'):
                filepath = os.path.join(root, file)
                
                # Exclude route files as they naturally contain high-level wrappers and loader configs
                if 'src/routes' in filepath.replace('\\', '/'):
                    continue
                    
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                    if len(lines) > max_lines:
                        violating_files.append((filepath, len(lines)))

    if violating_files:
        print(f"ERROR: Found {len(violating_files)} files exceeding {max_lines} lines:")
        for file, count in sorted(violating_files, key=lambda x: x[1], reverse=True):
            print(f"  - {file}: {count} lines")
        print("\nPlease refactor these components into smaller, reusable pieces.")
        sys.exit(1)
    else:
        print(f"SUCCESS: All tracked source files are under {max_lines} lines.")
        sys.exit(0)

if __name__ == '__main__':
    check_file_length()
