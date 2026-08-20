"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconInstagramColor, IconTiktokColor, IconYoutubeColor } from "./icons";

const PLATFORMS = [
  {
    id: "youtube",
    label: "YouTube",
    description: "Shorts",
    icon: IconYoutubeColor,
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Reels",
    icon: IconInstagramColor,
  },
  {
    id: "tiktok",
    label: "TikTok",
    description: "TikToks",
    icon: IconTiktokColor,
  },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

type LinkedAccountSummary = {
  platform: PlatformId;
  accountId: string;
  displayName: string;
  connectedAt: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "This platform isn't configured yet — add its API credentials to .env first.",
  invalid_state: "Link request expired or was invalid. Please try again.",
  link_failed: "Couldn't link the account. Please try again.",
  unknown_platform: "Unknown platform.",
};

export function AccountsTab({ active }: { active: boolean }) {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<LinkedAccountSummary[]>([]);
  const [configured, setConfigured] = useState<Record<PlatformId, boolean>>(
    {} as Record<PlatformId, boolean>,
  );
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [unlinking, setUnlinking] = useState<PlatformId | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    fetch("/api/accounts")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, reloadToken]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    fetch("/api/accounts/config")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setConfigured(data);
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  const linked = searchParams.get("linked");
  const errorCode = searchParams.get("error");
  const errorPlatform = searchParams.get("platform");

  const handleUnlink = async (platform: PlatformId) => {
    setUnlinking(platform);
    try {
      await fetch(`/api/accounts/${platform}`, { method: "DELETE" });
      setReloadToken((token) => token + 1);
    } finally {
      setUnlinking(null);
    }
  };

  return (
    <div className="flex flex-col">
      <h1 className="font-display text-[30px] font-bold text-foreground">Accounts</h1>
      <p className="mt-1.5 font-mono text-[12.5px] text-muted">
        Link the accounts clips get published to or credited to.
      </p>

      {linked && (
        <p className="mt-4 rounded-lg border border-border bg-card px-3.5 py-2.5 font-mono text-[12px] text-foreground">
          Linked {linked} account.
        </p>
      )}
      {errorCode && (
        <p className="mt-4 rounded-lg border border-border bg-card px-3.5 py-2.5 font-mono text-[12px] text-muted">
          {errorPlatform ? `${errorPlatform}: ` : ""}
          {ERROR_MESSAGES[errorCode] ?? "Something went wrong linking that account."}
        </p>
      )}

      <ul className="mt-[30px] flex flex-col gap-3">
        {PLATFORMS.map((platform) => {
          const account = accounts.find((a) => a.platform === platform.id);
          const isConfigured = configured[platform.id] ?? false;

          return (
            <li
              key={platform.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3.5">
                <platform.icon className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-medium text-foreground">{platform.label}</span>
                  <span className="font-mono text-[11.5px] text-muted">
                    {account ? `Connected as ${account.displayName}` : platform.description}
                  </span>
                </div>
              </div>
              {account ? (
                <button
                  type="button"
                  onClick={() => handleUnlink(platform.id)}
                  disabled={unlinking === platform.id}
                  className="shrink-0 rounded-[9px] border border-border px-3.5 py-2 font-mono text-xs text-foreground transition-colors hover:bg-white/[0.04] disabled:opacity-60"
                >
                  {unlinking === platform.id ? "Unlinking…" : "Unlink"}
                </button>
              ) : isConfigured ? (
                <a
                  href={`/api/accounts/${platform.id}/connect`}
                  className="shrink-0 rounded-[9px] border border-border px-3.5 py-2 font-mono text-xs text-foreground transition-colors hover:bg-white/[0.04]"
                >
                  {loading ? "…" : "Link Account"}
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Not configured yet — add this platform's API credentials to .env"
                  className="shrink-0 cursor-not-allowed rounded-[9px] border border-border px-3.5 py-2 font-mono text-xs text-muted opacity-60"
                >
                  Link Account
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
