# Cliprinth

Cliprinth turns long-form video (livestream VODs, podcasts, long YouTube videos)
into short vertical clips ready for TikTok, YouTube Shorts and Instagram Reels —
an open, self-hosted alternative to tools like Opus Clip.

The AI handles the repetitive work (transcription, moment selection, cutting,
captioning); a human stays in the loop for the judgment calls that actually
determine whether a clip performs — picking the winning moment and landing the
hook in the first 1-2 seconds.

## Pipeline

1. **Transcribe** the source video with whisper.cpp (word-level timestamps).
2. **Analyze** the transcript with the Anthropic API to surface the strongest
   candidate moments.
3. **Cut** clips from the source at the selected timestamps with FFmpeg.
4. **Reframe** to 9:16 (centered crop in v1; face tracking planned for v2).
5. **Caption** clips by burning in styled `.ass` subtitles generated from the
   word-level timestamps.
6. **Generate** a title, description and hashtags per clip via the Anthropic
   API.
7. **Publish** to YouTube via the YouTube Data API. TikTok and Instagram have
   no reliable publishing API and remain manual, organic posting steps.

## Tech Stack

- **[Next.js](https://nextjs.org/)** (App Router) with **TypeScript** — frontend
  and backend in a single project.
- **[React](https://react.dev/)** — client-side review UI.
- **[Tailwind CSS](https://tailwindcss.com/)** — styling.
- **[whisper.cpp](https://github.com/ggerganov/whisper.cpp)**, via
  **[nodejs-whisper](https://www.npmjs.com/package/nodejs-whisper)** — speech-to-text
  with word-level timestamps.
- **[Anthropic API](https://docs.anthropic.com/)**, via
  **[@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)** — moment
  selection and title/description generation.
- **[FFmpeg](https://ffmpeg.org/)** — video cutting, 9:16 reframing, and caption
  burn-in. Invoked as a system binary via Node's `child_process`.
- **ASS (Advanced SubStation Alpha)** subtitles — per-word styling for
  TikTok-style karaoke captions.
- **[ESLint](https://eslint.org/)** — linting.

## Project structure

```
/app
  /page.tsx      → main UI
  /web           → client components (review UI, tabs, editors)
  /api           → server route handlers (pipeline, secrets, filesystem access)
/lib             → whisper, FFmpeg, storage, embedding, and other pipeline helpers
```
