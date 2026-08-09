import { useState } from "react";
import { Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

type NavLink = { to: string; label: string };

const LINKS: readonly NavLink[] = [
  { to: "/setup", label: "Setup" },
  { to: "/setup/roi", label: "ROI" },
  { to: "/setup/reference", label: "Reference" },
  { to: "/settings/camera", label: "Camera" },
  { to: "/settings/trigger", label: "Trigger" },
  { to: "/settings/lighting", label: "Lighting" },
  { to: "/run", label: "Run" },
  { to: "/results", label: "Results" },
  { to: "/errors", label: "NG" },
] as const;

function renderLink(link: NavLink, onClose: () => void) {
  return (
    <Link
      key={link.to}
      to={link.to}
      onClick={onClose}
      className="block rounded px-3 py-2 text-sm text-ca-chrome-ink/80 hover:bg-ca-panel-2 hover:text-ca-chrome-ink"
    >
      {link.label}
    </Link>
  );
}

/**
 * Plan 63: app-shell sidebar slot. Trigger + Sheet drawer with same link
 * set. CSS-gated via `.app-shell-sidebar-fab` to shell-less routes.
 */
export function AppShellSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell-sidebar-fab" data-testid="app-shell-sidebar">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Open menu"
          aria-expanded={open}
          data-testid="app-shell-sidebar-trigger"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ca-border bg-ca-panel/70 text-ca-chrome-ink/80 hover:bg-ca-panel-2 hover:text-ca-chrome-ink"
        >
          <Menu className="h-4 w-4" aria-hidden />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-ca-panel">
          <SheetHeader>
            <SheetTitle className="text-ca-chrome-ink">Navigate</SheetTitle>
            <SheetDescription className="sr-only">
              Jump to any top-level workflow route.
            </SheetDescription>
          </SheetHeader>
          <nav className="mt-4 flex flex-col gap-1" aria-label="Sidebar navigation">
            {LINKS.map((l) => renderLink(l, () => setOpen(false)))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default AppShellSidebar;
