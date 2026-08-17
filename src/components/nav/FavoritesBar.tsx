// FavoritesBar: user-editable pinned routes shown under the top menu.
// Bigger targets, accent hover glow, and a popover editor to toggle
// which routes appear here. Persistence lives in useFavoritesStore.
import { Link, useRouterState } from "@tanstack/react-router";
import { Pencil, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FAVORITE_CANDIDATES, useFavoritesStore } from "@/lib/stores/favorites-store";

export function FavoritesBar(): React.JSX.Element | null {
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggle = useFavoritesStore((s) => s.toggle);
  const reset = useFavoritesStore((s) => s.reset);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div
      role="navigation"
      aria-label="Favorite pages"
      className="flex h-8 items-center gap-2 bg-ca-panel/25 px-3"
    >
      <Star size={12} className="text-ca-primary" aria-hidden />
      <span className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-ca-ink-muted">
        Favorites
      </span>
      <div className="ml-1 flex flex-wrap items-center gap-1">
        {favorites.length === 0 ? (
          <span className="text-[0.72rem] text-ca-ink-muted">
            No favorites yet. Click Edit to pin pages.
          </span>
        ) : (
          favorites.map((fav) => {
            const active = pathname === fav.to;

            return (
              <Link
                key={fav.to}
                to={fav.to as never}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[0.72rem] font-medium transition-colors ${
                  active
                    ? "border-ca-primary/60 bg-ca-primary/25 text-ca-ink"
                    : "border-ca-border/70 bg-ca-panel/60 text-ca-ink/80 hover:border-ca-primary/40 hover:bg-ca-panel-2 hover:text-ca-ink"
                }`}
              >
                {fav.label}
              </Link>
            );
          })
        )}
      </div>
      <div className="ml-auto">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 rounded-full border-ca-border/70 bg-ca-panel/60 px-2.5 text-[0.7rem] text-ca-ink/80 hover:border-ca-primary/50 hover:text-ca-primary"
            >
              <Pencil size={11} aria-hidden />
              Edit
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-72 border-ca-border bg-ca-panel p-2 text-ca-ink shadow-hmi-panel"
          >
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <span className="text-[0.7rem] uppercase tracking-widest text-ca-ink-muted">
                Pin pages
              </span>
              <button
                type="button"
                onClick={reset}
                className="text-[0.75rem] text-ca-ink-muted hover:text-ca-primary"
              >
                Reset
              </button>
            </div>
            <ul className="max-h-72 space-y-0.5 overflow-y-auto">
              {FAVORITE_CANDIDATES.map((entry) => {
                const checked = favorites.some((f) => f.to === entry.to);

                return (
                  <li key={entry.to}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-[0.9rem] hover:bg-ca-panel-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(entry)}
                        aria-label={`Toggle favorite ${entry.label}`}
                      />
                      <span className="flex-1">{entry.label}</span>
                      <span className="text-[0.7rem] text-ca-ink-muted">{entry.to}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
