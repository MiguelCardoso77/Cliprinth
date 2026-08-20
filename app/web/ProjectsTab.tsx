"use client";

import { useEffect, useState } from "react";
import { Grade } from "@/lib/moments";
import { ClipCard } from "./ClipCard";

type ProjectMoment = {
  start: number;
  end: number;
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
  viralityScore: number;
  hookGrade: Grade;
  flowGrade: Grade;
  engagementGrade: Grade;
  clipFile: string;
  shortlistId?: string;
};
type Project = {
  id: string;
  uploadId: string;
  createdAt: string;
  moments: ProjectMoment[];
  name?: string;
};

export function ProjectsTab({ active }: { active: boolean }) {
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
          ? current.map((project) =>
              project.id === projectId ? updated : project,
            )
          : current,
      );
    }
  };

  const [pickingKey, setPickingKey] = useState<string | null>(null);

  async function handlePick(projectId: string, momentIndex: number) {
    const key = `${projectId}-${momentIndex}`;
    setPickingKey(key);

    try {
      const response = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, momentIndex }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to pick clip");
      }

      setProjects((current) =>
        current
          ? current.map((project) =>
              project.id !== projectId
                ? project
                : {
                    ...project,
                    moments: project.moments.map((moment, index) =>
                      index === momentIndex
                        ? { ...moment, shortlistId: result.id }
                        : moment,
                    ),
                  },
            )
          : current,
      );
    } catch {
      // The clip stays as-is; the user can retry the pick.
    } finally {
      setPickingKey(null);
    }
  }

  useEffect(() => {
    if (!active) return;
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
  }, [active]);

  const count = projects?.length ?? 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-[30px] font-bold text-foreground">
          Projects
        </h1>
        <span className="font-mono text-[13px] text-muted">
          {count} {count === 1 ? "project" : "projects"}
        </span>
      </div>

      {error && (
        <p className="mt-6 font-mono text-xs text-rec">
          Failed to load projects: {error}
        </p>
      )}

      {!error && !projects && (
        <p className="mt-6 font-mono text-xs text-muted">Loading...</p>
      )}

      {projects && projects.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No projects yet. Upload a video from the{" "}
            <span className="text-foreground">New</span> tab and let Claude
            suggest moments to create one.
          </p>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="mt-[30px] flex flex-col gap-6">
          {projects.map((project) => (
            <section
              key={project.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
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
              <div className="mt-3 flex flex-col gap-3">
                {project.moments.map((moment, index) => {
                  const isPicking = pickingKey === `${project.id}-${index}`;

                  return (
                    <ClipCard
                      key={index}
                      clip={moment}
                      videoSrc={`/api/projects/${project.id}/clips/${index}/file`}
                      picked={Boolean(moment.shortlistId)}
                      isPicking={isPicking}
                      onPick={() => handlePick(project.id, index)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
