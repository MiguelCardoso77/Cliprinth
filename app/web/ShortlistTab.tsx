"use client";

import { useEffect, useState } from "react";
import { Grade } from "@/lib/moments";
import { TimecodeRange, ViralityBadge } from "./Timecode";

type ShortlistEntry = {
  id: string;
  projectId: string;
  momentIndex: number;
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
};

export function ShortlistTab({ active }: { active: boolean }) {
  const [entries, setEntries] = useState<ShortlistEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    fetch("/api/picks")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  if (error) {
    return (
      <p className="font-mono text-xs text-rec">
        Failed to load shortlist: {error}
      </p>
    );
  }

  if (!entries) {
    return <p className="font-mono text-xs text-muted">Loading...</p>;
  }

  const count = entries.length;

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-[30px] font-bold text-foreground">
          Shortlist
        </h1>
        <span className="font-mono text-[13px] text-muted">
          {count} {count === 1 ? "clip" : "clips"}
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[12.5px] text-muted">
        Clips picked from Projects, moved here for a closer look before you
        discard the rest.
      </p>

      {count === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No picks yet. Hit <span className="text-pick">Pick</span> on a clip
            in the <span className="text-foreground">Projects</span> tab to send
            it here.
          </p>
        </div>
      )}

      {count > 0 && (
        <ul
          className="mt-[30px] grid gap-[22px]"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {entries.map((entry) => (
            <ShortlistCard key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ShortlistCard({ entry }: { entry: ShortlistEntry }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-[180ms] hover:-translate-y-0.5 hover:border-pick/50">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1c20, #0d0e11)" }}
      >
        <video
          controls
          preload="metadata"
          src={`/api/picks/${entry.id}/file`}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-col gap-1.5 p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span
              className="truncate text-[13.5px] font-medium text-foreground"
              title={entry.title}
            >
              {entry.title}
            </span>
            {typeof entry.viralityScore === "number" && (
              <ViralityBadge score={entry.viralityScore} />
            )}
          </span>
          <TimecodeRange start={entry.start} end={entry.end} />
        </div>

        <p className="text-xs text-muted">{entry.reason}</p>
        {entry.description && (
          <p className="text-xs text-foreground/90">{entry.description}</p>
        )}
        {entry.hashtags && entry.hashtags.length > 0 && (
          <p className="truncate font-mono text-xs text-accent">
            {entry.hashtags.join(" ")}
          </p>
        )}
      </div>
    </li>
  );
}
