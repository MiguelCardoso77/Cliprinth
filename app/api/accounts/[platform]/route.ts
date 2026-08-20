import { NextResponse } from "next/server";
import { AccountsController } from "../controller";

const controller = new AccountsController();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const result = await controller.handleUnlink(platform);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
