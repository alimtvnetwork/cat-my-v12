import re

path = "src/routes/projects/$projectId/index.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# Add icons to lucide-react
match = re.search(r'import\s+\{([^}]+)\}\s+from\s+"lucide-react"', code)
if match:
    imports = match.group(1)
    needed = ['FileCode', 'Image', 'SplitSquareHorizontal', 'Camera']
    for n in needed:
        if n not in imports:
            imports += f", {n}"
    code = code[:match.start(1)] + imports + code[match.end(1):]

# Fix activeTab
code = re.sub(
    r'const \[activeTab, setActiveTab\] = useState<"overview" \| "analysis">\("overview"\);',
    'const [activeTab, setActiveTab] = useState<string>("Overview");',
    code
)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("Fixed")
