import { execFile } from "child_process";
import { promisify } from "util";
import { readdir, rm } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/i;

export function isValidYoutubeUrl(url: string): boolean {
  return YOUTUBE_URL_PATTERN.test(url);
}

// YouTube's higher-quality streams (served via the android_vr client) can
// return a mid-download HTTP 403 depending on the video/session even though
// yt-dlp reports them as available - a known, unresolved yt-dlp issue
// (https://github.com/yt-dlp/yt-dlp/issues/12482). The android client's
// muxed 360p stream doesn't require a PO token and doesn't exhibit this
// failure, so it's used as a guaranteed-to-work fallback.
const PRIMARY_ARGS = [
  "-f",
  "bv*[ext=mp4]+ba[ext=m4a]/mp4/best",
  "--merge-output-format",
  "mp4",
];
const FALLBACK_ARGS = [
  "-f",
  "18/mp4/best",
  "--extractor-args",
  "youtube:player_client=android",
];

// Downloads into destDir (expected to already exist and be empty) and
// returns the resulting file's name. The title-based filename isn't known
// ahead of time, so the directory is read back after the download completes.
export async function downloadYoutubeVideo(
  url: string,
  destDir: string
): Promise<string> {
  const outputArg = [
    "-o",
    path.join(destDir, "%(title).200B.%(ext)s"),
  ];

  try {
    await execFileAsync("yt-dlp", [
      ...PRIMARY_ARGS,
      "--no-playlist",
      ...outputArg,
      url,
    ]);
  } catch (primaryError) {
    // Clear out any partial/leftover files the failed attempt left behind
    // so the fallback's output is the only file in destDir.
    for (const file of await readdir(destDir)) {
      await rm(path.join(destDir, file), { force: true });
    }

    try {
      await execFileAsync("yt-dlp", [
        ...FALLBACK_ARGS,
        "--no-playlist",
        ...outputArg,
        url,
      ]);
    } catch {
      throw primaryError;
    }
  }

  const files = await readdir(destDir);

  if (files.length === 0) {
    throw new Error("yt-dlp did not produce an output file");
  }

  return files[0];
}
