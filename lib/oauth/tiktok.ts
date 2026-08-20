import { OAuthProvider, OAuthTokens } from "./types";

// TikTok Content Posting API, via TikTok's Login Kit OAuth flow. Requires an
// app that has passed TikTok's audit for the video.publish scope.
// Docs: https://developers.tiktok.com/doc/login-kit-web
const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL =
  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name";
const SCOPE = "user.info.basic,video.publish";

function clientKey(): string {
  return process.env.TIKTOK_CLIENT_KEY ?? "";
}

function clientSecret(): string {
  return process.env.TIKTOK_CLIENT_SECRET ?? "";
}

export const tiktokProvider: OAuthProvider = {
  platform: "tiktok",

  isConfigured: () => Boolean(clientKey() && clientSecret()),

  buildAuthUrl: (state, redirectUri) => {
    const params = new URLSearchParams({
      client_key: clientKey(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  exchangeCode: async (code, redirectUri) => {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: clientKey(),
        client_secret: clientSecret(),
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`TikTok token exchange failed: ${await response.text()}`);
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
    const response = await fetch(USER_INFO_URL, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`TikTok profile fetch failed: ${await response.text()}`);
    }

    const data = await response.json();
    const user = data.data?.user;
    if (!user) {
      throw new Error("No TikTok user info returned");
    }

    return {
      accountId: user.open_id,
      displayName: user.display_name ?? user.open_id,
    };
  },
};
