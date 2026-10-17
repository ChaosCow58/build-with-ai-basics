import { describe, expect, it } from "vitest";
import { openQuiz, sealQuiz } from "@/lib/token";

const payload = {
  code: "const x = 1;",
  language: "javascript",
  questions: [
    { id: "q1", type: "explain" as const, prompt: "p", lineStart: 1, lineEnd: 1, concept: "c", rubric: ["SECRET_RUBRIC"] },
  ],
};

describe("quiz token", () => {
  it("round-trips the payload", () => {
    const token = sealQuiz(payload);
    expect(openQuiz(token)?.questions[0].rubric).toEqual(["SECRET_RUBRIC"]);
  });

  it("hides the rubric from the client", () => {
    const token = sealQuiz(payload);
    const decoded = token
      .split(".")
      .map((p) => Buffer.from(p, "base64url").toString("utf8"))
      .join("");
    expect(decoded).not.toContain("SECRET_RUBRIC");
  });

  it("rejects tampered tokens", () => {
    const [iv, tag, body] = sealQuiz(payload).split(".");
    const flipped = body.slice(0, -2) + (body.endsWith("A") ? "BB" : "AA");
    expect(openQuiz([iv, tag, flipped].join("."))).toBeNull();
    expect(openQuiz("garbage")).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = sealQuiz(payload, Date.now() - 3 * 60 * 60 * 1000);
    expect(openQuiz(token)).toBeNull();
  });
});
