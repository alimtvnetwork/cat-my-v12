import re

file_path = "src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add useNavigate hook inside the component
old_hook = """  const [isCameraOpen, setIsCameraOpen] = useState(false);"""
new_hook = """  const navigate = useNavigate();
  const [isCameraOpen, setIsCameraOpen] = useState(false);"""

if "const navigate = useNavigate();" not in content:
    content = content.replace(old_hook, new_hook)

# Add import if missing
if 'useNavigate' not in content:
    content = content.replace('import { Plus, Camera, FileImage, ScanSearch, Save, Play, Film } from "lucide-react";', 
                             'import { Plus, Camera, FileImage, ScanSearch, Save, Play, Film } from "lucide-react";\nimport { useNavigate } from "@tanstack/react-router";')

# Replace window.location.href with navigate
content = content.replace(
    """window.location.href = `/projects/${project.id}/rulesets/${activeRuleset.id}/add-rule`;""",
    """navigate({ to: "/projects/$projectId/rulesets/$rulesetId/add-rule", params: { projectId: project.id, rulesetId: activeRuleset.id } });"""
)

content = content.replace(
    """window.location.href = `/projects/${project.id}/rulesets/${activeRuleset.id}/tune/${r.id}`;""",
    """navigate({ to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId", params: { projectId: project.id, rulesetId: activeRuleset.id, ruleId: r.id } });"""
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
