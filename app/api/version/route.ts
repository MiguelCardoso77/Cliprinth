import { NextResponse } from "next/server";
import { VersionController } from "./controller";

const controller = new VersionController();

export async function GET() {
  const result = await controller.handleGet();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
