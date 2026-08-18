"use client";

import { useState } from "react";
import { buildMomentsPrompt, buildTimestampedTranscript } from "@/lib/moments";
import { TimecodeRange } from "./Timecode";

type Word = { word: string; start: number; end: number };
type Moment = {
  start: number;
  end: number;
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
};
type ProjectMoment = Moment & { clipFile: string };
type Project = { id: string; uploadId: string; createdAt: string; moments: ProjectMoment[] };

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
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isCuttingClips, setIsCuttingClips] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTranscript(null);
    setMoments(null);
    setManualPrompt(null);
    setPasteInput("");
    setPasteError(null);
    setUploadId(null);
    setProject(null);
    setProjectError(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
      setStatus("Choose a file first.");
      return;
    }

    setIsBusy(true);

    const formData = new FormData();
    formData.append("file", file);

    setStatus("Uploading video...");

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok) {
      setStatus(`Upload failed: ${uploadResult.error}`);
      setIsBusy(false);
      return;
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
      const prompt = buildMomentsPrompt(buildTimestampedTranscript(words));
      setManualPrompt(prompt);
      setStatus(
        "Transcription complete. Copy the prompt below into a Claude conversation and paste the JSON response back."
      );
      setIsBusy(false);
      return;
    }

    setStatus("Transcription complete. Analyzing best moments...");

    try {
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });

      const analyzeResult = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(analyzeResult.error ?? "Failed to analyze transcript");
      }

      setMoments(analyzeResult.moments);
      setStatus(`Analysis complete. ${analyzeResult.moments.length} suggested moments.`);
      await createProject(uploadResult.id, analyzeResult.moments, words);
    } catch (error) {
      setStatus(`Transcription complete, but analysis failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

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
    setStatus(`${parsedMoments.length} moments loaded from the pasted response.`);

    if (uploadId && transcript) {
      await createProject(uploadId, parsedMoments, transcript);
    }
  }

  async function createProject(forUploadId: string, momentsToCut: Moment[], words: Word[]) {
    setProject(null);
    setProjectError(null);
    setIsCuttingClips(true);
    setStatus(`Cutting ${momentsToCut.length} clip${momentsToCut.length === 1 ? "" : "s"}...`);

    try {
      const createResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: forUploadId, moments: momentsToCut, words }),
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
      setStatus(`${projectData.moments.length} clips cut and saved to project ${projectId.slice(0, 8)}.`);
    } catch (error) {
      setProjectError((error as Error).message);
      setStatus(`Failed to cut clips: ${(error as Error).message}`);
    } finally {
      setIsCuttingClips(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <SectionLabel index="01" title="Upload video" />
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <input
            type="file"
            name="file"
            accept="video/*"
            className="font-mono text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-background file:cursor-pointer cursor-pointer"
          />
          <button
            type="submit"
            disabled={isBusy}
            className="self-start rounded-md bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Processing..." : "Upload and transcribe"}
          </button>
        </form>
        {status && <StatusLine busy={isBusy || isCuttingClips} text={status} />}
      </section>

      {transcript && (
        <section className="flex flex-col gap-3">
          <SectionLabel index="02" title="Transcript" />
          <p className="max-h-56 overflow-y-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-foreground/90">
            {transcript.map((w) => w.word).join(" ")}
          </p>
        </section>
      )}

      {manualPrompt && (
        <section className="flex flex-col gap-3">
          <SectionLabel index="03" title="Manual bridge to Claude" />
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wide text-muted">Prompt</span>
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

            <span className="font-mono text-xs uppercase tracking-wide text-muted">Response</span>
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

      {moments && moments.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel index="04" title="Suggested moments" />
          {projectError && <p className="text-xs text-rec">Failed to cut clips: {projectError}</p>}
          <ul className="flex flex-col gap-3">
            {moments.map((moment, index) => {
              const clipUrl = project ? `/api/projects/${project.id}/clips/${index}/file` : null;

              return (
                <li key={index} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground">{moment.title}</span>
                    <TimecodeRange start={moment.start} end={moment.end} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{moment.reason}</p>
                  {moment.description && (
                    <p className="mt-2 text-sm text-foreground/90">{moment.description}</p>
                  )}
                  {moment.hashtags && moment.hashtags.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-accent">{moment.hashtags.join(" ")}</p>
                  )}

                  <div className="mt-3">
                    {clipUrl ? (
                      <video
                        controls
                        src={clipUrl}
                        className="w-full max-w-xs rounded-md border border-border"
                      />
                    ) : isCuttingClips ? (
                      <p className="font-mono text-xs text-muted">Cutting clip...</p>
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
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h2>
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
