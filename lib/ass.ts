export type CaptionWord = { word: string; start: number; end: number };

// Groups words into short caption lines. A line breaks on whichever limit
// hits first: word count or elapsed time, so lines stay readable on a
// vertical frame. Presets may override the word-count limit (see
// CaptionStyle.chunkMaxWords) for tighter, punchier lines.
export const CHUNK_MAX_WORDS = 4;
export const CHUNK_MAX_SECONDS = 2.5;

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
  // Word-count chunking limit for this preset only; falls back to
  // CHUNK_MAX_WORDS when unset so existing presets are unaffected.
  chunkMaxWords?: number;
  // Presence of `highlight` switches this preset into per-word karaoke mode
  // (see buildHighlightEvents): the active word is painted this colour
  // (#RRGGBB) while the rest of the line stays in `primaryColour`.
  highlight?: string;
  // Upper-cases every word before it's written into the .ass Text field.
  uppercase?: boolean;
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
  none: {
    label: "No Captions",
    description: "Skip burned-in captions entirely — just the raw reframed clip.",
    style: null,
  },
  greenPop: {
    label: "Green Pop",
    description: "Word-by-word karaoke highlight, uppercase — the Opus Clip look.",
    style: {
      fontName: "Montserrat ExtraBold",
      fontSize: 76,
      primaryColour: "&H00FFFFFF",
      outlineColour: "&H00000000",
      backColour: "&H00000000",
      bold: 1,
      borderStyle: 1,
      outline: 6,
      shadow: 2,
      alignment: 2,
      marginV: 300,
      chunkMaxWords: 3,
      highlight: "#22FF44",
      uppercase: true,
    },
  },
} as const satisfies Record<string, { label: string; description: string; style: CaptionStyle | null }>;

export type CaptionPresetId = keyof typeof CAPTION_PRESETS;
export const DEFAULT_CAPTION_PRESET: CaptionPresetId = "classic";

export function isCaptionPresetId(value: unknown): value is CaptionPresetId {
  return typeof value === "string" && value in CAPTION_PRESETS;
}

export type Chunk = { words: CaptionWord[]; start: number; end: number };

export function buildAssCaptions(
  words: CaptionWord[],
  presetId: CaptionPresetId = DEFAULT_CAPTION_PRESET
): string {
  const style = CAPTION_PRESETS[presetId].style as CaptionStyle | null;
  if (!style) {
    throw new Error(`buildAssCaptions called with a no-captions preset ("${presetId}")`);
  }

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

  const chunks = buildChunks(words, style.chunkMaxWords ?? CHUNK_MAX_WORDS);

  const events = style.highlight
    ? buildHighlightEvents(chunks, style)
    : buildBlockEvents(chunks, style);

  return header + events.join("\n") + "\n";
}

// Groups words into chunks of at most `maxWords` words, also breaking a
// chunk whenever it would run longer than CHUNK_MAX_SECONDS. Keeps each
// chunk's own word list (not just the joined text) so per-word event
// generation (buildHighlightEvents) has individual timestamps to work with.
export function buildChunks(words: CaptionWord[], maxWords: number): Chunk[] {
  const chunks: Chunk[] = [];
  let current: CaptionWord[] = [];

  const flush = () => {
    if (current.length === 0) return;
    chunks.push({
      words: current,
      start: current[0].start,
      end: current[current.length - 1].end,
    });
    current = [];
  };

  for (const word of words) {
    if (!word.word.trim()) continue;

    if (current.length > 0) {
      const chunkStart = current[0].start;
      const tooManyWords = current.length >= maxWords;
      const tooLong = word.end - chunkStart > CHUNK_MAX_SECONDS;

      if (tooManyWords || tooLong) flush();
    }

    current.push(word);
  }
  flush();

  return chunks;
}

// Current/default behaviour: one Dialogue event per chunk, the whole line
// appears and disappears together.
function buildBlockEvents(chunks: Chunk[], style: CaptionStyle): string[] {
  const events: string[] = [];

  for (const chunk of chunks) {
    const text = escapeAssText(
      chunk.words
        .map((w) => (style.uppercase ? w.word.trim().toUpperCase() : w.word.trim()))
        .join(" ")
        .trim()
    );

    if (text && chunk.end > chunk.start) {
      events.push(`Dialogue: 0,${formatAssTime(chunk.start)},${formatAssTime(chunk.end)},Default,,0,0,0,,${text}`);
    }
  }

  return events;
}

// Word-by-word karaoke highlight: the whole line is shown at every point in
// the chunk's duration, but one Dialogue event per word re-renders the line
// with only that word's colour overridden inline via \c...\r. Deliberately
// NOT using ASS's native \k karaoke tags — those recolour a word and leave
// it recoloured, so by the end of the line every word would be green at
// once. Emitting a fresh event per word boundary is what keeps exactly one
// word highlighted at a time.
function buildHighlightEvents(chunks: Chunk[], style: CaptionStyle): string[] {
  const green = assInlineColour(style.highlight!);
  const events: string[] = [];

  for (const chunk of chunks) {
    const words = chunk.words;

    for (let i = 0; i < words.length; i++) {
      const segStart = words[i].start;
      // Hold the highlight until the next word starts (not until the
      // current word's own `end`) so there's never a frame where the line
      // sits fully un-highlighted between two words. The last word in the
      // chunk holds until the chunk's own end.
      const segEnd = i < words.length - 1 ? words[i + 1].start : chunk.end;
      if (segEnd <= segStart) continue;

      const text = words
        .map((w, j) => {
          const raw = style.uppercase ? w.word.trim().toUpperCase() : w.word.trim();
          const token = escapeAssText(raw);
          // \r resets to the Default style (style.primaryColour) right
          // after the active word, instead of hardcoding white.
          return j === i ? `{\\c${green}}${token}{\\r}` : token;
        })
        .join(" ");

      events.push(`Dialogue: 0,${formatAssTime(segStart)},${formatAssTime(segEnd)},Default,,0,0,0,,${text}`);
    }
  }

  return events;
}

// #RRGGBB -> &HBBGGRR& for inline \c overrides. Inline colour overrides use
// 6 hex digits with no alpha channel, unlike the [V4+ Styles] Style line
// (which is &HAABBGGRR) — so this intentionally does not reuse the same
// format as the CaptionStyle colour fields above.
function assInlineColour(hex: string): string {
  const h = hex.replace("#", "");
  const r = h.slice(0, 2);
  const g = h.slice(2, 4);
  const b = h.slice(4, 6);
  return `&H${b}${g}${r}&`.toUpperCase();
}

// &H<AA><BB><GG><RR> (ASS's [V4+ Styles] colour format) -> a CSS rgba()
// string, for approximating a preset's look in an on-page preview. ASS
// alpha is inverted (00 = opaque, FF = fully transparent).
export function assColourToCss(assColour: string): string {
  const hex = assColour.replace(/^&H/i, "").replace(/&$/, "").padStart(8, "0");
  const aa = hex.slice(-8, -6);
  const bb = hex.slice(-6, -4);
  const gg = hex.slice(-4, -2);
  const rr = hex.slice(-2);

  const alpha = 1 - parseInt(aa, 16) / 255;
  return `rgba(${parseInt(rr, 16)}, ${parseInt(gg, 16)}, ${parseInt(bb, 16)}, ${alpha.toFixed(3)})`;
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
