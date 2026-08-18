"use client";

import { useEffect, useState } from "react";
import { TimecodeRange } from "./Timecode";

type ProjectMoment = {
  start: number;
  end: number;
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
  clipFile: string;
};
type Project = { id: string; uploadId: string; createdAt: string; moments: ProjectMoment[] };

export function ProjectsTab() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            <span className="font-mono text-xs text-accent">{project.id.slice(0, 8)}</span>
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
                  <span className="text-sm font-medium text-foreground">{moment.title}</span>
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
