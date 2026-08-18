import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { getProject, getProjectClipPath } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; index: string }> }
) {
  const { projectId, index } = await params;

  const project = await getProject(projectId);
  const moment = project?.moments[Number(index)];

  if (!moment) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const filePath = getProjectClipPath(projectId, moment.clipFile);
  const stats = await stat(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stats.size),
    },
  });
}
