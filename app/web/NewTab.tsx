"use client";

import { useMemo, useState } from "react";
import {
  buildMomentsPrompt,
  buildTimestampedTranscript,
  Grade,
} from "@/lib/moments";
import {
  CAPTION_PRESETS,
  CaptionPresetId,
  DEFAULT_CAPTION_PRESET,
} from "@/lib/ass";
import { TimecodeRange, ViralityBadge } from "./Timecode";
import { TrimEditor } from "./TrimEditor";

type Word = { word: string; start: number; end: number };
type UploadEntry = { id: string; filename: string; path: string };
type Moment = {
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
};
type ProjectMoment = Moment & { clipFile: string };
type Project = {
  id: string;
  uploadId: string;
  createdAt: string;
  moments: ProjectMoment[];
};

// Until ANTHROPIC_API_KEY is configured, analysis is done manually:
// copy the generated prompt into a Claude conversation and paste the JSON back.
const USE_ANTHROPIC_API = false;

async function pollTranscription(jobId: string): Promise<Word[]> {
  while (true) {
    const response = await fetch(`/api/transcribe/${jobId}`);
    const job = await response.json();

    if (!response.ok) {
      throw new Error(job.error ?? "Failed to check transcription status");
    }

    if (job.status === "done") {
      return job.result.words;
    }

    if (job.status === "error") {
      throw new Error(job.error ?? "Transcription failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function pollYoutubeDownload(
  jobId: string,
): Promise<{ id: string; filename: string }> {
  while (true) {
    const response = await fetch(`/api/upload/youtube/${jobId}`);
    const job = await response.json();

    if (!response.ok) {
      throw new Error(job.error ?? "Failed to check download status");
    }

    if (job.status === "done") {
      return job.result;
    }

    if (job.status === "error") {
      throw new Error(job.error ?? "Download failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function pollProjectJob(jobId: string): Promise<string> {
  while (true) {
    const response = await fetch(`/api/projects/jobs/${jobId}`);
    const job = await response.json();

    if (!response.ok) {
      throw new Error(job.error ?? "Failed to check clip-cutting status");
    }

    if (job.status === "done") {
      return job.result.projectId;
    }

    if (job.status === "error") {
      throw new Error(job.error ?? "Clip cutting failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

export function NewTab() {
  const [status, setStatus] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);
  const [transcript, setTranscript] = useState<Word[] | null>(null);
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [showManualPrompt, setShowManualPrompt] = useState(false);
  const [campaignRules, setCampaignRules] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isCuttingClips, setIsCuttingClips] = useState(false);
  const [captionPreset, setCaptionPreset] = useState<CaptionPresetId>(
    DEFAULT_CAPTION_PRESET,
  );
  const [uploadMode, setUploadMode] = useState<"file" | "youtube" | "storage">(
    "file",
  );
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [existingUploads, setExistingUploads] = useState<UploadEntry[] | null>(
    null,
  );
  const [existingUploadsError, setExistingUploadsError] = useState<
    string | null
  >(null);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);

  function handleUploadModeChange(mode: "file" | "youtube" | "storage") {
    setUploadMode(mode);

    if (mode === "storage" && existingUploads === null) {
      fetch("/api/uploads")
        .then((response) => response.json())
        .then((data) => setExistingUploads(data))
        .catch((err) => setExistingUploadsError((err as Error).message));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTranscript(null);
    setMoments(null);
    setShowManualPrompt(false);
    setPasteInput("");
    setPasteError(null);
    setUploadId(null);
    setProject(null);
    setProjectError(null);

    let uploadResult: { id: string; filename: string };

    if (uploadMode === "file") {
      const form = event.currentTarget;
      const fileInput = form.elements.namedItem("file") as HTMLInputElement;
      const file = fileInput.files?.[0];

      if (!file) {
        setStatus("Choose a file first.");
        return;
      }

      setIsBusy(true);
      setStatus("Uploading video...");

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setStatus(`Upload failed: ${result.error}`);
        setIsBusy(false);
        return;
      }

      uploadResult = result;
    } else if (uploadMode === "storage") {
      const entry = existingUploads?.find(
        (upload) => upload.id === selectedUploadId,
      );

      if (!entry) {
        setStatus("Pick a video from storage first.");
        return;
      }

      setIsBusy(true);
      uploadResult = entry;
    } else {
      if (!youtubeUrl.trim()) {
        setStatus("Paste a YouTube URL first.");
        return;
      }

      setIsBusy(true);
      setStatus("Downloading video from YouTube...");

      const startResponse = await fetch("/api/upload/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      const startResult = await startResponse.json();

      if (!startResponse.ok) {
        setStatus(`Download failed: ${startResult.error}`);
        setIsBusy(false);
        return;
      }

      try {
        uploadResult = await pollYoutubeDownload(startResult.jobId);
      } catch (error) {
        setStatus(`Download failed: ${(error as Error).message}`);
        setIsBusy(false);
        return;
      }
    }

    setUploadId(uploadResult.id);
    setStatus("Upload complete. Starting transcription...");

    const transcribeResponse = await fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId: uploadResult.id }),
    });

    const transcribeResult = await transcribeResponse.json();

    if (!transcribeResponse.ok) {
      setStatus(`Failed to start transcription: ${transcribeResult.error}`);
      setIsBusy(false);
      return;
    }

    setStatus("Transcribing... (this can take a few minutes)");

    let words: Word[];
    try {
      words = await pollTranscription(transcribeResult.jobId);
      setTranscript(words);
    } catch (error) {
      setStatus(`Transcription failed: ${(error as Error).message}`);
      setIsBusy(false);
      return;
    }

    if (!USE_ANTHROPIC_API) {
      setShowManualPrompt(true);
      setStatus(
        "Transcription complete. Add campaign rules if needed, then copy the prompt below into a Claude conversation and paste the JSON response back.",
      );
      setIsBusy(false);
      return;
    }

    setStatus("Transcription complete. Analyzing best moments...");

    try {
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words, campaignRules }),
      });

      const analyzeResult = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(analyzeResult.error ?? "Failed to analyze transcript");
      }

      setMoments(analyzeResult.moments);
      setStatus(
        `Analysis complete. ${analyzeResult.moments.length} suggested moments. Pick a caption style below and cut the clips.`,
      );
    } catch (error) {
      setStatus(
        `Transcription complete, but analysis failed: ${(error as Error).message}`,
      );
    } finally {
      setIsBusy(false);
    }
  }

  const manualPrompt = useMemo(
    () =>
      showManualPrompt && transcript
        ? buildMomentsPrompt(
            buildTimestampedTranscript(transcript),
            campaignRules,
          )
        : null,
    [showManualPrompt, transcript, campaignRules],
  );

  async function handleCopyPrompt() {
    if (!manualPrompt) return;
    await navigator.clipboard.writeText(manualPrompt);
    setStatus("Prompt copied. Paste it into a Claude conversation.");
  }

  async function handleProcessPastedResult() {
    setPasteError(null);
    let parsedMoments: Moment[];

    try {
      const parsed = JSON.parse(pasteInput);
      parsedMoments = Array.isArray(parsed) ? parsed : parsed.moments;

      if (!Array.isArray(parsedMoments)) {
        throw new Error("JSON must have the shape { moments: [...] }");
      }
    } catch (error) {
      setPasteError(`Invalid JSON: ${(error as Error).message}`);
      return;
    }

    setMoments(parsedMoments);
    setStatus(
      `${parsedMoments.length} moments loaded from the pasted response. Pick a caption style below and cut the clips.`,
    );
  }

  async function createProject(
    forUploadId: string,
    momentsToCut: Moment[],
    words: Word[],
  ) {
    setProject(null);
    setProjectError(null);
    setIsCuttingClips(true);
    setStatus(
      `Cutting ${momentsToCut.length} clip${momentsToCut.length === 1 ? "" : "s"}...`,
    );

    try {
      const createResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: forUploadId,
          moments: momentsToCut,
          words,
          captionPreset,
        }),
      });

      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createResult.error ?? "Failed to start cutting clips");
      }

      const projectId = await pollProjectJob(createResult.jobId);

      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      if (!projectResponse.ok) {
        throw new Error(projectData.error ?? "Failed to load project");
      }

      setProject(projectData);
      setStatus(
        `${projectData.moments.length} clips cut and saved to project ${projectId.slice(0, 8)}.`,
      );
    } catch (error) {
      setProjectError((error as Error).message);
      setStatus(`Failed to cut clips: ${(error as Error).message}`);
    } finally {
      setIsCuttingClips(false);
    }
  }

  async function handleCutClips() {
    if (!uploadId || !transcript || !moments) return;
    await createProject(uploadId, moments, transcript);
  }

  function handleTrimChange(
    index: number,
    next: { start: number; end: number },
  ) {
    setMoments((current) =>
      current
        ? current.map((moment, i) =>
            i === index ? { ...moment, ...next } : moment,
          )
        : current,
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <SectionLabel index="01" title="Upload video" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleUploadModeChange("file")}
            className={`rounded-md border px-3 py-1 text-xs transition-colors ${
              uploadMode === "file"
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            File
          </button>
          <button
            type="button"
            onClick={() => handleUploadModeChange("youtube")}
            className={`rounded-md border px-3 py-1 text-xs transition-colors ${
              uploadMode === "youtube"
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            YouTube link
          </button>
          <button
            type="button"
            onClick={() => handleUploadModeChange("storage")}
            className={`rounded-md border px-3 py-1 text-xs transition-colors ${
              uploadMode === "storage"
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            From storage
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
        >
          {uploadMode === "file" ? (
            <input
              key="file-input"
              type="file"
              name="file"
              accept="video/*"
              className="font-mono text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-background file:cursor-pointer cursor-pointer"
            />
          ) : uploadMode === "youtube" ? (
            <input
              key="youtube-input"
              type="url"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted"
            />
          ) : existingUploadsError ? (
            <p className="font-mono text-xs text-rec">
              Failed to load storage: {existingUploadsError}
            </p>
          ) : existingUploads === null ? (
            <p className="font-mono text-xs text-muted">Loading storage...</p>
          ) : existingUploads.length === 0 ? (
            <p className="font-mono text-xs text-muted">
              No videos in storage yet. Upload a file or a YouTube link first.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {existingUploads.map((entry) => {
                const isSelected = selectedUploadId === entry.id;

                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUploadId(entry.id)}
                      className={`flex w-full flex-col gap-2 rounded-md border p-2 text-left transition-colors ${
                        isSelected
                          ? "border-accent bg-accent/10"
                          : "border-border hover:bg-surface-hover"
                      }`}
                    >
                      <video
                        preload="metadata"
                        src={`/api/upload/${entry.id}/file`}
                        className="aspect-video w-full rounded border border-border bg-background object-cover"
                      />
                      <span
                        className="truncate font-mono text-xs text-foreground"
                        title={entry.filename}
                      >
                        {entry.filename}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="submit"
            disabled={isBusy}
            className="self-start rounded-md bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy
              ? "Processing..."
              : uploadMode === "file"
                ? "Upload and transcribe"
                : uploadMode === "youtube"
                  ? "Download and transcribe"
                  : "Use this video and transcribe"}
          </button>
        </form>
        {status && <StatusLine busy={isBusy || isCuttingClips} text={status} />}
      </section>

      {manualPrompt && (
        <section className="flex flex-col gap-3">
          <SectionLabel index="02" title="Manual bridge to Claude" />
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              Campaign rules (optional)
            </span>
            <textarea
              value={campaignRules}
              onChange={(event) => setCampaignRules(event.target.value)}
              rows={3}
              placeholder="e.g. no politics or profanity, keep clips under 45s, always mention the sponsor, avoid clips featuring guest X..."
              className="rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground placeholder:text-muted"
            />
            <p className="-mt-1 font-mono text-[11px] text-muted">
              Applied when picking moments and writing descriptions/hashtags
              below.
            </p>

            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wide text-muted">
                Prompt
              </span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="rounded-md border border-border px-3 py-1 text-xs text-foreground transition-colors hover:bg-surface-hover"
              >
                Copy
              </button>
            </div>
            <textarea
              readOnly
              value={manualPrompt}
              rows={7}
              className="rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground/80"
            />

            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              Response
            </span>
            <textarea
              value={pasteInput}
              onChange={(event) => setPasteInput(event.target.value)}
              rows={5}
              placeholder='{"moments": [...]}'
              className="rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground placeholder:text-muted"
            />
            <button
              type="button"
              onClick={handleProcessPastedResult}
              className="self-start rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-accent/90"
            >
              Process response
            </button>
            {pasteError && <p className="text-xs text-rec">{pasteError}</p>}
          </div>
        </section>
      )}

      {moments && moments.length > 0 && !project && (
        <section className="flex flex-col gap-3">
          <SectionLabel index="03" title="Caption style" />
          <p className="font-mono text-xs text-muted">
            Pick a style now so the preview below shows captions while you
            refine the in/out points.
          </p>
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
            {(Object.keys(CAPTION_PRESETS) as CaptionPresetId[]).map(
              (presetId) => {
                const preset = CAPTION_PRESETS[presetId];
                const isSelected = captionPreset === presetId;

                return (
                  <button
                    key={presetId}
                    type="button"
                    onClick={() => setCaptionPreset(presetId)}
                    className={`flex flex-col gap-1 rounded-md border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-accent bg-accent/10"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {preset.label}
                    </span>
                    <span className="text-xs text-muted">
                      {preset.description}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </section>
      )}

      {moments && moments.length > 0 && !project && uploadId && (
        <section className="flex flex-col gap-3">
          <SectionLabel index="04" title="Refine cut points" />
          <p className="font-mono text-xs text-muted">
            Nudge the in/out points so the hook lands right at the start — the
            AI only sees text, so it can be off by a second or two. Captions
            preview using the style picked above.
          </p>
          <div className="flex flex-col gap-3">
            {moments.map((moment, index) => (
              <TrimEditor
                key={index}
                uploadId={uploadId}
                moment={moment}
                words={transcript ?? []}
                captionPreset={captionPreset}
                onChange={(next) => handleTrimChange(index, next)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleCutClips}
            disabled={isCuttingClips}
            className="self-start rounded-md bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCuttingClips ? "Cutting..." : "Cut clips"}
          </button>
        </section>
      )}

      {moments && moments.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel index="05" title="Suggested moments" />
          {projectError && (
            <p className="text-xs text-rec">
              Failed to cut clips: {projectError}
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {moments.map((moment, index) => {
              const clipUrl = project
                ? `/api/projects/${project.id}/clips/${index}/file`
                : null;

              return (
                <li
                  key={index}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {moment.title}
                      </span>
                      {typeof moment.viralityScore === "number" && (
                        <ViralityBadge score={moment.viralityScore} />
                      )}
                    </span>
                    <TimecodeRange start={moment.start} end={moment.end} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{moment.reason}</p>
                  {moment.description && (
                    <p className="mt-2 text-sm text-foreground/90">
                      {moment.description}
                    </p>
                  )}
                  {moment.hashtags && moment.hashtags.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-accent">
                      {moment.hashtags.join(" ")}
                    </p>
                  )}

                  <div className="mt-3">
                    {clipUrl ? (
                      <video
                        controls
                        src={clipUrl}
                        className="w-full max-w-xs rounded-md border border-border"
                      />
                    ) : isCuttingClips ? (
                      <p className="font-mono text-xs text-muted">
                        Cutting clip...
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-xs text-accent">{index}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h2>
    </div>
  );
}

function StatusLine({ busy, text }: { busy: boolean; text: string }) {
  return (
    <p className="flex items-center gap-2 font-mono text-xs text-muted">
      <span
        className={`h-1.5 w-1.5 rounded-full ${busy ? "rec-dot bg-rec" : "bg-muted"}`}
        aria-hidden
      />
      {text}
    </p>
  );
}
