export type CaptionWord = { word: string; start: number; end: number };

// Groups words into short caption lines (v1: plain burned-in captions, no
// per-word karaoke highlighting yet — see CLAUDE.md step 5 for the fuller
// TikTok-style vision). A line breaks on whichever limit hits first: word
// count or elapsed time, so lines stay readable on a vertical frame.
const CHUNK_MAX_WORDS = 4;
const CHUNK_MAX_SECONDS = 2.5;

// ASS colours are &H<AA><BB><GG><RR> (alpha, then blue/green/red, each hex).
export type CaptionStyle = {
  fontName: string;
  fontSize: number;
  primaryColour: string;
  outlineColour: string;
  backColour: string;
  bold: 0 | 1;
  borderStyle: number;
  outline: number;
  shadow: number;
  alignment: number;
  marginV: number;
};

export const CAPTION_PRESETS = {
  classic: {
    label: "Classic",
    description: "White bold text, black outline — the default TikTok caption look.",
    style: {
      fontName: "Arial Black",
      fontSize: 72,
      primaryColour: "&H00FFFFFF",
      outlineColour: "&H00000000",
      backColour: "&H80000000",
      bold: 1,
      borderStyle: 1,
      outline: 5,
      shadow: 0,
      alignment: 2,
      marginV: 180,
    },
  },
  boldYellow: {
    label: "Bold Yellow",
    description: "High-contrast yellow text with a thick black outline.",
    style: {
      fontName: "Arial Black",
      fontSize: 76,
      primaryColour: "&H0000FFFF",
      outlineColour: "&H00000000",
      backColour: "&H00000000",
      bold: 1,
      borderStyle: 1,
      outline: 6,
      shadow: 2,
      alignment: 2,
      marginV: 180,
    },
  },
  minimalWhite: {
    label: "Minimal White",
    description: "Smaller, thin-outlined white text for a subtler look.",
    style: {
      fontName: "Arial",
      fontSize: 58,
      primaryColour: "&H00FFFFFF",
      outlineColour: "&H00000000",
      backColour: "&H00000000",
      bold: 0,
      borderStyle: 1,
      outline: 2,
      shadow: 0,
      alignment: 2,
      marginV: 140,
    },
  },
  blackBox: {
    label: "Black Box",
    description: "White text on a solid black box, no outline.",
    style: {
      fontName: "Arial Black",
      fontSize: 66,
      primaryColour: "&H00FFFFFF",
      outlineColour: "&H00000000",
      backColour: "&HFF000000",
      bold: 1,
      borderStyle: 3,
      outline: 0,
      shadow: 0,
      alignment: 2,
      marginV: 180,
    },
  },
} as const satisfies Record<string, { label: string; description: string; style: CaptionStyle }>;

export type CaptionPresetId = keyof typeof CAPTION_PRESETS;
export const DEFAULT_CAPTION_PRESET: CaptionPresetId = "classic";

export function isCaptionPresetId(value: unknown): value is CaptionPresetId {
  return typeof value === "string" && value in CAPTION_PRESETS;
}

export function buildAssCaptions(
  words: CaptionWord[],
  presetId: CaptionPresetId = DEFAULT_CAPTION_PRESET
): string {
  const { style } = CAPTION_PRESETS[presetId] ?? CAPTION_PRESETS[DEFAULT_CAPTION_PRESET];

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontName},${style.fontSize},${style.primaryColour},&H000000FF,${style.outlineColour},${style.backColour},${style.bold},0,0,0,100,100,0,0,${style.borderStyle},${style.outline},${style.shadow},${style.alignment},60,60,${style.marginV},1

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
