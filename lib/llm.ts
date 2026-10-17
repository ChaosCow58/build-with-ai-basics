import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";

/**
 * The only file that knows which LLM provider we use.
 * Swap Gemini for OpenAI/Anthropic by re-implementing `generateJson`.
 */

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_TIMEOUT_MS = 30_000;

export class LlmTimeoutError extends Error {}
export class LlmFormatError extends Error {}
export class LlmRateLimitError extends Error {}
export class LlmError extends Error {}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function modelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

type GenerateJsonArgs<T> = {
  system: string;
  prompt: string;
  /** Plain JSON Schema passed to Gemini's structured output. */
  jsonSchema: Record<string, unknown>;
  /** Zod schema used to validate what comes back. */
  validate: ZodType<T>;
  timeoutMs?: number;
  temperature?: number;
};

async function callOnce<T>(args: GenerateJsonArgs<T>): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let text: string | undefined;
  try {
    const res = await getClient().models.generateContent({
      model: modelName(),
      contents: args.prompt,
      config: {
        systemInstruction: args.system,
        responseMimeType: "application/json",
        responseJsonSchema: args.jsonSchema,
        temperature: args.temperature ?? 0.3,
        abortSignal: controller.signal,
      },
    });
    text = res.text;
  } catch (err) {
    if (timedOut) throw new LlmTimeoutError(`Model did not respond within ${timeoutMs / 1000}s`);
    const msg = err instanceof Error ? err.message : String(err);
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) throw new LlmRateLimitError(msg);
    throw new LlmError(msg);
  } finally {
    clearTimeout(timer);
  }

  if (!text) throw new LlmFormatError("Empty response from model");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LlmFormatError("Model returned malformed JSON");
  }
  const result = args.validate.safeParse(parsed);
  if (!result.success) throw new LlmFormatError(`Model JSON failed validation: ${result.error.message}`);
  return result.data;
}

/** Calls the model for structured JSON. Retries once on malformed output. */
export async function generateJson<T>(args: GenerateJsonArgs<T>): Promise<T> {
  try {
    return await callOnce(args);
  } catch (err) {
    if (err instanceof LlmFormatError) return callOnce(args);
    throw err;
  }
}
