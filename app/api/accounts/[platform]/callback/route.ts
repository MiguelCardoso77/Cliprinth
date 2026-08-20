import { NextRequest, NextResponse } from "next/server";
import { isPlatform, saveAccount } from "@/lib/accounts";
import { getProvider, getRedirectUri } from "@/lib/oauth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const origin = new URL(request.url).origin;
  const accountsUrl = `${origin}/?tab=accounts`;

  if (!isPlatform(platform)) {
    return NextResponse.redirect(`${accountsUrl}&error=unknown_platform`);
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const stateCookie = request.cookies.get(`oauth_state_${platform}`)?.value;

  const response = (redirectUrl: string) => {
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.delete(`oauth_state_${platform}`);
    return res;
  };

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return response(`${accountsUrl}&error=invalid_state&platform=${platform}`);
  }

  try {
    const provider = getProvider(platform);
    const redirectUri = getRedirectUri(platform, origin);
    const tokens = await provider.exchangeCode(code, redirectUri);
    const profile = await provider.fetchProfile(tokens);

    await saveAccount({
      platform,
      accountId: profile.accountId,
      displayName: profile.displayName,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });

    return response(`${accountsUrl}&linked=${platform}`);
  } catch (error) {
    console.error(`Failed to link ${platform} account:`, error);
    return response(`${accountsUrl}&error=link_failed&platform=${platform}`);
  }
}
