import re

file_path = "src/components/hmi/HmiShell.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the <section> header
old_section = """        <section
          role="region"
          aria-label={title}
          className="flex h-9 items-center gap-4 bg-gradient-to-b from-ca-panel/40 to-ca-bg px-4 text-ca-ink font-hmi border-b border-ca-border/60"
        >
          <h1 className="text-[0.82rem] font-semibold uppercase tracking-[0.14em] text-ca-ink/90">
            {title}
          </h1>
          {!hideNav && (
            <div className="flex-1 flex items-center justify-between">
              <FavoritesBar />
              {headerActions ? <div className="flex items-center gap-1.5">{headerActions}</div> : null}
            </div>
          )}
        </section>"""

new_section = """        <section
          role="region"
          aria-label="Favorites and Actions"
          className="flex h-9 items-center justify-between bg-[#111318] px-4 text-ca-ink border-b border-[#22252a]"
        >
          {!hideNav ? (
            <div className="flex-1 flex items-center justify-between">
              <FavoritesBar />
              {headerActions ? <div className="flex items-center gap-1.5">{headerActions}</div> : null}
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-end">
              {headerActions ? <div className="flex items-center gap-1.5">{headerActions}</div> : null}
             </div>
          )}
        </section>"""

content = content.replace(old_section, new_section)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
