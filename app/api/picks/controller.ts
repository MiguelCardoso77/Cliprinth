import { failure, Result, success } from "../utils/response";
import { ShortlistEntry } from "@/lib/storage";
import { picksService } from "./service";

export class PicksController {
  private service = picksService;

  public handleList = async (): Promise<Result<ShortlistEntry[]>> => {
    const entries = await this.service.listShortlist();
    return success(entries);
  };

  public handleCreate = async (body: unknown): Promise<Result<ShortlistEntry>> => {
    const parsed = parseCreateBody(body);
    if (!parsed) {
      return failure("projectId and a numeric momentIndex are required", 400);
    }

    try {
      const entry = await this.service.pickClip(parsed.projectId, parsed.momentIndex);
      return success(entry, 201);
    } catch (error) {
      return failure(error instanceof Error ? error.message : "Failed to pick clip", 400);
    }
  };
}

function parseCreateBody(body: unknown): { projectId: string; momentIndex: number } | null {
  if (typeof body !== "object" || body === null) return null;

  const { projectId, momentIndex } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || projectId.trim().length === 0) return null;
  if (typeof momentIndex !== "number" || !Number.isInteger(momentIndex) || momentIndex < 0) return null;

  return { projectId, momentIndex };
}
