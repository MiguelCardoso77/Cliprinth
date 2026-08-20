import { Platform } from "@/lib/accounts";
import { OAuthProvider } from "./types";
import { youtubeProvider } from "./youtube";
import { tiktokProvider } from "./tiktok";
import { instagramProvider } from "./instagram";

const PROVIDERS: Record<Platform, OAuthProvider> = {
  youtube: youtubeProvider,
  tiktok: tiktokProvider,
  instagram: instagramProvider,
};

export function getProvider(platform: Platform): OAuthProvider {
  return PROVIDERS[platform];
}

export function getRedirectUri(platform: Platform, origin: string): string {
  const base = process.env.APP_BASE_URL || origin;
  return `${base}/api/accounts/${platform}/callback`;
}
