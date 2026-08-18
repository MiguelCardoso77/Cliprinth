import { nodewhisper } from "nodejs-whisper";
import { readFile } from "fs/promises";
import path from "path";

export type WhisperWord = { word: string; start: number; end: number };

type WhisperJsonSegment = {
  offsets: { from: number; to: number };
  text: string;
};

type WhisperJson = { transcription: WhisperJsonSegment[] };

export async function transcribeAudio(
  filePath: string,
  modelName = "base.en"
): Promise<WhisperWord[]> {
  await nodewhisper(filePath, {
    modelName,
    whisperOptions: {
      outputInJson: true,
      wordTimestamps: true,
      splitOnWord: true,
      language: "en",
    },
  });

  const jsonPath = getOutputJsonPath(filePath);
  const raw = await readFile(jsonPath, "utf-8");
  const parsed: WhisperJson = JSON.parse(raw);

  return parsed.transcription.map((segment) => ({
    word: segment.text.trim(),
    start: segment.offsets.from / 1000,
    end: segment.offsets.to / 1000,
  }));
}

// nodejs-whisper converts non-WAV input to a sibling .wav file and whisper-cli
// writes its output as <input-file-name>.json, keeping the .wav extension
// in the name (e.g. "video.wav" -> "video.wav.json").
function getOutputJsonPath(filePath: string): string {
  const ext = path.extname(filePath);
  const wavPath =
    ext === ".wav" ? filePath : filePath.slice(0, -ext.length) + ".wav";

  return wavPath + ".json";
}
