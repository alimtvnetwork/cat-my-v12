path = "src/routes/projects/$projectId/index.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace(
    '} , FileCode, Image, SplitSquareHorizontal, Camera} from "lucide-react";',
    '  FileCode, Image, SplitSquareHorizontal, Camera\n} from "lucide-react";'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("Syntax fixed")
