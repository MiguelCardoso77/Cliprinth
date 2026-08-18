import { NextResponse } from "next/server";
import { AnalyzeController } from "./controller";

const controller = new AnalyzeController();

export async function POST(request: Request) {
  const body = await request.json();
  const result = await controller.handleAnalyze(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
