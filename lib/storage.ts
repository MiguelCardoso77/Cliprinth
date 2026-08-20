import { randomUUID } from "crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "fs/promises";
import path from "path";
import { Grade } from "./moments";

export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
export const CLIPS_DIR = path.join(process.cwd(), "storage", "clips");
export const POSTS_FILE = path.join(process.cwd(), "storage", "posts.json");
export const SHORTLIST_DIR = path.join(process.cwd(), "storage", "shortlist");
export const SHORTLIST_FILE = path.join(
  process.cwd(),
  "storage",
  "shortlist.json",
);

export async function findUploadedFile(id: string): Promise<string> {
  const jobDir = path.join(UPLOAD_DIR, id);
  const files = await readdir(jobDir);

  if (files.length === 0) {
    throw new Error(`No uploaded file found for id ${id}`);
  }

  return path.join(jobDir, files[0]);
}

export type UploadEntry = {
  id: string;
  filename: string;
  path: string;
  createdAt: string;
};

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
  hookGrade: Grade;
  flowGrade: Grade;
  engagementGrade: Grade;
  clipFile: string;
  // Set once this clip has been picked for the shortlist — its file has been
  // moved out of the project directory to SHORTLIST_DIR, so the project's own
  // clip file route no longer has anything to serve for it.
  shortlistId?: string;
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

export function getProjectClipPath(
  projectId: string,
  clipFile: string,
): string {
  return path.join(getProjectDir(projectId), clipFile);
}

export function getProjectCaptionsPath(
  projectId: string,
  index: number,
): string {
  return path.join(getProjectDir(projectId), `${index}.ass`);
}

export async function getProject(
  projectId: string,
): Promise<ProjectMeta | null> {
  try {
    const raw = await readFile(getProjectMetaPath(projectId), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function renameProject(
  projectId: string,
  name: string,
): Promise<ProjectMeta | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  const updated: ProjectMeta = { ...project, name };
  await writeFile(
    getProjectMetaPath(projectId),
    JSON.stringify(updated, null, 2),
  );
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

// A post is a link to a video already published on an external platform
// (YouTube, TikTok, Instagram), whether Cliprinth published it via a linked
// account (see lib/accounts.ts) or the user posted it by hand — this just
// tracks and embeds it for a single at-a-glance view. Stored as one JSON
// array since the list is small and doesn't need per-entry files like
// uploads/projects.
export type PostEntry = { id: string; url: string };

// Stored oldest-first (append-only); readPosts/listPosts reverse it so
// callers always see newest-first without the file itself needing reordering.
async function readPosts(): Promise<PostEntry[]> {
  try {
    const raw = await readFile(POSTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writePosts(posts: PostEntry[]): Promise<void> {
  await mkdir(path.dirname(POSTS_FILE), { recursive: true });
  await writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
}

export async function listPosts(): Promise<PostEntry[]> {
  const posts = await readPosts();
  return [...posts].reverse();
}

export async function addPost(url: string): Promise<PostEntry> {
  const posts = await readPosts();
  const entry: PostEntry = { id: randomUUID(), url };
  await writePosts([...posts, entry]);
  return entry;
}

// A shortlisted clip is a project moment the user picked for closer review.
// Picking physically moves the clip's mp4 out of the project directory into
// SHORTLIST_DIR, so it survives independently of what happens to the rest of
// the project's (unpicked) clips later.
export type ShortlistEntry = {
  id: string;
  projectId: string;
  momentIndex: number;
  start: number;
  end: number;
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
  viralityScore: number;
  hookGrade: Grade;
  flowGrade: Grade;
  engagementGrade: Grade;
  clipFile: string;
};

async function readShortlist(): Promise<ShortlistEntry[]> {
  try {
    const raw = await readFile(SHORTLIST_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeShortlist(entries: ShortlistEntry[]): Promise<void> {
  await mkdir(path.dirname(SHORTLIST_FILE), { recursive: true });
  await writeFile(SHORTLIST_FILE, JSON.stringify(entries, null, 2));
}

export async function listShortlist(): Promise<ShortlistEntry[]> {
  const entries = await readShortlist();
  return [...entries].reverse();
}

export function getShortlistClipPath(clipFile: string): string {
  return path.join(SHORTLIST_DIR, clipFile);
}

export async function pickClip(
  projectId: string,
  momentIndex: number,
): Promise<ShortlistEntry> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const moment = project.moments[momentIndex];
  if (!moment)
    throw new Error(`Moment not found: ${projectId}[${momentIndex}]`);
  if (moment.shortlistId) throw new Error("Clip already picked");

  const id = randomUUID();
  const clipFile = `${id}.mp4`;

  await mkdir(SHORTLIST_DIR, { recursive: true });
  await rename(
    getProjectClipPath(projectId, moment.clipFile),
    getShortlistClipPath(clipFile),
  );

  const entry: ShortlistEntry = {
    id,
    projectId,
    momentIndex,
    start: moment.start,
    end: moment.end,
    title: moment.title,
    reason: moment.reason,
    description: moment.description,
    hashtags: moment.hashtags,
    viralityScore: moment.viralityScore,
    hookGrade: moment.hookGrade,
    flowGrade: moment.flowGrade,
    engagementGrade: moment.engagementGrade,
    clipFile,
  };

  const entries = await readShortlist();
  await writeShortlist([...entries, entry]);

  const updatedMoments = project.moments.map((m, i) =>
    i === momentIndex ? { ...m, shortlistId: id } : m,
  );
  await writeFile(
    getProjectMetaPath(projectId),
    JSON.stringify({ ...project, moments: updatedMoments }, null, 2),
  );

  return entry;
}
