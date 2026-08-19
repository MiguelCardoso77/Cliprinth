import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { getShortlistClipPath, listShortlist } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const entries = await listShortlist();
  const entry = entries.find((e) => e.id === id);

  if (!entry) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const filePath = getShortlistClipPath(entry.clipFile);
  const stats = await stat(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stats.size),
    },
  });
}
