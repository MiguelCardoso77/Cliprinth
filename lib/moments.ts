export type TranscriptWord = { word: string; start: number; end: number };

const GRADE_ENUM = ["S", "A", "B", "C", "D", "F"] as const;
export type Grade = (typeof GRADE_ENUM)[number];

export function isGrade(value: unknown): value is Grade {
    return (
        typeof value === "string" &&
        (GRADE_ENUM as readonly string[]).includes(value)
    );
}

/**
 * The LLM produces viralityScore and the three grades (hook/flow/engagement) as separate
 * judgments, which can disagree and read as an inconsistent verdict to the user. We calculate
 * a weighted average dominated by the grades (80% combined) so the displayed score always
 * stays close to what the grades imply, while still keeping a 20% share for the LLM's own
 * holistic score. Hook is weighted heaviest among the grades because landing the hook in the
 * first 1-2 seconds is the single biggest driver of whether a clip gets watched.
 */

const GRADE_VAL: Record<Grade, number> = {
    F: 10,
    D: 30,
    C: 50,
    B: 70,
    A: 90,
    S: 100,
};

export function computeViralityScore(rawScore: number, hook: Grade, flow: Grade, engagement: Grade): number {
    const vScore = GRADE_VAL[hook] * 0.4 + GRADE_VAL[flow] * 0.2 + GRADE_VAL[engagement] * 0.2 + rawScore * 0.2;
    return Math.round(vScore);
}

export const MOMENT_SCHEMA = {
    type: "object",
    properties: {
        moments: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    start: {type: "number"},
                    end: {type: "number"},
                    title: {type: "string"},
                    reason: {type: "string"},
                    description: {type: "string"},
                    hashtags: {type: "array", items: {type: "string"}},
                    viralityScore: {type: "number"},
                    hookGrade: {type: "string", enum: GRADE_ENUM},
                    flowGrade: {type: "string", enum: GRADE_ENUM},
                    engagementGrade: {type: "string", enum: GRADE_ENUM},
                },
                required: [
                    "start",
                    "end",
                    "title",
                    "reason",
                    "description",
                    "hashtags",
                    "viralityScore",
                    "hookGrade",
                    "flowGrade",
                    "engagementGrade",
                ],
                additionalProperties: false,
            },
        },
    },
    required: ["moments"],
    additionalProperties: false,
} as const;

export function buildTimestampedTranscript(
    words: TranscriptWord[],
    bucketSeconds = 15,
): string {
    if (words.length === 0) return "";

    const lines: string[] = [];
    let bucketStart = words[0].start;
    let bucketWords: string[] = [];

    const flush = (end: number) => {
        if (bucketWords.length === 0) return;
        lines.push(
            `[${bucketStart.toFixed(1)}-${end.toFixed(1)}] ${bucketWords.join(" ")}`,
        );
        bucketWords = [];
    };

    for (const word of words) {
        if (word.start - bucketStart >= bucketSeconds) {
            flush(word.start);
            bucketStart = word.start;
        }
        bucketWords.push(word.word);
    }
    flush(words[words.length - 1].end);

    return lines.join("\n");
}

export function buildMomentsPrompt(
    transcript: string,
    campaignRules?: string,
): string {
    const rulesSection = campaignRules?.trim()
        ? `\nThis clip selection is for a specific campaign with the following rules. They constrain BOTH which moments you pick and how you write their descriptions/hashtags — a moment that would otherwise be strong but breaks a rule must be excluded:\n${campaignRules.trim()}\n`
        : "";

    return `You are helping select the strongest short-form clip candidates from a long-form video transcript for TikTok/Shorts/Reels.
${rulesSection}
The transcript below is grouped into ~15 second segments with start/end timestamps in seconds.

Identify up to 10 of the strongest standalone moments (self-contained stories, strong hooks, surprising claims, emotional peaks, or clear payoffs). Each moment must be between 0 and 60 seconds long (end - start <= 60). For each moment, return:
- start / end: timestamps in seconds, aligned to the segment boundaries, no more than 60 seconds apart
- title: a short, punchy title for the clip (works as both an internal label and a social media post title)
- reason: a one-sentence reason this moment could work as a clip
- description: a ready-to-post social media caption/description for the clip (1-3 sentences, written for the platform, no timestamps)
- hashtags: 3-6 relevant hashtags as an array of strings, each starting with "#", no spaces
- viralityScore: your honest estimate, from 0 to 100, of how likely this specific clip is to go viral on short-form platforms (0 = very unlikely, 100 = extremely likely)
- hookGrade: a letter grade (S, A, B, C, D, or F) for how strongly the first 1-2 seconds grab attention
- flowGrade: a letter grade (S, A, B, C, D, or F) for how well the moment holds together and paces as a standalone clip
- engagementGrade: a letter grade (S, A, B, C, D, or F) for how likely viewers are to comment, share, or rewatch

Be a harsh, skeptical critic, not a cheerleader. Most moments in a typical transcript are mediocre as standalone clips, so most scores and grades should reflect that. If nothing in the transcript is genuinely exceptional, it is fine and expected for every returned moment to grade out as average or below.

Do not use em dashes (—) anywhere in the title, reason, or description. Use commas, periods, or parentheses instead.

Respond with ONLY a JSON object matching this exact shape, no other text:
{"moments": [{"start": number, "end": number, "title": string, "reason": string, "description": string, "hashtags": string[], "viralityScore": number, "hookGrade": string, "flowGrade": string, "engagementGrade": string}]}

Transcript:
${transcript}`;
}
