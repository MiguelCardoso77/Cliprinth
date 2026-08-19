"use client";

import { useMemo, useRef, useState } from "react";
import {
  assColourToCss,
  buildChunks,
  CAPTION_PRESETS,
  CaptionPresetId,
  CaptionStyle,
  CaptionWord,
  CHUNK_MAX_WORDS,
} from "@/lib/ass";
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
  words,
  captionPreset,
  onChange,
}: {
  uploadId: string;
  moment: Moment;
  words: CaptionWord[];
  captionPreset: CaptionPresetId;
  onChange: (next: { start: number; end: number }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null);
  const hasSeekedInitially = useRef(false);

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

  function handleLoadedMetadata(event: React.SyntheticEvent<HTMLVideoElement>) {
    setDuration(event.currentTarget.duration);
    setVideoSize({
      width: event.currentTarget.videoWidth,
      height: event.currentTarget.videoHeight,
    });

    // Only jump to the clip's neighbourhood the first time the video is
    // ready — re-seeking on every metadata reload would fight the user's
    // own scrubbing/playback.
    if (!hasSeekedInitially.current) {
      hasSeekedInitially.current = true;
      event.currentTarget.currentTime = Math.max(0, moment.start - 5);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-foreground">{moment.title}</span>
        <span className="font-mono text-xs text-muted">{clipDuration.toFixed(1)}s</span>
      </div>

      <div className="relative overflow-hidden rounded-md border border-border bg-background">
        <video
          ref={videoRef}
          controls
          preload="metadata"
          src={`/api/upload/${uploadId}/file`}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          className="w-full"
        />
        <CropOverlay videoSize={videoSize} />
        <CaptionPreview
          words={words}
          moment={moment}
          captionPreset={captionPreset}
          currentTime={currentTime}
          videoSize={videoSize}
        />
      </div>

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

type VideoSize = { width: number; height: number };

// How much of the source frame's width, on each side, falls outside the
// pipeline's 9:16 centre-crop (see VERTICAL_CROP_FILTER in lib/ffmpeg.ts:
// full height kept, width narrowed to height*9/16, centred). Shared by the
// dark side overlay and the caption preview, which both need to know where
// the surviving vertical frame actually sits.
function cropSidePercent(videoSize: VideoSize | null): number {
  if (!videoSize || videoSize.width <= 0 || videoSize.height <= 0) return 0;

  const cropWidthRatio = ((9 / 16) * videoSize.height) / videoSize.width;
  return clamp(((1 - cropWidthRatio) / 2) * 100, 0, 50);
}

function CropOverlay({ videoSize }: { videoSize: VideoSize | null }) {
  const sidePercent = cropSidePercent(videoSize);
  if (sidePercent <= 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-y-0 left-0 border-r border-white/10 bg-black/65"
        style={{ width: `${sidePercent}%` }}
      />
      <div
        className="absolute inset-y-0 right-0 border-l border-white/10 bg-black/65"
        style={{ width: `${sidePercent}%` }}
      />
    </div>
  );
}

// Approximates how the chosen caption preset will look once burned in —
// same chunking logic as the real .ass export (buildChunks), rendered as a
// CSS overlay instead of ASS markup. It's a preview, not a pixel-accurate
// match: the final burn-in happens on the 9:16 reframed clip, while this
// sits over the original 16:9 source.
function CaptionPreview({
  words,
  moment,
  captionPreset,
  currentTime,
  videoSize,
}: {
  words: CaptionWord[];
  moment: Moment;
  captionPreset: CaptionPresetId;
  currentTime: number;
  videoSize: VideoSize | null;
}) {
  const style = CAPTION_PRESETS[captionPreset].style as CaptionStyle | null;

  // useMemo must run on every render regardless of `style` (rules of
  // hooks) — the "no captions" preset just resolves to an empty list, so
  // there's never an active chunk to render below.
  const chunks = useMemo(() => {
    if (!style) return [];
    const momentWords = words.filter((w) => w.end > moment.start && w.start < moment.end);
    return buildChunks(momentWords, style.chunkMaxWords ?? CHUNK_MAX_WORDS);
  }, [words, moment.start, moment.end, style]);

  if (!style) return null;

  const activeChunk = chunks.find((chunk) => currentTime >= chunk.start && currentTime < chunk.end);
  if (!activeChunk) return null;

  const textColour = assColourToCss(style.primaryColour);
  const outlineColour = assColourToCss(style.outlineColour);
  const isBoxed = style.borderStyle === 3;

  // The .ass export sizes everything against a PlayResX of 1080, and that
  // script resolution maps onto the FINAL (already-cropped) frame — not the
  // full 16:9 source shown here. So the text has to be sized and confined to
  // the live 9:16 strip in the middle of the preview, not the whole video:
  // container query units (cqw) make that automatic, sizing relative to the
  // safe-area div's own width instead of the video's/viewport's.
  const sidePercent = cropSidePercent(videoSize);
  const marginXPercent = (60 / 1080) * 100; // ASS Style MarginL/MarginR

  return (
    <div
      className="pointer-events-none absolute inset-y-0"
      style={{ left: `${sidePercent}%`, right: `${sidePercent}%`, containerType: "inline-size" }}
    >
      <div
        className="flex h-full flex-col items-center justify-end"
        style={{
          paddingBottom: `${clamp((style.marginV / 1920) * 100, 4, 42)}%`,
          paddingLeft: `${marginXPercent}cqw`,
          paddingRight: `${marginXPercent}cqw`,
        }}
      >
        <p
          className="max-w-full text-center leading-tight"
          style={{
            fontFamily: `"${style.fontName}", Arial, sans-serif`,
            fontWeight: style.bold ? 800 : 500,
            fontSize: `${(style.fontSize / 1080) * 100}cqw`,
            color: textColour,
            textShadow: isBoxed
              ? undefined
              : `0 0 ${(style.outline / 1080) * 100}cqw ${outlineColour}, 0 0 ${(style.outline / 1080) * 100}cqw ${outlineColour}`,
            background: isBoxed ? assColourToCss(style.backColour) : undefined,
            padding: isBoxed ? "0.15em 0.4em" : undefined,
            borderRadius: isBoxed ? 4 : undefined,
          }}
        >
          {activeChunk.words.map((word, index) => {
            const isLast = index === activeChunk.words.length - 1;
            const segStart = word.start;
            const segEnd = isLast ? activeChunk.end : activeChunk.words[index + 1].start;
            const isActiveWord =
              !!style.highlight && currentTime >= segStart && currentTime < segEnd;

            const text = style.uppercase ? word.word.trim().toUpperCase() : word.word.trim();

            return (
              <span key={index} style={isActiveWord ? { color: style.highlight } : undefined}>
                {text}
                {!isLast && " "}
              </span>
            );
          })}
        </p>
      </div>
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
