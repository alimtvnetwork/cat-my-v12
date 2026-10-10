import re

file_path = "src/lib/projects/store.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """                  createdAt: Date.now(),
                  rulesetIds,
                  deviceId: opts?.deviceId?.trim() || undefined,
                  cameraName: opts?.cameraName?.trim() || undefined,
                  categoryNames: categoryNames.length > 0 ? categoryNames : undefined,"""
                  
new_block = """                  createdAt: Date.now(),
                  rulesetIds,
                  deviceId: opts?.deviceId?.trim() || undefined,
                  cameraName: opts?.cameraName?.trim() || undefined,
                  categoryNames: categoryNames.length > 0 ? categoryNames : undefined,
                  projectCode: opts?.projectCode?.trim() || undefined,
                  description: opts?.description?.trim() || undefined,"""

content = content.replace(old_block, new_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

file_path2 = "src/routes/projects/new.tsx"
with open(file_path2, "r", encoding="utf-8") as f:
    content2 = f.read()
    
old_submit = """      const projectId = createProject(name.trim(), {
        // the user said "optional project/program code, optional description"
        // we store code in description for now since there's no native code field, or just leave it for now
      });"""

new_submit = """      const projectId = createProject(name.trim(), {
        projectCode: code,
        description: description
      });"""
      
content2 = content2.replace(old_submit, new_submit)

with open(file_path2, "w", encoding="utf-8") as f:
    f.write(content2)
