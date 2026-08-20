import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isPlatform } from "@/lib/accounts";
import { getProvider, getRedirectUri } from "@/lib/oauth";

const STATE_COOKIE_MAX_AGE = 600; // 10 minutes — plenty for the redirect round trip

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const origin = new URL(request.url).origin;

  if (!isPlatform(platform)) {
    return NextResponse.redirect(`${origin}/?tab=accounts&error=unknown_platform`);
  }

  const provider = getProvider(platform);
  if (!provider.isConfigured()) {
    return NextResponse.redirect(
      `${origin}/?tab=accounts&error=not_configured&platform=${platform}`,
    );
  }

  const state = randomUUID();
  const redirectUri = getRedirectUri(platform, origin);
  const authUrl = provider.buildAuthUrl(state, redirectUri);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https"),
    maxAge: STATE_COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
