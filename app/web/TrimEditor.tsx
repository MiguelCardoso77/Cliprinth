"use client";

import { useRef, useState } from "react";
import { formatTimecode } from "./Timecode";

type Moment = {
  start: number;
  end: number;
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
};

const NUDGE_STEPS = [0.1, 0.5, 2] as const;

export function TrimEditor({
  uploadId,
  moment,
  onChange,
}: {
  uploadId: string;
  moment: Moment;
  onChange: (next: { start: number; end: number }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const clipDuration = moment.end - moment.start;
  const invalid = clipDuration <= 0;

  function seekTo(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = duration != null ? clamp(time, 0, duration) : time;
  }

  function setStart(nextStart: number) {
    const clamped = duration != null ? clamp(nextStart, 0, duration) : Math.max(0, nextStart);
    onChange({ start: Math.min(clamped, moment.end - 0.1), end: moment.end });
  }

  function setEnd(nextEnd: number) {
    const clamped = duration != null ? clamp(nextEnd, 0, duration) : Math.max(0, nextEnd);
    onChange({ start: moment.start, end: Math.max(clamped, moment.start + 0.1) });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-foreground">{moment.title}</span>
        <span className="font-mono text-xs text-muted">{clipDuration.toFixed(1)}s</span>
      </div>

      <video
        ref={videoRef}
        controls
        preload="metadata"
        src={`/api/upload/${uploadId}/file#t=${Math.max(0, moment.start - 5)}`}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        className="w-full rounded-md border border-border bg-background"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TrimPointControl
          label="In"
          value={moment.start}
          onNudge={(delta) => setStart(moment.start + delta)}
          onSetToPlayhead={() => setStart(videoRef.current?.currentTime ?? moment.start)}
          onSeekToHere={() => seekTo(moment.start)}
        />
        <TrimPointControl
          label="Out"
          value={moment.end}
          onNudge={(delta) => setEnd(moment.end + delta)}
          onSetToPlayhead={() => setEnd(videoRef.current?.currentTime ?? moment.end)}
          onSeekToHere={() => seekTo(moment.end)}
        />
      </div>

      {invalid && <p className="text-xs text-rec">Out must be after In.</p>}
    </div>
  );
}

function TrimPointControl({
  label,
  value,
  onNudge,
  onSetToPlayhead,
  onSeekToHere,
}: {
  label: string;
  value: number;
  onNudge: (delta: number) => void;
  onSetToPlayhead: () => void;
  onSeekToHere: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-muted">{label}</span>
        <button
          type="button"
          onClick={onSeekToHere}
          className="font-mono text-xs text-accent hover:underline"
        >
          {formatTimecode(value)}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {[...NUDGE_STEPS].reverse().map((step) => (
          <button
            key={`neg-${step}`}
            type="button"
            onClick={() => onNudge(-step)}
            className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-foreground hover:bg-surface-hover"
          >
            -{step}s
          </button>
        ))}
        <button
          type="button"
          onClick={onSetToPlayhead}
          className="rounded border border-accent px-2 py-0.5 font-mono text-[10px] text-accent hover:bg-accent/10"
        >
          Set to playhead
        </button>
        {NUDGE_STEPS.map((step) => (
          <button
            key={`pos-${step}`}
            type="button"
            onClick={() => onNudge(step)}
            className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-foreground hover:bg-surface-hover"
          >
            +{step}s
          </button>
        ))}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
