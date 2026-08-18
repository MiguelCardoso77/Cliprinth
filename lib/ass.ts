export type CaptionWord = { word: string; start: number; end: number };

// Groups words into short caption lines (v1: plain burned-in captions, no
// per-word karaoke highlighting yet — see CLAUDE.md step 5 for the fuller
// TikTok-style vision). A line breaks on whichever limit hits first: word
// count or elapsed time, so lines stay readable on a vertical frame.
const CHUNK_MAX_WORDS = 4;
const CHUNK_MAX_SECONDS = 2.5;

export function buildAssCaptions(words: CaptionWord[]): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,72,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,5,0,2,60,60,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines: string[] = [];
  let chunk: CaptionWord[] = [];

  const flush = () => {
    if (chunk.length === 0) return;

    const start = chunk[0].start;
    const end = chunk[chunk.length - 1].end;
    const text = escapeAssText(chunk.map((w) => w.word.trim()).join(" ").trim());

    if (text && end > start) {
      lines.push(`Dialogue: 0,${formatAssTime(start)},${formatAssTime(end)},Default,,0,0,0,,${text}`);
    }

    chunk = [];
  };

  for (const word of words) {
    if (!word.word.trim()) continue;

    if (chunk.length > 0) {
      const chunkStart = chunk[0].start;
      const tooManyWords = chunk.length >= CHUNK_MAX_WORDS;
      const tooLong = word.end - chunkStart > CHUNK_MAX_SECONDS;

      if (tooManyWords || tooLong) flush();
    }

    chunk.push(word);
  }
  flush();

  return header + lines.join("\n") + "\n";
}

function formatAssTime(seconds: number): string {
  const totalCentiseconds = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(totalCentiseconds / 360000);
  const minutes = Math.floor((totalCentiseconds % 360000) / 6000);
  const secs = Math.floor((totalCentiseconds % 6000) / 100);
  const centis = totalCentiseconds % 100;

  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${centis
    .toString()
    .padStart(2, "0")}`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}
