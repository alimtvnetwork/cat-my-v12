import { SectionIdType } from "@/components/nav/SectionTopBar";
// Plan 79 step 23. Category editor route shell.
//
// Categories are rules with `isCategory: true`. Editor differences from
// rules: no conditions surface, no cameraSettingId, and the built-in
// Uncategorized category has read-only name + kind (enforced by the
// facade's RuleSchema superRefine, surfaced here as disabled affordances).
//
// This shell proves the route is wired end-to-end. Full editor (Plan 79
// step 24) will replace the placeholder metadata dl.

import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Lock, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SectionTopBar } from "@/components/nav/SectionTopBar";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import { UNCATEGORIZED_RULE_ID, type RuleId } from "@/lib/rules/model";
import { showToastError } from "@/lib/errors/notify";
import { toIntId } from "@/lib/rules/rule-id-alias";

export const Route = createFileRoute("/setup/categories/$id")({
  staticData: { crumb: "Category editor" },
  head: ({ params }) => ({
    meta: [
      { title: `Edit category, ${params.id}` },
      {
        name: "description",
        content:
          "Edit a category from the shared library. Categories share the rule model but omit conditions and camera bindings.",
      },
    ],
  }),
  component: CategoryEditorRoute,
});

function CategoryEditorRoute() {
  const { id } = Route.useParams();
  const { all, byId, save, remove } = useRulesLibrary();
  const navigate = useNavigate();
  const cat = byId(id as RuleId);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cat && !cat.isCategory) {
      // Wrong surface: bounce to the rule editor.
      void navigate({
        to: "/setup/rules/$id",
        params: { id: String(toIntId(String(cat.id))) },
        replace: true,
      });
    }
  }, [cat, navigate]);

  const isBuiltin = cat?.id === UNCATEGORIZED_RULE_ID;
  const duplicateName = useMemo(() => {
    const trimmed = name.trim().toLowerCase();

    if (!trimmed || !cat) return false;

    return all.some((row) => row.id !== cat.id && row.name.toLowerCase() === trimmed);
  }, [all, cat, name]);
  const isNonCat = !cat;

  useEffect(() => {
    if (isNonCat) return;
    setName(cat.name);
    setNotes(cat.notes ?? "");
  }, [cat]);

  async function saveCategory(): Promise<void> {
    if (!cat || isBuiltin || duplicateName) return;
    const trimmed = name.trim();

    if (!trimmed) return;
    setSaving(true);
    try {
      await save({
        ...cat,
        name: trimmed,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Category saved: ${trimmed}`);
    } catch (err) {
      showToastError("Category save failed.", err, {
        source: "setup.categories",
        method: "save-category",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(): Promise<void> {
    if (!cat || isBuiltin) return;

    if (window.confirm(`Delete category "${cat.name}"? This cannot be undone.`) === false) return;
    try {
      await remove(cat.id);
      toast.success(`Category deleted: ${cat.name}`);
      void navigate({ to: "/setup/categories" });
    } catch (err) {
      showToastError("Category delete failed.", err, {
        source: "setup.categories",
        method: "delete-category",
      });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ca-bg text-ca-ink">
      <SectionTopBar section={SectionIdType.Home} active="setup" />
      <div className="border-b border-ca-border bg-ca-panel px-hmi-4 py-hmi-3">
        <div className="flex items-center gap-hmi-3">
          <Link
            to="/setup/categories"
            preload="intent"
            className="inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:border-ca-select"
          >
            <ChevronLeft size={12} aria-hidden />
            Back
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-hmi-h2 font-semibold">
              {cat ? cat.name : "Category not found"}
            </h1>
            <p className="text-hmi-body text-ca-ink-muted">
              {cat
                ? `Category id: ${String(cat.id)}`
                : `No category with id "${id}" in the library.`}
            </p>
          </div>
          {isBuiltin ? (
            <span
              className="ml-auto inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-[11px] uppercase tracking-wide text-ca-ink-muted"
              title="Built-in category: name and kind cannot change"
            >
              <Lock size={12} aria-hidden />
              Built-in
            </span>
          ) : null}
        </div>
      </div>
      {cat && cat.isCategory ? (
        <div className="flex min-h-0 flex-1 flex-col gap-hmi-3 px-hmi-4 py-hmi-4">
          <section
            aria-labelledby="cat-metadata-heading"
            className="rounded-sm border border-ca-border bg-ca-panel p-hmi-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-hmi-2">
              <h2 id="cat-metadata-heading" className="text-hmi-h3 font-semibold">
                Category details
              </h2>
              <div className="flex items-center gap-hmi-2">
                <button
                  type="button"
                  onClick={() => void saveCategory()}
                  disabled={isBuiltin || saving || duplicateName || name.trim().length === 0}
                  className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="setup-category-save"
                >
                  <Save size={14} aria-hidden />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => void deleteCategory()}
                  disabled={isBuiltin}
                  className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-danger transition-colors hover:border-ca-danger disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="setup-category-delete"
                >
                  <Trash2 size={14} aria-hidden />
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-hmi-3 grid max-w-2xl gap-hmi-3">
              <label className="flex flex-col gap-hmi-1">
                <span className="text-hmi-body text-ca-ink-muted">Name</span>
                <input
                  value={name}
                  disabled={isBuiltin}
                  maxLength={64}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none disabled:opacity-60"
                  data-testid="setup-category-name"
                />
                {duplicateName ? (
                  <span className="text-[12px] text-ca-danger">
                    A row with this name already exists.
                  </span>
                ) : null}
              </label>
              <label className="flex flex-col gap-hmi-1">
                <span className="text-hmi-body text-ca-ink-muted">Notes</span>
                <textarea
                  value={notes}
                  disabled={isBuiltin}
                  maxLength={500}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-28 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none disabled:opacity-60"
                  data-testid="setup-category-notes"
                />
              </label>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-hmi-3 gap-y-hmi-1 text-hmi-body">
                <dt className="text-ca-ink-muted">Kind</dt>
                <dd>Category{isBuiltin ? " (built-in)" : ""}</dd>
                <dt className="text-ca-ink-muted">Applies before</dt>
                <dd className="font-mono text-[13px] tabular-nums">{cat.appliesBefore.length}</dd>
                <dt className="text-ca-ink-muted">Updated</dt>
                <dd className="text-ca-ink-muted">{cat.updatedAt}</dd>
              </dl>
            </div>
          </section>
        </div>
      ) : cat ? null : (
        <div className="flex flex-1 items-center justify-center px-hmi-4 py-hmi-6 text-hmi-body text-ca-ink-muted">
          Category was deleted or the link is stale.
          <Link
            to="/setup/categories"
            preload="intent"
            className="ml-hmi-2 text-ca-select underline"
          >
            Back to Categories
          </Link>
        </div>
      )}
    </div>
  );
}
