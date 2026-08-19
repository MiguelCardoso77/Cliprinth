import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Vendored caption fonts (e.g. Montserrat ExtraBold for the "greenPop" preset)
// so burned-in captions render consistently without relying on the host
// having them installed system-wide.
const FONTS_DIR = path.join(process.cwd(), "lib", "fonts");

// v1 reframe: a centered 9:16 crop of the source frame. This assumes a
// single dominant subject roughly centered in the shot — good enough for
// most talking-head footage. Speaker-aware face tracking is a v2 concern
// (see CLAUDE.md step 4) and should not block clips from being mobile-ready
// today.
const VERTICAL_CROP_FILTER = "crop=floor(ih*9/16/2)*2:ih";

export async function cutClip(
  inputPath: string,
  start: number,
  end: number,
  outputPath: string,
  assPath?: string
): Promise<void> {
  const duration = end - start;
  const videoFilter = assPath
    ? `${VERTICAL_CROP_FILTER},ass='${escapeFfmpegFilterPath(assPath)}':fontsdir='${escapeFfmpegFilterPath(FONTS_DIR)}'`
    : VERTICAL_CROP_FILTER;

  await execFileAsync("ffmpeg", [
    "-y",
    "-ss",
    String(start),
    "-i",
    inputPath,
    "-t",
    String(duration),
    "-vf",
    videoFilter,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputPath,
  ]);
}

// ffmpeg's filtergraph parser treats ':' as an option separator and '\' as
// an escape character, which collides with Windows paths (drive-letter
// colon, backslash separators). Forward slashes work fine on Windows, and
// the drive-letter colon needs an explicit escape.
function escapeFfmpegFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:");
}
