export type EmbedPlatform = "youtube" | "tiktok" | "instagram";

export type ParsedEmbed = {
  platform: EmbedPlatform;
  embedUrl: string;
};

// Turns a public post URL into an iframe-embeddable URL, for platforms that
// allow it. Returns null when the URL doesn't match a known pattern (the UI
// then falls back to a plain link instead of a broken iframe).
export function parseEmbedUrl(url: string): ParsedEmbed | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    if (id) return { platform: "youtube", embedUrl: youtubeEmbedUrl(id) };
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      if (id) return { platform: "youtube", embedUrl: youtubeEmbedUrl(id) };
    }
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch) {
      return { platform: "youtube", embedUrl: youtubeEmbedUrl(shortsMatch[1]) };
    }
  }

  if (host === "tiktok.com") {
    const match = parsed.pathname.match(/\/video\/(\d+)/);
    if (match) {
      return { platform: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}?autoplay=1&muted=1` };
    }
  }

  if (host === "instagram.com") {
    const match = parsed.pathname.match(/^\/(p|reel)\/([^/]+)/);
    if (match) {
      return { platform: "instagram", embedUrl: `https://www.instagram.com/${match[1]}/${match[2]}/embed` };
    }
  }

  return null;
}

function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1`;
}
