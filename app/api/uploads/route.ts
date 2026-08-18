import { NextResponse } from "next/server";
import { UploadsController } from "./controller";

const controller = new UploadsController();

export async function GET() {
  const result = await controller.handleList();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
