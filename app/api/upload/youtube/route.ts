import { NextResponse } from "next/server";
import { YoutubeUploadController } from "./controller";

const controller = new YoutubeUploadController();

export async function POST(request: Request) {
  const body = await request.json();
  const result = await controller.handleStart(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
