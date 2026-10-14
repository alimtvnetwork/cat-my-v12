import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
/**
 * Plan 64 step 81: Recent-Projects dropdown chip for Home.
 *
 * Reads `useRecentProjects()` (SDK-facade-backed). Renders
 * as a chip button with a dropdown of up to 10 recently opened projects,
 * each routing to `/projects/$projectId`. Empty state is explicit, never
 * silent, so the user knows why the dropdown is short.
 */
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock } from "lucide-react";
import { useRecentProjects } from "@/lib/stores/recent-projects-store";
import { toIntParam } from "@/lib/ids/int-alias";

export function RecentProjectsChip(): React.JSX.Element | null {
  const entries = useRecentProjects();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Recent projects"
        className="hmi-focus-ring group inline-flex items-center gap-2 rounded-full border border-ca-border/80 bg-ca-panel/85 px-3.5 py-1 text-xs font-semibold text-ca-ink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_8px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-200 hover:border-ca-primary/50 hover:bg-ca-panel-2 hover:text-ca-ink hover:shadow-[0_0_14px_color-mix(in_oklab,var(--ca-primary)_30%,transparent)]"
      >
        <Clock className="h-3.5 w-3.5 text-ca-ink-muted transition-colors group-hover:text-ca-primary" aria-hidden="true" />
        <span>Recent</span>
        <span className="rounded-full border border-ca-border/80 bg-ca-panel/90 px-2 py-[0.5px] font-mono text-[10px] font-bold text-ca-primary shadow-[0_0_8px_color-mix(in_oklab,var(--ca-primary)_20%,transparent)]">
          {entries.length}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl border border-ca-border/80 bg-ca-panel/95 p-1.5 shadow-[0_16px_40px_-4px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        <DropdownMenuLabel className="font-mono text-[11px] font-bold uppercase tracking-wider text-ca-ink-muted px-2.5 py-1.5">Recently opened</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-ca-border/60 my-1" />
        {entries.length === 0 ? (
          <DropdownMenuItem disabled className="text-ca-ink-muted text-xs">No recent projects yet</DropdownMenuItem>
        ) : (
          entries.map((e) => (
            <DropdownMenuItem key={e.projectId} asChild className="rounded-lg px-2.5 py-2 hover:bg-ca-panel-2 hover:text-ca-primary focus:bg-ca-panel-2 focus:text-ca-primary transition-colors cursor-pointer">
              <Link
                to="/projects/$projectId"
                params={{ projectId: toIntParam(IntAliasNamespaceType.Project, e.projectId) }}
                className="flex flex-col items-start gap-0.5"
              >
                <span className="text-xs font-semibold text-ca-ink">{e.name}</span>
                <span className="font-mono text-[10px] text-ca-ink-muted">
                  {new Date(e.openedAt).toLocaleString()}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
