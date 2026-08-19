// Create rule set from image (Plan 34, step 14, SS-03).
// Uploads an image as a data URL, calls `createRuleset`, then navigates
// into the per-ruleset editor route (step 15). No server; localStorage
// only. 4 MB size guard, image/* mime guard.
import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { Upload, X } from "lucide-react";
import { useProjectStore, selectProject } from "@/lib/projects/store";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const Route = createFileRoute("/projects/$projectId/rulesets/new")({
  component: NewRulesetFromImage,
  errorComponent: NewRulesetError,
  notFoundComponent: NewRulesetNotFound,
});

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") return reject(new Error("Unexpected FileReader result"));
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

function NewRulesetFromImage() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const createRuleset = useProjectStore((s) => s.createRuleset);
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isNonFile = !file;

  useEffect(() => {
    if (isNonFile) {
      setPreview(null);

      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!project) {
    console.warn("[rulesets/new] project not found", { projectId });

    throw notFound();
  }

  function pickFile(f: File | null) {
    setError(null);

    if (!f) {
      setFile(null);

      return;
    }

    if (f.type.startsWith("image/") === false) {
      const msg = `Not an image file (${f.type || "unknown"}).`;
      console.warn("[rulesets/new] rejected file, mime", { name: f.name, type: f.type });
      setError(msg);
      setFile(null);

      return;
    }

    if (f.size > MAX_IMAGE_BYTES) {
      const msg = `Image is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`;
      console.warn("[rulesets/new] rejected file, size", { name: f.name, size: f.size });
      setError(msg);
      setFile(null);

      return;
    }

    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setError("Name is required.");

      return;
    }

    if (!file) {
      setError("Choose a reference image.");

      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const dataUrl = await readAsDataUrl(file);
      const rulesetId = createRuleset(projectId, trimmed, dataUrl);
      console.info("[rulesets/new] created", {
        projectId,
        rulesetId,
        name: trimmed,
        bytes: file.size,
      });
      await navigate({
        to: "/projects/$projectId/rulesets/$rulesetId",
        params: { projectId, rulesetId },
      });
    } catch (err) {
      console.error("[rulesets/new] create failed", err);
      setError(err instanceof Error ? err.message : "Could not create rule set.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-hmi-5">
          <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
            {project.name}
          </p>
          <h1 className="mt-hmi-1 font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
            New rule set
          </h1>
          <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
            Upload a reference image and name the rule set. You will draw rules on this image in the
            editor.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-hmi-4">
          <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
            Name
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Top-mark inspection"
              className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
            />
          </label>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (KeyboardKeyType.isEnterOrSpace(e.key)) {
                e.preventDefault();
                fileInput.current?.click();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0] ?? null;
              pickFile(f);
            }}
            className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-hmi-2 rounded-lg border border-dashed border-ca-border bg-ca-panel p-hmi-5 text-center transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Reference image preview"
                  className="max-h-64 max-w-full rounded-sm border border-ca-border object-contain"
                />
                <p className="text-hmi-caption text-ca-ink-muted">
                  {file?.name}, {file ? (file.size / 1024).toFixed(0) : "0"} KB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pickFile(null);
                  }}
                  className="mt-hmi-1 inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select"
                >
                  <X aria-hidden size={14} />
                  Remove
                </button>
              </>
            ) : (
              <>
                <Upload aria-hidden size={32} className="text-ca-ink-muted" />
                <p className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                  Drop an image or click to choose
                </p>
                <p className="text-hmi-caption text-ca-ink-muted">
                  PNG or JPEG, up to {MAX_IMAGE_BYTES / 1024 / 1024} MB.
                </p>
              </>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pickFile(e.currentTarget.files?.[0] ?? null)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-hmi-caption text-ca-ng">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-hmi-2">
            <Link
              to="/projects/$projectId/rulesets"
              params={{ projectId }}
              className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-ink hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !file || name.trim().length === 0}
              className="rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              {submitting ? "Creating..." : "Create rule set"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewRulesetError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[rulesets/new] error boundary", error);
    reportLovableError(error, { boundary: "projects_$projectId_rulesets_new_error_component" });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        New rule set didn't load
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">{error.message}</p>
      <button
        type="button"
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}

function NewRulesetNotFound() {
  const { projectId } = Route.useParams();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Project not found
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
        No project matches <span className="font-mono">{projectId}</span>.
      </p>
      <Link
        to="/projects"
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        All projects
      </Link>
    </div>
  );
}
