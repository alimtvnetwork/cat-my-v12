import os
import re

def find_ts_string_unions(src_dir):
    union_pattern = re.compile(r'type\s+[A-Za-z0-9_]+\s*=\s*(?:["\'][A-Za-z0-9_-]+["\']\s*\|\s*)+["\'][A-Za-z0-9_-]+["\']', re.MULTILINE)
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = union_pattern.finditer(content)
                    for match in matches:
                        print(f"Found in {path}:")
                        print(match.group(0))
                        print("-" * 40)

def find_inverted_booleans(src_dir):
    # look for !var.isSuccess or !isSuccess
    pattern = re.compile(r'![A-Za-z0-9_]*\.?isSuccess\b', re.MULTILINE)
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx') or file.endswith('.py'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = pattern.finditer(content)
                    for match in matches:
                        print(f"Found in {path}:")
                        print(match.group(0))
                        print("-" * 40)

if __name__ == '__main__':
    find_ts_string_unions('d:/work/cat-my/src')
    find_inverted_booleans('d:/work/cat-my/src')
    find_inverted_booleans('d:/work/cat-my/BE')
