import { Platform } from "@/lib/accounts";

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
};

export type OAuthProfile = {
  accountId: string;
  displayName: string;
};

// One implementation per platform (lib/oauth/youtube.ts, tiktok.ts,
// instagram.ts). Each talks to that platform's OFFICIAL posting-related API
// only — see CLAUDE.md § Important constraints for why that's a hard rule.
export type OAuthProvider = {
  platform: Platform;
  // True once the required client id/secret env vars are set. The connect
  // route uses this to fail fast with a clear message instead of building a
  // broken authorize URL.
  isConfigured: () => boolean;
  buildAuthUrl: (state: string, redirectUri: string) => string;
  exchangeCode: (code: string, redirectUri: string) => Promise<OAuthTokens>;
  fetchProfile: (tokens: OAuthTokens) => Promise<OAuthProfile>;
};
