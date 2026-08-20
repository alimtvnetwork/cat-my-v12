import pathlib
import re

def fix_python_files():
    search_dirs = [
        pathlib.Path('BE/app/db/writers'),
        pathlib.Path('BE/app/domain'),
        pathlib.Path('BE/app'),
        pathlib.Path('BE/routes/observability'),
    ]
    
    files = []
    for d in search_dirs:
        if d.is_dir():
            if d.name == 'app':
                files.extend(d.glob('retention.py'))
            else:
                files.extend(d.glob('*.py'))

    for p in files:
        if not p.is_file(): continue
        if p.name == 'connections.py': continue
        
        content = p.read_text('utf-8')
        original = content
        
        def replacer(m):
            func = m.group(1)
            args = m.group(2)
            if 'BEGIN' in args or 'COMMIT' in args or 'ROLLBACK' in args:
                return f".{func}({args}"
            return f".safe_{func}({args}"
            
        content = re.sub(r'\.(execute|executemany|executescript)\((.*?)(?=\))', replacer, content, flags=re.DOTALL)
        
        if content != original:
            p.write_text(content, 'utf-8')
            print(f"Fixed {p}")

if __name__ == '__main__':
    fix_python_files()
