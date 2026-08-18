import { failure, Result, success } from "../utils/response";
import { AnalyzeService, Moment } from "./service";
import { WhisperWord } from "@/lib/whisper";

export class AnalyzeController {
  private service = new AnalyzeService();

  public handleAnalyze = async (body: unknown): Promise<Result<{ moments: Moment[] }>> => {
    const words = extractWords(body);
    if (!words) {
      return failure("words is required", 400);
    }

    const moments = await this.service.findMoments(words);
    return success({ moments });
  };
}

function extractWords(body: unknown): WhisperWord[] | null {
  if (typeof body !== "object" || body === null) return null;
  const words = (body as Record<string, unknown>).words;
  if (!Array.isArray(words)) return null;
  return words as WhisperWord[];
}
