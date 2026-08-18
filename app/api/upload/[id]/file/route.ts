import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";
import { findUploadedFile } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let filePath: string;
  try {
    filePath = await findUploadedFile(id);
  } catch {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  const stats = await stat(filePath);
  const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

  // <video> scrubbing needs Range support — without it the browser must
  // download the entire (possibly hour-long) source file before it can seek.
  const range = request.headers.get("range");

  if (!range) {
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        "Accept-Ranges": "bytes",
      },
    });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stats.size}` } });
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : stats.size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= stats.size) {
    return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stats.size}` } });
  }

  const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;

  return new NextResponse(stream, {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${stats.size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
