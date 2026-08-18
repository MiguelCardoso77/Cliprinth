import { failure, Result, success } from "../utils/response";
import { Job } from "../utils/jobStore";
import { transcribeService, TranscriptResult } from "./service";

export class TranscribeController {
  private service = transcribeService;

  public handleStart = async (
    body: unknown
  ): Promise<Result<{ jobId: string }>> => {
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).uploadId !== "string"
    ) {
      return failure("uploadId is required", 400);
    }

    const { uploadId } = body as { uploadId: string };
    const jobId = this.service.startJob(uploadId);
    return success({ jobId }, 202);
  };

  public handleStatus = async (
    jobId: string
  ): Promise<Result<Job<TranscriptResult>>> => {
    const job = this.service.getJob(jobId);

    if (!job) {
      return failure("Job not found", 404);
    }

    return success(job);
  };
}
