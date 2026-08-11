import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
// Compact address bar for the Titlebar (Plan 83 backlog item 6).
//
// Shows the current pathname as an editable chip. Ctrl+L (or Cmd+L)
// focuses and selects. Enter navigates, Escape reverts. When idle,
// opaque `projects/<id>` and `rulesets/<id>` segments are rewritten
// to friendly `projects/<name-slug>` form so the operator sees a
// meaningful route instead of a UUID. On focus the raw path is
// restored for editing, and on commit any slug segments the user
// leaves in place are translated back to the underlying id.
//
// The decorative leading `/` was removed to avoid rendering `//` when
// combined with the pathname's own leading slash. Lovable-internal
// query params (`__lovable_*`, `e2e`) are stripped from the display
// so preview plumbing never leaks into the visible URL.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { logger } from "@/lib/editor/errors";
import { useProjectStore } from "@/lib/projects/store";
import { composeCleanUrl, sanitizeSearchString } from "@/lib/shell/sanitize-address";
import { toIntParam, resolveIdParam, type IntAliasNamespace } from "@/lib/ids/int-alias";
import { toIntId, fromIntId } from "@/lib/rules/rule-id-alias";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { HtmlTag } from "@/lib/enums/html";

function isNavigablePath(value: string): boolean {
  return value.startsWith("/") && /\s/.test(value) === false;
}

// Segments whose next path token is a user-facing entity id. We rewrite
// those tokens to integer aliases for display and resolve them back on
// commit. `rules` uses the dedicated rule alias table.
const INT_ALIAS_SEG: Record<string, IntAliasNamespace> = {
  projects: IntAliasNamespaceType.Project,
  rulesets: IntAliasNamespaceType.Ruleset,
  categories: IntAliasNamespaceType.Category,
  "trial-run": IntAliasNamespaceType.Run,
};

export function AddressBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rawSearch = useRouterState({ select: (s) => s.location.searchStr });
  // Subscribe so alias assignments on new entities trigger a re-render.
  useProjectStore((s) => s.projects);
  useProjectStore((s) => s.rulesets);

  // Strip a leading "?" and hide Lovable-internal query params.
  const cleanedSearch = useMemo(() => sanitizeSearchString(rawSearch), [rawSearch]);

  const rawPath = composeCleanUrl(pathname, cleanedSearch);

  // Rewrite every id segment to its integer alias for display, e.g.
  // `/projects/<uuid>/rulesets/<uuid>/rules/<uuid>` becomes
  // `/projects/3/rulesets/7/rules/12`. Bookmarks with legacy ids still
  // resolve because commit() converts numeric segments back to real ids.
  const prettyPath = useMemo(() => {
    const segs = pathname.split("/");
    for (let i = 0; i < segs.length - 1; i++) {
      const seg = segs[i];
      const next = segs[i + 1];

      if (!next) continue;

      if (seg === "rules") {
        if (/^\d+$/.test(next) === false) segs[i + 1] = String(toIntId(next));
      } else {
        const ns = INT_ALIAS_SEG[seg];

        if (ns) segs[i + 1] = toIntParam(ns, next);
      }
    }

    return composeCleanUrl(segs.join("/"), cleanedSearch);
  }, [pathname, cleanedSearch]);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<string>(prettyPath);
  const [editing, setEditing] = useState(false);
  const isNonEditing = !editing;

  useEffect(() => {
    if (isNonEditing) setDraft(prettyPath);
  }, [prettyPath, editing]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "l" && e.key !== "L") return;

      if (!(e.ctrlKey || e.metaKey)) return;
      const active = document.activeElement as HTMLElement | null;
      const isEditable =
        active &&
        (active.tagName === HtmlTag.Textarea ||
          (active.tagName === HtmlTag.Input && active !== inputRef.current) ||
          active.isContentEditable);

      if (isEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
      logger.info("I_UI_ADDRESS_BAR_FOCUS", { via: "hotkey" });
    };
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Translate any integer-alias segments the user typed back to their real
  // ids so TanStack Router can match `projects/$projectId` routes. Legacy
  // (non-numeric) ids pass through unchanged so old bookmarks still work.
  const resolveSlugsToIds = (path: string): string => {
    const [p, q] = path.split("?", 2);
    const segs = p.split("/");
    for (let i = 0; i < segs.length - 1; i++) {
      const seg = segs[i];
      const next = segs[i + 1];

      if (!next) continue;

      if (seg === "rules") {
        if (/^\d+$/.test(next)) {
          const real = fromIntId(Number(next));

          if (real) segs[i + 1] = real;
        }
      } else {
        const ns = INT_ALIAS_SEG[seg];

        if (ns) segs[i + 1] = resolveIdParam(ns, next);
      }
    }

    const cleaned = segs.join("/").replace(/\/{2,}/g, "/");
    const cleanedQuery = sanitizeSearchString(q ?? "");

    return composeCleanUrl(cleaned, cleanedQuery);
  };

  const commit = () => {
    const next = draft.trim();

    if (next === prettyPath || next === rawPath) {
      setEditing(false);

      return;
    }

    if (isNavigablePath(next) === false) {
      logger.warn("W_UI_ADDRESS_BAR_INVALID", { value: next });
      setDraft(prettyPath);
      setEditing(false);

      return;
    }

    const resolved = resolveSlugsToIds(next);
    logger.info("I_UI_ADDRESS_BAR_NAVIGATE", { from: rawPath, to: resolved });
    setEditing(false);
    void navigate({ to: resolved as never }).catch((err) => {
      logger.warn("W_UI_ADDRESS_BAR_NAV_FAILED", { to: resolved, err: String(err) });
      setDraft(prettyPath);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (KeyboardKeyType.isEnter(e.key)) {
      e.preventDefault();
      commit();
      inputRef.current?.blur();
    } else if (KeyboardKeyType.isEscape(e.key)) {
      e.preventDefault();
      setDraft(prettyPath);
      setEditing(false);
      inputRef.current?.blur();
    }
  };

  return (
    <label
      className="hmi-focus-ring inline-flex min-w-0 max-w-[42ch] flex-1 items-center gap-hmi-1 rounded-sm border border-ca-border/70 bg-ca-panel/60 px-hmi-2 py-0.5 font-mono text-[12px] tabular-nums text-ca-ink-muted focus-within:border-ca-select focus-within:text-ca-ink"
      data-testid="titlebar-address-bar"
      title="Address bar (Ctrl+L)"
    >
      <input
        ref={inputRef}
        type="text"
        value={editing ? draft : prettyPath}
        aria-label="Current route address"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        onChange={(e) => {
          setDraft(e.target.value);
          setEditing(true);
        }}
        onFocus={(e) => {
          // Show the raw path (with ids) when editing so slug collisions
          // never obscure the real target.
          setDraft(rawPath);
          setEditing(true);
          requestAnimationFrame(() => e.target.select());
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ca-ink-muted"
      />
    </label>
  );
}