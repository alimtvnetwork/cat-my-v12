import re
path = "src/routes/projects/$projectId/index.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

code = re.sub(
    r'const \[activeTab, setActiveTab\] = useState<[^>]+>\([^)]+\);',
    'const [activeTab, setActiveTab] = useState<string>("Overview");',
    code
)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)
print("activeTab fixed")
