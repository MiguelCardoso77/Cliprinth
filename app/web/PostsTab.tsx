"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEmbedUrl } from "@/lib/embed";
import { IconAdd } from "./icons";

type PostEntry = { id: string; url: string };

const MAX_VISIBLE_POSTS = 3;

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function PostsTab() {
  const [posts, setPosts] = useState<PostEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function loadPosts() {
    fetch("/api/posts")
      .then((response) => response.json())
      .then((data) => setPosts(data))
      .catch((err) => setError((err as Error).message));
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handleAddPost(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;

    setSaveError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to add post");
      }

      setUrl("");
      loadPosts();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  const count = posts?.length ?? 0;
  const displayedPosts = useMemo(
    () => (posts ? pickRandom(posts, MAX_VISIBLE_POSTS) : []),
    [posts]
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-[30px] font-bold text-foreground">Posts</h1>
        <span className="font-mono text-[13px] text-muted">
          {count} {count === 1 ? "post" : "posts"}
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[12.5px] text-muted">
        Paste the link to a video you already posted (YouTube, TikTok, Instagram) to see it here.
      </p>

      <form onSubmit={handleAddPost} className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <input
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.tiktok.com/@user/video/…"
          className="flex-1 rounded-[10px] border border-border bg-card px-3.5 py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 font-mono text-[13px] font-medium text-white transition-colors disabled:opacity-60"
          style={{ background: "var(--accent-active)" }}
        >
          <IconAdd className="h-4 w-4" />
          {isSaving ? "Adding..." : "Add"}
        </button>
      </form>
      {saveError && <p className="mt-2 font-mono text-xs text-rec">{saveError}</p>}

      {error && <p className="mt-6 font-mono text-xs text-rec">Failed to load posts: {error}</p>}

      {posts && posts.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No posts yet. Once you publish a clip manually, paste its link above.
          </p>
        </div>
      )}

      {displayedPosts.length > 0 && (
        <ul
          className="mt-[30px] grid gap-[22px]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
        >
          {displayedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PostCard({ post }: { post: PostEntry }) {
  const embed = parseEmbedUrl(post.url);

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1c20, #0d0e11)" }}
      >
        {embed ? (
          <iframe
            src={embed.embedUrl}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center font-mono text-xs text-accent"
          >
            No preview available
            <span className="truncate text-muted underline">{post.url}</span>
          </a>
        )}
      </div>

      <CopyLinkButton url={post.url} />
    </li>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="w-full py-2.5 font-mono text-[13px] font-medium text-white transition-colors"
      style={{ background: "var(--accent-active)" }}
    >
      {copied ? "Copied" : "Copy Link"}
    </button>
  );
}
