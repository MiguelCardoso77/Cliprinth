# Cliprinth

Cliprinth is a web app that turns long-form video (livestream VODs, podcasts, long
YouTube videos) into short vertical clips ready for TikTok, YouTube Shorts and
Instagram Reels — an open, self-hosted alternative to tools like Opus Clip, built
to run locally for personal use and (later) to be hostable for others.

The purpose is twofold: save money versus paid clipping tools, and save time by
automating the repetitive parts of the clipping workflow while keeping a human in
the loop for the judgment calls that actually determine whether a clip performs.

## Core philosophy

The AI does the heavy, repetitive work. The human makes the final calls. The most
valuable step in clipping — deciding which moment will resonate and getting the
hook to land in the first 1-2 seconds — is not fully automatable, so the app is
built AROUND a human review interface, not to replace it. This is intended to be a
differentiator: the review/refinement UI is where Cliprinth can be *better* than
commercial tools for our workflow, not just cheaper.

## Tech stack

- **Framework:** Next.js (App Router) with TypeScript. Frontend (React) and backend
  (Node route handlers) live in one project.
- **Transcription:** whisper.cpp (via a Node wrapper or the binary directly). Word-level
  timestamps are required — they feed both moment selection and caption timing.
- **Moment selection & text generation:** Anthropic API via the official TypeScript SDK
  (`@anthropic-ai/sdk`). Text in, structured JSON out.
- **Video cutting & caption burn-in:** FFmpeg (a system binary), called from Node via
  `fluent-ffmpeg` or `child_process`.
- **9:16 reframe + face tracking:** MediaPipe JS (`@mediapipe/tasks-vision`) for face
  detection, plus canvas/OpenCV-style logic for cropping and smoothing.
- **Captions:** generated as .ass files (ASS format, not SRT — ASS allows per-word
  highlighting and styling for the TikTok-style karaoke captions), burned in with FFmpeg.
- **YouTube upload:** `googleapis` npm package (official). See constraints below.
- **TikTok upload:** TikTok Content Posting API (`video.publish` scope), OAuth-connected
  account, app must pass TikTok's audit. Official API only — see constraints below.
- **Instagram upload:** Meta Graph API, requires an Instagram **Business/Creator** account
  linked to a Facebook Page, and a Meta app that has passed app review. Official API only —
  see constraints below.

## The 7 steps of the pipeline

1. **Video → transcript.** Run whisper.cpp on the source video. Output transcript with
   word-level timestamps. This is the backbone everything else depends on.
2. **Analyze transcript for the best moments.** Send the transcript to the Anthropic API;
   ask for the N strongest segments with start/end timestamps, returned as JSON. NOTE:
   the LLM only sees text, so it cannot judge vocal energy, reactions, or timing — expect
   it to over-suggest. The human review step exists to catch this.
3. **Cut the video** at the selected timestamps with FFmpeg. Cutting is trivial; cutting
   *well* is not — the exact in-point (so the hook lands in second 1, not mid-word or after
   dead air) is the human refinement step, not something to fully automate.
4. **Reframe to 9:16 with face tracking.** The hard part. Use MediaPipe to locate faces per
   frame, compute a 9:16 crop window centered on the active speaker, and SMOOTH the motion
   across frames so the crop doesn't jitter. v1: assume one dominant face / simple center
   crop. v2: switch subject when the speaker changes (multi-person streams). Do not block
   v1 on solving v2.
5. **Generate captions.** Reuse the word-level timestamps from step 1. Produce a styled .ass
   file and burn it in with FFmpeg. Captions must be clean and accurate — auto-captions
   routinely mangle names and domain terms, so these are editable in the review UI.
6. **Generate title + description** (and hashtags) via the Anthropic API from the clip's
   transcript. Editable in the review UI.
7. **Publishing.** Automate posting to YouTube, TikTok and Instagram — but ONLY through each
   platform's official posting API (YouTube Data API v3, TikTok Content Posting API, Meta
   Graph API for Instagram), with an approved app and a properly connected account (OAuth for
   YouTube/TikTok, Business/Creator account + linked Facebook Page for Instagram). This is
   distinct from — and does not carry the same ban risk as — browser automation, which mimics
   human activity to fake organic engagement and is what the "organic only / instant ban"
   campaign rules actually target. **Never fall back to browser automation / scraping /
   unofficial endpoints for TikTok or Instagram** if the official API path is unavailable or
   an app review is pending — leave publishing manual for that platform instead of automating
   around it. Each platform integration needs its own OAuth connect flow, stored per-account
   credentials, and its own upload route (mirroring the YouTube one), since the three APIs
   have different auth models, media requirements, and rate limits.

