import { NextResponse } from "next/server";
import { TranscribeController } from "./controller";

const controller = new TranscribeController();

export async function POST(request: Request) {
  const body = await request.json();
  const result = await controller.handleStart(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
