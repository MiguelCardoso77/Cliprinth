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
