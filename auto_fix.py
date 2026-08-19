import os
import re
import sys

def process_file(task_file):
    with open(task_file, 'r', encoding='utf-8') as f:
        content = f.read()

    target_match = re.search(r'\*\*Target File:\*\* `([^`]+)`', content)
    if not target_match:
        print(f"No target file in {task_file}")
        return True # skip
    
    target_file = target_match.group(1)
    
    violations = re.findall(r'- Line (\d+): \*\*([^\*]+)\*\*', content)
    
    if not os.path.exists(target_file):
        print(f"Target file {target_file} not found. Skipping.")
        return True # skip

    with open(target_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    violations = sorted(violations, key=lambda x: int(x[0]), reverse=True)
    
    modified = False
    for line_num_str, rule in violations:
        line_num = int(line_num_str)
        idx = line_num - 1
        
        if "Missing blank line before return" in rule:
            found = False
            for offset in range(-5, 6):
                check_idx = idx + offset
                if 0 <= check_idx < len(lines) and 'return ' in lines[check_idx] or 'return(' in lines[check_idx] or 'return;' in lines[check_idx]:
                    if check_idx > 0 and lines[check_idx-1].strip() != "":
                        indent = len(lines[check_idx]) - len(lines[check_idx].lstrip())
                        lines.insert(check_idx, ' ' * indent + '\n')
                        modified = True
                        print(f"Fixed return on line {check_idx+1} in {target_file}")
                        found = True
                        break
                    elif check_idx > 0 and lines[check_idx-1].strip() == "":
                        found = True
                        break
            if not found:
                print(f"Warning: could not find return statement near line {line_num} in {target_file}")
        elif "String union found" in rule:
            print(f"Unhandled rule: {rule} in {target_file}. Skipping this file.")
            return True
        else:
            print(f"Unhandled rule: {rule} in {target_file}")
            return True # skip instead of failing
            
    if modified:
        with open(target_file, 'w', encoding='utf-8') as f:
            f.writelines(lines)
            
    return True

print("Running...")
success = True
for f in sys.argv[1:]:
    print(f"Processing {f}")
    if not process_file(f):
        success = False

if not success:
    sys.exit(1)
