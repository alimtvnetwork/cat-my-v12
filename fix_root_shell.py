import re

file_path = "src/lib/boot/root-shell-layout.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """      <LiveAnnouncer />
      {isModern ? (
        <>
          <GlobalHomeAffordance />
          <AppShellNav />
          <AppShellSidebar />
        </>
      ) : null}
    </>"""

new_block = """      <LiveAnnouncer />
    </>"""

content = content.replace(old_block, new_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
