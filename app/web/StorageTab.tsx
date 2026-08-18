"use client";

import { useEffect, useState } from "react";

type UploadEntry = { id: string; filename: string; path: string };

export function StorageTab() {
  const [uploads, setUploads] = useState<UploadEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/uploads")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setUploads(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopyPath(entry: UploadEntry) {
    await navigator.clipboard.writeText(entry.path);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId((current) => (current === entry.id ? null : current)), 1500);
  }

  if (error) {
    return <p className="font-mono text-xs text-rec">Failed to load storage: {error}</p>;
  }

  if (!uploads) {
    return <p className="font-mono text-xs text-muted">Loading...</p>;
  }

  if (uploads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted">
          No videos here yet. Upload one from the <span className="text-foreground">New</span> tab
          to see it listed.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {uploads.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <video
            controls
            preload="metadata"
            src={`/api/upload/${entry.id}/file`}
            className="aspect-video w-full rounded-md border border-border bg-background object-cover"
          />
          <p className="truncate font-mono text-xs text-foreground" title={entry.filename}>
            {entry.filename}
          </p>
          <button
            type="button"
            onClick={() => handleCopyPath(entry)}
            className="self-start rounded-md border border-border px-3 py-1 text-xs text-foreground transition-colors hover:bg-surface-hover"
          >
            {copiedId === entry.id ? "Copied!" : "Copy Path"}
          </button>
        </li>
      ))}
    </ul>
  );
}
