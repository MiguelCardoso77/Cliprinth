"use client";

import { useEffect, useState } from "react";

type VersionInfo = {
  current: string;
  latest: string | null;
  upToDate: boolean | null;
};

export function SettingsTab() {
  const [version, setVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);

  return (
    <div className="flex flex-col">
      <h1 className="font-display text-[30px] font-bold text-foreground">Settings</h1>

      <div className="mt-8 rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground">Version</h2>
        <VersionStatus version={version} />
      </div>
    </div>
  );
}

function VersionStatus({ version }: { version: VersionInfo | null }) {
  if (!version) {
    return <p className="mt-2 text-sm text-muted">Checking for updates...</p>;
  }

  if (version.latest === null) {
    return (
      <p className="mt-2 text-sm text-muted">
        Running version {version.current}. Could not check GitHub for updates.
      </p>
    );
  }

  if (version.upToDate) {
    return (
      <p className="mt-2 text-sm text-muted">
        Running version {version.current} — up to date.
      </p>
    );
  }

  return (
    <p className="mt-2 text-sm text-amber-500">
      Running version {version.current}, but {version.latest} is available on{" "}
      <a
        href="https://github.com/MiguelCardoso77/Cliprinth"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        GitHub
      </a>
      . Pull the latest changes to update.
    </p>
  );
}
