"use client";

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

export function AccountsTab() {
  return (
    <div className="flex flex-col">
      <h1 className="font-display text-[30px] font-bold text-foreground">Accounts</h1>
      <p className="mt-1.5 font-mono text-[12.5px] text-muted">
        Link the accounts clips get published to or credited to.
      </p>

      <ul className="mt-[30px] flex flex-col gap-3">
        {PLATFORMS.map((platform) => (
          <li
            key={platform.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3.5">
              <platform.icon className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex flex-col gap-1">
                <span className="text-[14px] font-medium text-foreground">{platform.label}</span>
                <span className="font-mono text-[11.5px] text-muted">{platform.description}</span>
              </div>
            </div>
            <button
              type="button"
              disabled
              title="Not implemented yet"
              className="shrink-0 cursor-not-allowed rounded-[9px] border border-border px-3.5 py-2 font-mono text-xs text-muted opacity-60"
            >
              Link Account
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
