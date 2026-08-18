import { readdir, readFile, rm, stat, writeFile } from "fs/promises";
import path from "path";

export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
export const CLIPS_DIR = path.join(process.cwd(), "storage", "clips");

export async function findUploadedFile(id: string): Promise<string> {
  const jobDir = path.join(UPLOAD_DIR, id);
  const files = await readdir(jobDir);

  if (files.length === 0) {
    throw new Error(`No uploaded file found for id ${id}`);
  }

  return path.join(jobDir, files[0]);
}

export type UploadEntry = { id: string; filename: string; path: string; createdAt: string };

export async function listUploads(): Promise<UploadEntry[]> {
  const ids = await readdir(UPLOAD_DIR).catch(() => []);
  const entries: UploadEntry[] = [];

  for (const id of ids) {
    try {
      const filePath = await findUploadedFile(id);
      const stats = await stat(filePath);
      entries.push({
        id,
        filename: path.basename(filePath),
        path: filePath,
        createdAt: stats.birthtime.toISOString(),
      });
    } catch {
      // Skip empty or unreadable upload directories.
    }
  }

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteUpload(id: string): Promise<void> {
  await rm(path.join(UPLOAD_DIR, id), { recursive: true, force: true });
}

// A project is a set of clips cut from a single upload in one pass, based on
// the moments Claude suggested. It lives at storage/clips/<projectId>/,
// holding one <index>.mp4 per moment plus a project.json manifest.
export type ProjectMoment = {
  start: number;
  end: number;
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
  viralityScore: number;
  clipFile: string;
};

export type ProjectMeta = {
  id: string;
  uploadId: string;
  createdAt: string;
  moments: ProjectMoment[];
  name?: string;
};

export function getProjectDir(projectId: string): string {
  return path.join(CLIPS_DIR, projectId);
}

export function getProjectMetaPath(projectId: string): string {
  return path.join(getProjectDir(projectId), "project.json");
}

export function getProjectClipPath(projectId: string, clipFile: string): string {
  return path.join(getProjectDir(projectId), clipFile);
}

export function getProjectCaptionsPath(projectId: string, index: number): string {
  return path.join(getProjectDir(projectId), `${index}.ass`);
}

export async function getProject(projectId: string): Promise<ProjectMeta | null> {
  try {
    const raw = await readFile(getProjectMetaPath(projectId), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function renameProject(projectId: string, name: string): Promise<ProjectMeta | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  const updated: ProjectMeta = { ...project, name };
  await writeFile(getProjectMetaPath(projectId), JSON.stringify(updated, null, 2));
  return updated;
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const ids = await readdir(CLIPS_DIR).catch(() => []);
  const projects: ProjectMeta[] = [];

  for (const id of ids) {
    const project = await getProject(id);
    if (project) projects.push(project);
  }

  return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
