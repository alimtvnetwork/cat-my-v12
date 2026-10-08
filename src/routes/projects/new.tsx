import React, { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { FolderPlus, ChevronLeft } from "lucide-react";
import { useProjectStore } from "@/lib/projects/store";
import { SectionTopBar, SectionIdType } from "@/components/nav/SectionTopBar";

export const Route = createFileRoute("/projects/new")({
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useProjectStore((s) => s.createProject);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      const projectId = createProject(name.trim(), {
        projectCode: code,
        description: description
      });
      await navigate({ to: "/projects/$projectId", params: { projectId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#0b0c10] text-ca-ink font-hmi antialiased">
      <SectionTopBar section={SectionIdType.Project} />

      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-md border border-[#333] bg-[#1a1c23] p-8 shadow-2xl">
          <div className="mb-8 flex items-center gap-4">
            <Link to="/projects" className="text-ca-ink-muted hover:text-ca-primary transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-ca-ink">New Project</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ca-ink-muted">Project Name *</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-sm border border-[#444] bg-[#0b0c10] px-4 py-3 font-mono text-sm text-ca-ink focus:border-ca-primary focus:outline-none"
                placeholder="e.g. SOIC-8 LINE"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ca-ink-muted">Program Code (Optional)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-sm border border-[#444] bg-[#0b0c10] px-4 py-3 font-mono text-sm text-ca-ink focus:border-ca-primary focus:outline-none"
                placeholder="e.g. P-1029"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ca-ink-muted">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-sm border border-[#444] bg-[#0b0c10] px-4 py-3 font-mono text-sm text-ca-ink focus:border-ca-primary focus:outline-none"
                placeholder="Enter details..."
              />
            </div>

            {error && (
              <div className="rounded-sm border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-4">
              <Link
                to="/projects"
                className="flex items-center justify-center rounded-sm border border-[#444] bg-transparent px-6 py-3 text-sm font-bold uppercase tracking-wider text-ca-ink hover:bg-[#333] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex items-center justify-center gap-2 rounded-sm bg-ca-primary px-8 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-ca-primary-hover disabled:opacity-50 transition-colors"
              >
                <FolderPlus size={18} />
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