## Architecture decisions (decided up front)

- **Heavy work must be asynchronous.** Transcription and reframing take minutes, not
  milliseconds. A route handler must NOT do the heavy processing synchronously inside the
  HTTP request — it will blow timeouts, especially once hosted (Vercel serverless functions
  have short execution limits). Pattern: the route kicks off a job and returns a job ID; the
  work runs in the background; the frontend polls for status. Build this way from the start
  even though local use is more forgiving, so hosting later doesn't force a rewrite.
- **This will NOT deploy to Vercel serverless.** FFmpeg and whisper.cpp are system binaries
  that serverless doesn't provide cleanly. The hosting target is a **container (Docker)** on
  something like Railway, Render, Fly.io, or a VM. Local dev runs everything on the user's
  machine. Do not design around serverless assumptions.
- **Server vs client components (Next.js App Router):** the review UI (sliders, caption
  editing, interactivity) is client components (`"use client"`). The pipeline work
  (whisper, FFmpeg, Anthropic calls, filesystem access, secrets) lives in server-side route
  handlers under `app/api/`. Keep the API key server-side only.

## Suggested structure

```
/app
  /page.tsx                 → main UI (client)
  /api
    /transcribe/route.ts    → receives video, runs whisper.cpp
    /analyze/route.ts       → transcript → Anthropic → moments (JSON)
    /clip/route.ts          → FFmpeg cut + reframe + caption burn-in
    /generate-text/route.ts → title/description via Anthropic
/lib
  /whisper.ts               → whisper.cpp wrapper
  /ffmpeg.ts                → cut / reframe helpers (fluent-ffmpeg)
  /reframe.ts               → MediaPipe tracking logic
  /anthropic.ts             → SDK client
/components
  /ClipReviewer.tsx         → visual editor: cut sliders, preview (client)
```

## Build order (build the easy path first, prove it end-to-end)

- **Phase 0:** `create-next-app` (TypeScript, App Router). Get it running. Upload a file and
  save it server-side. Just the plumbing — prove frontend↔backend talk.
- **Phase 1:** transcribe route (whisper.cpp) + analyze route (Anthropic) → show the list of
  suggested moments with timestamps in the frontend. No video manipulation yet beyond reading.
- **Phase 2:** cut route (FFmpeg) + .ass captions → produce captioned clips, still 16:9.
- **Phase 3:** the 9:16 reframe with MediaPipe (center crop first, then face tracking).
- **Phase 4:** the review interface (the differentiator) — cut sliders with a live caption-style
  preview. No caption-text editing UI — out of scope, see constraints below.
- **Phase 5:** title/description generation, then (later, out of campaign) YouTube API upload.

Do not build 1→7 linearly. Get the easy path (1,2,3,5,6 minus the reframe) working end-to-end
before tackling the reframe monster (step 4) and publishing (step 7). If work stops midway,
it should stop with something that runs, not seven half-built pieces.

## Important constraints — do not lose these in the code

- **TikTok/Instagram posting may be automated, but ONLY via each platform's official posting
  API** (TikTok Content Posting API, Meta Graph API), with an approved app and a properly
  connected account. Never automate via browser automation, scraping, or unofficial/reverse-
  engineered endpoints for TikTok or Instagram — that is the kind of automated/artificial
  activity the "organic only / instant ban" campaign rules actually penalize, unlike posting
  through a platform-sanctioned API. If official API access isn't available yet for a given
  account (pending app review, non-business IG account, etc.), fall back to manual posting for
  that platform rather than automating around the restriction.
- **No caption-editing UI is planned** — a dedicated correction step was considered and dropped
  as unnecessary. Auto-transcription errors (names, tickers, jargon) are accepted as-is; if this
  becomes a real problem later, revisit rather than silently building the editor back in.
- **Keep the Anthropic API key server-side only** (env var, never shipped to the client).