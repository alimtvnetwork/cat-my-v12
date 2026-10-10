import re

file_path = "src/components/hmi/titlebar-parts.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_crumbs = """export function HeaderCrumbs({
  showBreadcrumb,
  program,
}: HeaderCrumbsProps): React.JSX.Element | null {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4 justify-between px-2">
      <div className="flex items-center gap-4">
        {showBreadcrumb && <AppBreadcrumb variant={AppBreadcrumbPropsVariantType.Inline} />}
        <CommandPaletteTrigger />
      </div>
      <ModernMainNav />
    </div>
  );
}"""

new_crumbs = """export function HeaderCrumbs({
  showBreadcrumb,
  program,
}: HeaderCrumbsProps): React.JSX.Element | null {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between px-2 ml-4 mr-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showBreadcrumb && (
          <div className="flex items-center h-7 rounded-full border border-[#333] bg-[#0b0c10] px-3 [&_.app-breadcrumb-inline]:py-0 [&_.app-breadcrumb-inline]:gap-2 text-[10px] uppercase font-bold tracking-wider">
            <AppBreadcrumb variant={AppBreadcrumbPropsVariantType.Inline} />
          </div>
        )}
        <div className="flex items-center h-7 rounded-full border border-[#333] bg-[#0b0c10] px-3">
          <CommandPaletteTrigger />
        </div>
      </div>
      <div className="shrink-0 flex items-center">
        <ModernMainNav />
      </div>
    </div>
  );
}"""

content = content.replace(old_crumbs, new_crumbs)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
