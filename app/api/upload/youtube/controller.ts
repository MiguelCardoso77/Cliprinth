import { failure, Result, success } from "@/app/api/utils/response";
import { Job } from "@/app/api/utils/jobStore";
import { isValidYoutubeUrl } from "@/lib/youtube";
import { UploadResult } from "../service";
import { youtubeUploadService } from "./service";

export class YoutubeUploadController {
  private service = youtubeUploadService;

  public handleStart = async (
    body: unknown
  ): Promise<Result<{ jobId: string }>> => {
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).url !== "string"
    ) {
      return failure("url is required", 400);
    }

    const { url } = body as { url: string };

    if (!isValidYoutubeUrl(url)) {
      return failure("Not a valid YouTube URL", 400);
    }

    const jobId = this.service.startJob(url);
    return success({ jobId }, 202);
  };

  public handleStatus = async (
    jobId: string
  ): Promise<Result<Job<UploadResult>>> => {
    const job = this.service.getJob(jobId);

    if (!job) {
      return failure("Job not found", 404);
    }

    return success(job);
  };
}
