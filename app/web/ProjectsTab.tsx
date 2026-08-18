"use client";

import { useEffect, useState } from "react";
import { TimecodeRange, ViralityBadge } from "./Timecode";

type ProjectMoment = {
  start: number;
  end: number;
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
  viralityScore: number;
  clipFile: string;
};
type Project = {
  id: string;
  uploadId: string;
  createdAt: string;
  moments: ProjectMoment[];
  name?: string;
};

export function ProjectsTab() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const startEditing = (project: Project) => {
    setEditingId(project.id);
    setDraftName(project.name ?? project.id.slice(0, 8));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName("");
  };

  const saveName = async (projectId: string) => {
    const name = draftName.trim();
    cancelEditing();
    if (!name) return;

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (response.ok) {
      const updated = (await response.json()) as Project;
      setProjects((current) =>
        current
          ? current.map((project) => (project.id === projectId ? updated : project))
          : current
      );
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/projects")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="font-mono text-xs text-rec">Failed to load projects: {error}</p>;
  }

  if (!projects) {
    return <p className="font-mono text-xs text-muted">Loading...</p>;
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted">
          No projects yet. Upload a video from the <span className="text-foreground">New</span> tab
          and let Claude suggest moments to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {projects.map((project) => (
        <section key={project.id} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between gap-2">
            {editingId === project.id ? (
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={() => saveName(project.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveName(project.id);
                  if (event.key === "Escape") cancelEditing();
                }}
                className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground outline-none focus:border-accent"
              />
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-accent">
                  {project.name ?? project.id.slice(0, 8)}
                </span>
                <button
                  type="button"
                  aria-label="Rename project"
                  onClick={() => startEditing(project)}
                  className="text-muted hover:text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
                    <path d="M18.375 2.625a1.768 1.768 0 1 1 2.5 2.5L12 14l-4 1 1-4Z" />
                  </svg>
                </button>
              </span>
            )}
            <span className="font-mono text-[10px] text-muted">
              {new Date(project.createdAt).toLocaleString()}
            </span>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.moments.map((moment, index) => (
              <li key={index} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <video
                  controls
                  preload="metadata"
                  src={`/api/projects/${project.id}/clips/${index}/file`}
                  className="aspect-[9/16] w-full max-w-[220px] self-center rounded-md border border-border bg-background object-cover"
                />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{moment.title}</span>
                    {typeof moment.viralityScore === "number" && (
                      <ViralityBadge score={moment.viralityScore} />
                    )}
                  </span>
                  <TimecodeRange start={moment.start} end={moment.end} />
                </div>
                <p className="text-xs text-muted">{moment.reason}</p>
                {moment.description && (
                  <p className="text-xs text-foreground/90">{moment.description}</p>
                )}
                {moment.hashtags && moment.hashtags.length > 0 && (
                  <p className="font-mono text-xs text-accent">{moment.hashtags.join(" ")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
