import { NextResponse } from "next/server";
import { ProjectsController } from "../../controller";

const controller = new ProjectsController();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const result = await controller.handleJobStatus(jobId);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
