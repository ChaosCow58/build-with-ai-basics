import "server-only";
import { LlmFormatError, LlmRateLimitError, LlmTimeoutError } from "./llm";
import type { ApiError } from "./types";

export function jsonError(error: string, code: ApiError["code"], status: number) {
  return Response.json({ error, code } satisfies ApiError, { status });
}

export function llmErrorResponse(err: unknown) {
  console.error("[teachback] LLM error:", err);
  if (err instanceof LlmTimeoutError) {
    return jsonError("The AI took too long to respond. Give it another try.", "timeout", 504);
  }
  if (err instanceof LlmRateLimitError) {
    return jsonError("The AI is rate-limited right now. Wait a few seconds and retry.", "rate_limited", 429);
  }
  if (err instanceof LlmFormatError) {
    return jsonError("The AI sent back something we couldn't read, even after a retry. Please try again.", "llm_error", 502);
  }
  return jsonError("Something went wrong talking to the AI. Please try again.", "llm_error", 502);
}
