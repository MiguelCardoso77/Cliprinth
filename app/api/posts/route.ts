import { NextResponse } from "next/server";
import { PostsController } from "./controller";

const controller = new PostsController();

export async function GET() {
  const result = await controller.handleList();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = await controller.handleCreate(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
