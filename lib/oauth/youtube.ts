import { OAuthProvider, OAuthTokens } from "./types";

// YouTube Data API v3 upload access, via Google's standard OAuth 2.0 flow.
// Docs: https://developers.google.com/identity/protocols/oauth2/web-server
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CHANNELS_URL =
  "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true";
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

function clientId(): string {
  return process.env.GOOGLE_CLIENT_ID ?? "";
}

function clientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? "";
}

export const youtubeProvider: OAuthProvider = {
  platform: "youtube",

  isConfigured: () => Boolean(clientId() && clientSecret()),

  buildAuthUrl: (state, redirectUri) => {
    const params = new URLSearchParams({
      client_id: clientId(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  exchangeCode: async (code, redirectUri) => {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId(),
        client_secret: clientSecret(),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      throw new Error(`YouTube token exchange failed: ${await response.text()}`);
    }

    const data = await response.json();
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
    };
    return tokens;
  },

  fetchProfile: async (tokens) => {
    const response = await fetch(CHANNELS_URL, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`YouTube profile fetch failed: ${await response.text()}`);
    }

    const data = await response.json();
    const channel = data.items?.[0];
    if (!channel) {
      throw new Error("No YouTube channel found for this Google account");
    }

    return {
      accountId: channel.id,
      displayName: channel.snippet?.title ?? channel.id,
    };
  },
};
