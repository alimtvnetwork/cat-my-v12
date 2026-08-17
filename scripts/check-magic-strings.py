import os
import sys
import re

def check_magic_strings():
    violating_files = []
    
    # Regex patterns for magic strings in routing and fetching
    # Matches navigate("/path"), <Link to="/path">, beFetch("/api/path")
    patterns = [
        r'navigate\(\s*[\'"](/[^\'"]+)[\'"]\s*\)',
        r'navigate\(\s*\{\s*to:\s*[\'"](/[^\'"]+)[\'"]',
        r'to=[\'"](/[^\'"]+)[\'"]',
        r'beFetch\(\s*[\'"](/[^\'"]+)[\'"]\s*\)',
        r'beFetch\(\s*[\'"](http://[^\'"]+)[\'"]\s*\)'
    ]
    compiled_patterns = [re.compile(p) for p in patterns]
    
    exclude_dirs = ['node_modules', '.git', 'dist', 'build', '__tests__', 'tests', 'coverage', '.lovable', 'scripts', 'generated', '.venv']
    
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    for line_num, line in enumerate(f, 1):
                        for pattern in compiled_patterns:
                            if pattern.search(line):
                                violating_files.append((filepath, line_num, line.strip()))

    if violating_files:
        print("ERROR: Found magic strings used for routing or API endpoints.")
        print("Please use the centralized AppRouteType or ApiEndpointType enums instead.\n")
        for filepath, line_num, line in violating_files:
            print(f"  {filepath}:{line_num} -> {line}")
        sys.exit(1)
    else:
        print("SUCCESS: No magic string routing/API calls found.")
        sys.exit(0)

if __name__ == '__main__':
    check_magic_strings()
