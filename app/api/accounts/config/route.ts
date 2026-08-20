import { NextResponse } from "next/server";
import { AccountsController } from "../controller";

const controller = new AccountsController();

export async function GET() {
  const result = await controller.handleConfig();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
