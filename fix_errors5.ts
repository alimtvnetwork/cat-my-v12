import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (path: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p, callback);
        else callback(p);
    });
}

const enumImports: Record<string, string> = {
    'EmptyStateActionVariantType': '@/components/common/EmptyState',
    'RuleCreateDialogInitialKindType': '@/components/rules/RuleCreateDialog',
    'RuleCreateDialogKindModeType': '@/components/rules/RuleCreateDialog',
    'TriggerTimingDiagramPropsEdgeType': '@/components/settings/TriggerTimingDiagram',
    'ApplyThemeClassResolvedType': '@/components/theme/ThemeController',
    'RuleKindBadgePropsSizeType': '@/components/rules/RuleKindBadge'
};

walk('src', (p) => {
    if (!p.endsWith('.tsx') && !p.endsWith('.ts')) return;
    let content = fs.readFileSync(p, 'utf-8');
    let original = content;

    content = content.replace(/variant:\s*["']secondary["']/g, 'variant: EmptyStateActionVariantType.Secondary');
    content = content.replace(/variant:\s*["']primary["']/g, 'variant: EmptyStateActionVariantType.Primary');
    content = content.replace(/variant=\s*["']secondary["']/g, 'variant={EmptyStateActionVariantType.Secondary}');
    content = content.replace(/variant=\s*["']primary["']/g, 'variant={EmptyStateActionVariantType.Primary}');
    
    content = content.replace(/initialKind=\s*["']Rule["']/g, 'initialKind={RuleCreateDialogInitialKindType.Rule}');
    content = content.replace(/initialKind=\s*["']Category["']/g, 'initialKind={RuleCreateDialogInitialKindType.Category}');
    
    content = content.replace(/kindMode=\s*["']rule["']/g, 'kindMode={RuleCreateDialogKindModeType.Rule}');
    content = content.replace(/kindMode=\s*["']category["']/g, 'kindMode={RuleCreateDialogKindModeType.Category}');

    if (p.includes('RuleKindBadge')) {
        content = content.replace(/size=\s*["']md["']/g, 'size={RuleKindBadgePropsSizeType.Md}');
    }

    if (p.includes('ThemeController')) {
        content = content.replace(/\("dark"\)/g, '(ApplyThemeClassResolvedType.Dark)');
        content = content.replace(/\("light"\)/g, '(ApplyThemeClassResolvedType.Light)');
    }

    if (p.includes('settings.trigger')) {
        content = content.replace(/TriggerEdgeType/g, 'TriggerTimingDiagramPropsEdgeType');
    }

    if (p.includes('sidebar.tsx')) {
        content = content.replace(/state === "collapsed"/g, 'state === SidebarContextPropsStateType.Collapsed');
        content = content.replace(/state === "expanded"/g, 'state === SidebarContextPropsStateType.Expanded');
        content = content.replace(/side === "left"/g, 'side === SidebarSideType.Left');
        content = content.replace(/side === "right"/g, 'side === SidebarSideType.Right');
    }

    if (p.includes('carousel.tsx')) {
        content = content.replace(/orientation === "horizontal"/g, 'orientation === CarouselPropsOrientationType.Horizontal');
        content = content.replace(/orientation:\s*"horizontal"/g, 'orientation: CarouselPropsOrientationType.Horizontal');
    }

    if (content !== original) {
        // Add imports
        for (const [e, m] of Object.entries(enumImports)) {
            if (content.includes(e) && !content.includes(`import { ${e}`)) {
                content = `import { ${e} } from "${m}";\n` + content;
            }
        }
        fs.writeFileSync(p, content);
    }
});
