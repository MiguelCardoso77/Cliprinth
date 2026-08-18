import { failure, Result, success } from "../utils/response";
import { Job } from "../utils/jobStore";
import { CaptionWord } from "@/lib/ass";
import { ProjectMeta } from "@/lib/storage";
import { CreateProjectResult, MomentInput, projectsService } from "./service";

export class ProjectsController {
  private service = projectsService;

  public handleCreate = async (body: unknown): Promise<Result<{ jobId: string }>> => {
    const parsed = parseCreateBody(body);
    if (!parsed) {
      return failure("uploadId, a non-empty moments array, and a words array are required", 400);
    }

    const jobId = this.service.startCreateJob(parsed.uploadId, parsed.moments, parsed.words);
    return success({ jobId }, 202);
  };

  public handleJobStatus = async (jobId: string): Promise<Result<Job<CreateProjectResult>>> => {
    const job = this.service.getJob(jobId);

    if (!job) {
      return failure("Job not found", 404);
    }

    return success(job);
  };

  public handleList = async (): Promise<Result<ProjectMeta[]>> => {
    const projects = await this.service.listProjects();
    return success(projects);
  };

  public handleGet = async (projectId: string): Promise<Result<ProjectMeta>> => {
    const project = await this.service.getProject(projectId);

    if (!project) {
      return failure("Project not found", 404);
    }

    return success(project);
  };
}

function parseCreateBody(
  body: unknown
): { uploadId: string; moments: MomentInput[]; words: CaptionWord[] } | null {
  if (typeof body !== "object" || body === null) return null;

  const { uploadId, moments, words } = body as Record<string, unknown>;

  if (typeof uploadId !== "string" || !Array.isArray(moments) || moments.length === 0 || !Array.isArray(words)) {
    return null;
  }

  const validMoments = moments.every((moment) => {
    if (typeof moment !== "object" || moment === null) return false;
    const m = moment as Record<string, unknown>;

    return (
      typeof m.start === "number" &&
      typeof m.end === "number" &&
      typeof m.title === "string" &&
      typeof m.reason === "string" &&
      typeof m.description === "string" &&
      Array.isArray(m.hashtags) &&
      m.hashtags.every((tag) => typeof tag === "string")
    );
  });

  if (!validMoments) return null;

  const validWords = words.every((word) => {
    if (typeof word !== "object" || word === null) return false;
    const w = word as Record<string, unknown>;
    return typeof w.word === "string" && typeof w.start === "number" && typeof w.end === "number";
  });

  if (!validWords) return null;

  return { uploadId, moments: moments as MomentInput[], words: words as CaptionWord[] };
}
