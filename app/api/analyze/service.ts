import { getAnthropicClient } from "@/lib/anthropic";
import { WhisperWord } from "@/lib/whisper";
import { buildMomentsPrompt, buildTimestampedTranscript, MOMENT_SCHEMA } from "@/lib/moments";

export type Moment = {
  start: number;
  end: number;
  title: string;
  reason: string;
  description: string;
  hashtags: string[];
  viralityScore: number;
};

export class AnalyzeService {
  public findMoments = async (words: WhisperWord[]): Promise<Moment[]> => {
    const transcript = buildTimestampedTranscript(words);
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: MOMENT_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: buildMomentsPrompt(transcript),
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("No text response from Anthropic");
    }

    const parsed: { moments: Moment[] } = JSON.parse(block.text);
    return parsed.moments;
  };
}
