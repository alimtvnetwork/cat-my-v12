import re

path = "src/routes/projects/$projectId/index.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# Add imports
if "FileCode" not in code:
    code = code.replace(
        "import {", 
        "import { FileCode, Image, SplitSquareHorizontal, Camera, "
    )

# Fix OverviewError
code = re.sub(
    r"errorComponent: OverviewError,\s*notFoundComponent: OverviewNotFound,",
    "",
    code
)

# Fix activeTab
code = re.sub(
    r'const \[activeTab, setActiveTab\] = useState<"overview" \| "analysis">\("overview"\);',
    'const [activeTab, setActiveTab] = useState<string>("Overview");',
    code
)

# Fix HmiShell title
code = code.replace("<HmiShell>", '<HmiShell title="Project Overview">')

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("Fixed")
