import { OAuthProvider, OAuthTokens } from "./types";

// Instagram publishing goes through the Meta Graph API against an Instagram
// Business/Creator account linked to a Facebook Page — there is no separate
// "Instagram login", you authorize a Facebook app and then look up the
// linked IG account. Requires a Meta app that has passed review for the
// instagram_content_publish permission.
// Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing
const GRAPH_VERSION = "v21.0";
const AUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const TOKEN_URL = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`;
const PAGES_URL = `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`;
const SCOPE = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

function appId(): string {
  return process.env.META_APP_ID ?? "";
}

function appSecret(): string {
  return process.env.META_APP_SECRET ?? "";
}

export const instagramProvider: OAuthProvider = {
  platform: "instagram",

  isConfigured: () => Boolean(appId() && appSecret()),

  buildAuthUrl: (state, redirectUri) => {
    const params = new URLSearchParams({
      client_id: appId(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  exchangeCode: async (code, redirectUri) => {
    const shortLivedParams = new URLSearchParams({
      client_id: appId(),
      client_secret: appSecret(),
      redirect_uri: redirectUri,
      code,
    });
    const shortLivedResponse = await fetch(
      `${TOKEN_URL}?${shortLivedParams.toString()}`,
    );
    if (!shortLivedResponse.ok) {
      throw new Error(
        `Instagram token exchange failed: ${await shortLivedResponse.text()}`,
      );
    }
    const shortLived = await shortLivedResponse.json();

    // Exchange the short-lived (≈1h) user token for a long-lived (≈60 day)
    // one — the short-lived token isn't practical to post with later.
    const longLivedParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId(),
      client_secret: appSecret(),
      fb_exchange_token: shortLived.access_token,
    });
    const longLivedResponse = await fetch(
      `${TOKEN_URL}?${longLivedParams.toString()}`,
    );
    if (!longLivedResponse.ok) {
      throw new Error(
        `Instagram long-lived token exchange failed: ${await longLivedResponse.text()}`,
      );
    }
    const longLived = await longLivedResponse.json();

    const tokens: OAuthTokens = {
      accessToken: longLived.access_token,
      expiresAt: longLived.expires_in
        ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
        : undefined,
    };
    return tokens;
  },

  fetchProfile: async (tokens) => {
    const pagesResponse = await fetch(
      `${PAGES_URL}?fields=instagram_business_account{id,username}&access_token=${tokens.accessToken}`,
    );
    if (!pagesResponse.ok) {
      throw new Error(`Instagram pages fetch failed: ${await pagesResponse.text()}`);
    }

    const pages = await pagesResponse.json();
    const pageWithIg = (pages.data ?? []).find(
      (page: { instagram_business_account?: { id: string } }) =>
        page.instagram_business_account,
    );

    if (!pageWithIg) {
      throw new Error(
        "No Instagram Business/Creator account linked to any of your Facebook Pages",
      );
    }

    const igAccount = pageWithIg.instagram_business_account as {
      id: string;
      username?: string;
    };

    return {
      accountId: igAccount.id,
      displayName: igAccount.username ?? igAccount.id,
    };
  },
};
