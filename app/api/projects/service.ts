import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { buildAssCaptions, CaptionWord } from "@/lib/ass";
import { cutClip } from "@/lib/ffmpeg";
import {
  findUploadedFile,
  getProject,
  getProjectCaptionsPath,
  getProjectClipPath,
  getProjectDir,
  getProjectMetaPath,
  listProjects,
  ProjectMeta,
  ProjectMoment,
} from "@/lib/storage";
import { JobStore } from "../utils/jobStore";

export type MomentInput = {
  start: number;
  end: number;
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
};
export type CreateProjectResult = { projectId: string };

export class ProjectsService {
  private jobs = new JobStore<CreateProjectResult>();

  public startCreateJob = (uploadId: string, moments: MomentInput[], words: CaptionWord[]): string => {
    const jobId = randomUUID();
    this.jobs.create(jobId);
    void this.runCreateJob(jobId, uploadId, moments, words);
    return jobId;
  };

  public getJob = (jobId: string) => {
    return this.jobs.get(jobId);
  };

  public listProjects = (): Promise<ProjectMeta[]> => {
    return listProjects();
  };

  public getProject = (projectId: string): Promise<ProjectMeta | null> => {
    return getProject(projectId);
  };

  private runCreateJob = async (
    jobId: string,
    uploadId: string,
    moments: MomentInput[],
    words: CaptionWord[]
  ) => {
    this.jobs.update(jobId, { status: "processing" });

    try {
      const projectId = randomUUID();
      const inputPath = await findUploadedFile(uploadId);
      await mkdir(getProjectDir(projectId), { recursive: true });

      const projectMoments: ProjectMoment[] = [];

      for (let index = 0; index < moments.length; index++) {
        const moment = moments[index];
        const clipFile = `${index}.mp4`;

        const captionsPath = getProjectCaptionsPath(projectId, index);
        const clipWords = wordsForMoment(words, moment.start, moment.end);
        await writeFile(captionsPath, buildAssCaptions(clipWords));

        await cutClip(
          inputPath,
          moment.start,
          moment.end,
          getProjectClipPath(projectId, clipFile),
          captionsPath
        );

        projectMoments.push({ ...moment, clipFile });
      }

      const meta: ProjectMeta = {
        id: projectId,
        uploadId,
        createdAt: new Date().toISOString(),
        moments: projectMoments,
      };

      await writeFile(getProjectMetaPath(projectId), JSON.stringify(meta, null, 2));

      this.jobs.update(jobId, { status: "done", result: { projectId } });
    } catch (error) {
      this.jobs.update(jobId, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

// Keeps only words overlapping the moment's window and shifts their
// timestamps to be relative to the clip's own start (0 = first frame).
function wordsForMoment(words: CaptionWord[], momentStart: number, momentEnd: number): CaptionWord[] {
  const duration = momentEnd - momentStart;

  return words
    .filter((word) => word.end > momentStart && word.start < momentEnd)
    .map((word) => ({
      word: word.word,
      start: Math.max(0, word.start - momentStart),
      end: Math.min(duration, word.end - momentStart),
    }));
}

// Singleton: every route file instantiates its own controller, so the
// underlying service must be shared for the job store created by the POST
// to be visible to the job-status polling route.
export const projectsService = new ProjectsService();
