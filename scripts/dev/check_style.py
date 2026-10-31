files = ['BE/bug_reports/supabase_client.py', 'BE/bug_reports/reports.py', 'BE/routes/bug_reports.py']

for f in files:
    lines = open(f, encoding='utf-8').readlines()
    for i, line in enumerate(lines):
        stripped = line.strip()
        # check before if
        if (stripped.startswith('if ') or stripped.startswith('elif ')) and i > 0:
            prev = lines[i-1].strip()
            if prev and not prev.endswith(':') and not prev.startswith('#') and not prev.startswith('"""') and not prev.startswith("'''"):
                print(f'{f}:{i+1} missing blank line before if: {line.strip()[:40]} (prev: {prev[:30]})')
        # check before return
        if stripped.startswith('return') and i > 0:
            prev = lines[i-1].strip()
            if prev and not prev.endswith(':') and not prev.startswith('#') and not prev.startswith('"""') and not prev.startswith("'''"):
                print(f'{f}:{i+1} missing blank line before return: {line.strip()[:40]} (prev: {prev[:30]})')
