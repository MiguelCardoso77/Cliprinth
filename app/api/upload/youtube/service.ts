import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "@/lib/storage";
import { downloadYoutubeVideo } from "@/lib/youtube";
import { JobStore } from "../../utils/jobStore";
import { UploadResult } from "../service";

export class YoutubeUploadService {
  private jobs = new JobStore<UploadResult>();

  public startJob = (url: string): string => {
    const jobId = randomUUID();
    this.jobs.create(jobId);
    void this.runJob(jobId, url);
    return jobId;
  };

  public getJob = (jobId: string) => {
    return this.jobs.get(jobId);
  };

  private runJob = async (jobId: string, url: string) => {
    this.jobs.update(jobId, { status: "processing" });

    try {
      const id = randomUUID();
      const jobDir = path.join(UPLOAD_DIR, id);
      await mkdir(jobDir, { recursive: true });

      const filename = await downloadYoutubeVideo(url, jobDir);
      this.jobs.update(jobId, { status: "done", result: { id, filename } });
    } catch (error) {
      this.jobs.update(jobId, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

// Singleton for the same reason as transcribeService: route.ts and
// [jobId]/route.ts each instantiate their own controller, so the job store
// created by the POST must be shared with the GET status polling.
export const youtubeUploadService = new YoutubeUploadService();
