"use client";

import { Grade } from "@/lib/moments";
import { TimecodeRange } from "./Timecode";
import { ScoreButton } from "./ScoreButton";

export type ClipCardData = {
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
  viralityScore: number;
  hookGrade: Grade;
  flowGrade: Grade;
  engagementGrade: Grade;
  start: number;
  end: number;
};

type ClipCardProps = {
  clip: ClipCardData;
  videoSrc: string;
  picked?: boolean;
  isPicking?: boolean;
  onPick?: () => void;
};

export function ClipCard({
  clip,
  videoSrc,
  picked,
  isPicking,
  onPick,
}: ClipCardProps) {
  return (
    <div className="flex gap-4 rounded-md border border-border p-3">
      {picked ? (
        <div className="flex aspect-9/16 w-35 shrink-0 flex-col items-center justify-center gap-1 self-start rounded-md border border-dashed border-pick bg-pick-soft text-center">
          <span className="font-mono text-xs font-semibold text-pick">
            Picked
          </span>
        </div>
      ) : (
        <video
          controls
          preload="metadata"
          src={videoSrc}
          className="aspect-9/16 w-35 shrink-0 self-start rounded-md border border-border bg-background object-cover"
        />
      )}

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="flex items-baseline gap-1.5">
              <span className="text-base font-medium text-foreground">
                {clip.title}
              </span>
              <TimecodeRange start={clip.start} end={clip.end} />
            </span>
            <p className="text-sm text-muted">{clip.reason}</p>
            {clip.description && (
              <p className="text-sm text-foreground/90">{clip.description}</p>
            )}
            {clip.hashtags && clip.hashtags.length > 0 && (
              <p className="font-mono text-sm text-accent">
                {clip.hashtags.join(" ")}
              </p>
            )}
          </div>
          {typeof clip.viralityScore === "number" && (
            <ScoreButton
              score={clip.viralityScore}
              hookGrade={clip.hookGrade}
              flowGrade={clip.flowGrade}
              engagementGrade={clip.engagementGrade}
            />
          )}
        </div>

        {!picked && onPick && (
          <button
            type="button"
            onClick={onPick}
            disabled={isPicking}
            className="mt-1 w-full rounded-md bg-pick py-2 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-pick-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPicking ? "Picking..." : "Pick"}
          </button>
        )}
      </div>
    </div>
  );
}
