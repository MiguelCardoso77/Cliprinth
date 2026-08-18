import { failure, Result, success } from "../utils/response";
import { Job } from "../utils/jobStore";
import { CaptionPresetId, CaptionWord, DEFAULT_CAPTION_PRESET, isCaptionPresetId } from "@/lib/ass";
import { ProjectMeta } from "@/lib/storage";
import { CreateProjectResult, MomentInput, projectsService } from "./service";

export class ProjectsController {
  private service = projectsService;

  public handleCreate = async (body: unknown): Promise<Result<{ jobId: string }>> => {
    const parsed = parseCreateBody(body);
    if (!parsed) {
      return failure(
        "uploadId, a non-empty moments array, a words array, and (optionally) a valid captionPreset are required",
        400
      );
    }

    const jobId = this.service.startCreateJob(
      parsed.uploadId,
      parsed.moments,
      parsed.words,
      parsed.captionPreset
    );
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

  public handleRename = async (projectId: string, body: unknown): Promise<Result<ProjectMeta>> => {
    const name = parseRenameBody(body);
    if (name === null) {
      return failure("A non-empty name is required", 400);
    }

    const project = await this.service.renameProject(projectId, name);

    if (!project) {
      return failure("Project not found", 404);
    }

    return success(project);
  };
}

function parseRenameBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;

  const { name } = body as Record<string, unknown>;
  if (typeof name !== "string") return null;

  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCreateBody(
  body: unknown
): { uploadId: string; moments: MomentInput[]; words: CaptionWord[]; captionPreset: CaptionPresetId } | null {
  if (typeof body !== "object" || body === null) return null;

  const { uploadId, moments, words, captionPreset } = body as Record<string, unknown>;

  if (typeof uploadId !== "string" || !Array.isArray(moments) || moments.length === 0 || !Array.isArray(words)) {
    return null;
  }

  if (captionPreset !== undefined && !isCaptionPresetId(captionPreset)) {
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

  return {
    uploadId,
    moments: moments as MomentInput[],
    words: words as CaptionWord[],
    captionPreset: (captionPreset as CaptionPresetId | undefined) ?? DEFAULT_CAPTION_PRESET,
  };
}
