import { randomUUID } from "crypto";
import { transcribeAudio, WhisperWord } from "@/lib/whisper";
import { findUploadedFile } from "@/lib/storage";
import { JobStore } from "../utils/jobStore";

export type TranscriptResult = { words: WhisperWord[] };

export class TranscribeService {
  private jobs = new JobStore<TranscriptResult>();

  public startJob = (uploadId: string): string => {
    const jobId = randomUUID();
    this.jobs.create(jobId);
    void this.runJob(jobId, uploadId);
    return jobId;
  };

  public getJob = (jobId: string) => {
    return this.jobs.get(jobId);
  };

  private runJob = async (jobId: string, uploadId: string) => {
    this.jobs.update(jobId, { status: "processing" });

    try {
      const videoPath = await findUploadedFile(uploadId);
      const words = await transcribeAudio(videoPath);
      this.jobs.update(jobId, { status: "done", result: { words } });
    } catch (error) {
      this.jobs.update(jobId, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

// Singleton: route.ts and [jobId]/route.ts each instantiate their own
// controller, so the underlying service must be shared for the job store
// created by the POST to be visible to the GET status polling.
export const transcribeService = new TranscribeService();
