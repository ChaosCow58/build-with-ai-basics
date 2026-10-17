import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { generateJson, LlmFormatError, LlmRateLimitError, LlmTimeoutError, isLlmConfigured } = await import("@/lib/llm");

const args = {
  system: "s",
  prompt: "p",
  jsonSchema: {},
  validate: z.object({ ok: z.boolean() }),
};

describe("generateJson", () => {
  beforeEach(() => {
    generateContent.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("reports whether a key is configured", () => {
    expect(isLlmConfigured()).toBe(true);
    process.env.GEMINI_API_KEY = "  ";
    expect(isLlmConfigured()).toBe(false);
  });

  it("retries once on malformed JSON, then succeeds", async () => {
    generateContent.mockResolvedValueOnce({ text: "{not json" }).mockResolvedValueOnce({ text: '{"ok":true}' });
    await expect(generateJson(args)).resolves.toEqual({ ok: true });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second malformed response", async () => {
    generateContent.mockResolvedValue({ text: '{"wrong":1}' });
    await expect(generateJson(args)).rejects.toBeInstanceOf(LlmFormatError);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("maps quota errors to a rate-limit error without retrying", async () => {
    generateContent.mockRejectedValue(new Error("429 RESOURCE_EXHAUSTED"));
    await expect(generateJson(args)).rejects.toBeInstanceOf(LlmRateLimitError);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("times out slow responses", async () => {
    generateContent.mockImplementation(
      ({ config }: { config: { abortSignal: AbortSignal } }) =>
        new Promise((_, reject) => config.abortSignal.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    await expect(generateJson({ ...args, timeoutMs: 20 })).rejects.toBeInstanceOf(LlmTimeoutError);
  });
});
