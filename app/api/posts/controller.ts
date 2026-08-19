import { failure, Result, success } from "../utils/response";
import { PostEntry } from "@/lib/storage";
import { postsService } from "./service";

export class PostsController {
  private service = postsService;

  public handleList = async (): Promise<Result<PostEntry[]>> => {
    const posts = await this.service.listPosts();
    return success(posts);
  };

  public handleCreate = async (body: unknown): Promise<Result<PostEntry>> => {
    const parsed = parseCreateBody(body);
    if (!parsed) {
      return failure("A valid url is required", 400);
    }

    const post = await this.service.addPost(parsed.url);
    return success(post, 201);
  };
}

function parseCreateBody(body: unknown): { url: string } | null {
  if (typeof body !== "object" || body === null) return null;

  const { url } = body as Record<string, unknown>;
  if (typeof url !== "string" || url.trim().length === 0) return null;

  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url: url.trim() };
}
