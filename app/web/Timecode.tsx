export function formatTimecode(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes.toString().padStart(2, "0")}:${secs}`;
}

export function TimecodeRange({ start, end }: { start: number; end: number }) {
  return (
    <span className="whitespace-nowrap font-mono text-xs text-accent">
      <span className="text-muted">▸</span> {formatTimecode(start)}
      <span className="text-muted"> — </span>
      {formatTimecode(end)} <span className="text-muted">◂</span>
    </span>
  );
}

// Five-band red -> green gradient for 0-99, plus a distinct light "diamond"
// blue reserved for a perfect 100.
const VIRALITY_BANDS = [
  { max: 19, color: "#ff4d4d" },
  { max: 39, color: "#ff9142" },
  { max: 59, color: "#ffd93d" },
  { max: 79, color: "#a3e635" },
  { max: 99, color: "#22c55e" },
] as const;
const DIAMOND_COLOR = "#7dd3fc";

export function ViralityBadge({ score }: { score: number }) {
  const isDiamond = score >= 100;
  const color = isDiamond
    ? DIAMOND_COLOR
    : (VIRALITY_BANDS.find((band) => score <= band.max) ?? VIRALITY_BANDS[VIRALITY_BANDS.length - 1])
        .color;

  return (
    <span
      title="Virality score"
      style={{
        borderColor: `${color}66`,
        backgroundColor: `${color}1a`,
        color,
        boxShadow: isDiamond ? `0 0 6px 0 ${color}80` : undefined,
      }}
      className="rounded-full border px-1.5 py-0.5 font-mono text-[10px] leading-none"
    >
      {score}
    </span>
  );
}
