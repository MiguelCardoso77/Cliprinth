import { NextResponse } from "next/server";
import { ProjectsController } from "../controller";

const controller = new ProjectsController();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const result = await controller.handleGet(projectId);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
