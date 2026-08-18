"use client";

import { useEffect, useState } from "react";
import { IconCopy, IconTrash, IconUpload } from "./icons";

type UploadEntry = { id: string; filename: string; path: string; createdAt: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function StorageTab() {
  const [uploads, setUploads] = useState<UploadEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UploadEntry | null>(null);

  function loadUploads() {
    fetch("/api/uploads")
      .then((response) => response.json())
      .then((data) => setUploads(data))
      .catch((err) => setError((err as Error).message));
  }

  useEffect(() => {
    loadUploads();
  }, []);

  async function uploadFiles(files: File[]) {
    const videoFiles = files.filter((file) => file.type === "video/mp4");
    if (videoFiles.length === 0) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      for (const file of videoFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Upload failed");
        }
      }

      loadUploads();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    uploadFiles(files);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragOver(false);
    uploadFiles(Array.from(event.dataTransfer.files));
  }

  async function handleDelete(id: string) {
    setPendingDelete(null);
    setUploads((current) => (current ? current.filter((entry) => entry.id !== id) : current));
    await fetch(`/api/upload/${id}`, { method: "DELETE" }).catch(() => {
      loadUploads();
    });
  }

  const count = uploads?.length ?? 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-[30px] font-bold text-foreground">Storage</h1>
        <span className="font-mono text-[13px] text-muted">
          {count} {count === 1 ? "video" : "videos"}
        </span>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className="mt-6 flex cursor-pointer flex-col items-center gap-3 rounded-[18px] border-[1.5px] border-dashed p-11 text-center transition-all duration-[180ms]"
        style={{
          borderColor: isDragOver ? "rgba(255, 90, 51, 0.7)" : "rgba(255, 255, 255, 0.14)",
          background: isDragOver ? "rgba(255, 90, 51, 0.07)" : "var(--bg-dropzone)",
        }}
      >
        <input
          type="file"
          accept="video/mp4"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <IconUpload className="h-6 w-6" />
        </span>
        <span className="text-[15px] font-medium text-foreground">
          {isDragOver ? "Drop to upload" : "Add videos"}
        </span>
        {!isDragOver && (
          <span className="font-mono text-[12.5px] text-muted">
            Drag videos here or <span className="text-accent">browse files</span>
          </span>
        )}
      </label>

      {isUploading && (
        <p className="mt-3 font-mono text-xs text-muted">Uploading...</p>
      )}
      {uploadError && (
        <p className="mt-3 font-mono text-xs text-rec">Upload failed: {uploadError}</p>
      )}

      {error && <p className="mt-6 font-mono text-xs text-rec">Failed to load storage: {error}</p>}

      {uploads && uploads.length > 0 && (
        <ul
          className="mt-[30px] grid gap-[22px]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
        >
          {uploads.map((entry) => (
            <VideoCard key={entry.id} entry={entry} onDelete={() => setPendingDelete(entry)} />
          ))}
        </ul>
      )}

      {pendingDelete && (
        <DeleteConfirmModal
          entry={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDelete(pendingDelete.id)}
        />
      )}
    </div>
  );
}

function DeleteConfirmModal({
  entry,
  onCancel,
  onConfirm,
}: {
  entry: UploadEntry;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10, 11, 13, 0.7)" }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5"
      >
        <p className="text-[15px] font-medium text-foreground">Delete video?</p>
        <p className="mt-1.5 font-mono text-xs text-muted">
          <span className="text-foreground/90">{entry.filename}</span> will be permanently
          deleted. This can&apos;t be undone.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[9px] border border-border px-3.5 py-2 font-mono text-xs text-foreground transition-colors hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[9px] px-3.5 py-2 font-mono text-xs font-medium text-white transition-colors"
            style={{ background: "var(--accent-active)" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoCard({ entry, onDelete }: { entry: UploadEntry; onDelete: () => void }) {
  const [duration, setDuration] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopyPath() {
    await navigator.clipboard.writeText(entry.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-[180ms] hover:-translate-y-0.5 hover:border-[rgba(255,90,51,0.35)]">
      <div
        className="relative aspect-video w-full overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1c20, #0d0e11)" }}
      >
        <video
          controls
          playsInline
          preload="metadata"
          src={`/api/upload/${entry.id}/file`}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          className="h-full w-full object-cover"
        />

        {duration != null && (
          <span
            className="pointer-events-none absolute right-2 top-2 rounded font-mono text-[11px] text-foreground"
            style={{ background: "rgba(10, 11, 13, 0.7)", padding: "2px 6px" }}
          >
            {formatDuration(duration)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 p-3.5">
        <p className="truncate font-mono text-[13.5px] text-foreground" title={entry.filename}>
          {entry.filename}
        </p>
        <p className="font-mono text-[11.5px] text-muted">{formatDate(entry.createdAt)}</p>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyPath}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-border py-2 font-mono text-xs text-foreground transition-colors hover:bg-surface-hover"
          >
            <IconCopy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy Path"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete video"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
