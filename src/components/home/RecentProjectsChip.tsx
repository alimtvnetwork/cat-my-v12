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
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-accent"
      >
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Recent
        <span className="ml-1 text-muted-foreground">({entries.length})</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Recently opened</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {entries.length === 0 ? (
          <DropdownMenuItem disabled>No recent projects yet</DropdownMenuItem>
        ) : (
          entries.map((e) => (
            <DropdownMenuItem key={e.projectId} asChild>
              <Link
                to="/projects/$projectId"
                params={{ projectId: toIntParam(IntAliasNamespaceType.Project, e.projectId) }}
                className="flex flex-col items-start"
              >
                <span className="text-sm">{e.name}</span>
                <span className="text-[10px] text-muted-foreground">
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
