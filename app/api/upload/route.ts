import { NextResponse } from "next/server";
import { UploadController } from "./controller";

const controller = new UploadController();

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await controller.handleUpload(formData);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
