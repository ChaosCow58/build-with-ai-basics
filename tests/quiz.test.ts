import { describe, expect, it } from "vitest";
import {
  clampRange,
  computeHeatmap,
  finalizeGrade,
  normalizeQuiz,
  numberLines,
  overallScore,
  toPublic,
  truncateWords,
} from "@/lib/quiz";
import type { LlmGrade, PrivateQuestion } from "@/lib/types";

const Q = (id: string, lineStart: number, lineEnd: number): PrivateQuestion => ({
  id,
  type: "explain",
  prompt: `Question ${id}`,
  lineStart,
  lineEnd,
  concept: `Concept ${id}`,
  rubric: ["point a", "point b"],
});

describe("numberLines", () => {
  it("prefixes padded line numbers", () => {
    const code = Array.from({ length: 10 }, (_, i) => `line${i + 1}`).join("\r\n");
    const out = numberLines(code).split("\n");
    expect(out[0]).toBe(" 1| line1");
    expect(out[9]).toBe("10| line10");
  });
});

describe("clampRange", () => {
  it("clamps, swaps and rounds", () => {
    expect(clampRange(0, 500, 20)).toEqual([1, 20]);
    expect(clampRange(9, 4, 20)).toEqual([4, 9]);
    expect(clampRange(2.6, Number.NaN, 20)).toEqual([3, 3]);
    expect(clampRange(-5, -1, 0)).toEqual([1, 1]);
  });
});

describe("normalizeQuiz", () => {
  it("keeps exactly 3 questions with stable ids and clamped ranges", () => {
    const q = { type: "predict" as const, prompt: " p ", lineStart: 50, lineEnd: 2, concept: "c", rubric: ["a", "b", "c", "d"] };
    const out = normalizeQuiz({ summary: "s", language: "js", questions: [q, q, q, q] }, 10);
    expect(out).toHaveLength(3);
    expect(out.map((x) => x.id)).toEqual(["q1", "q2", "q3"]);
    expect(out[0]).toMatchObject({ lineStart: 2, lineEnd: 10, prompt: "p" });
    expect(out[0].rubric).toHaveLength(3);
  });

  it("never leaks the rubric to the public shape", () => {
    const pub = toPublic([Q("q1", 1, 2)]);
    expect(pub[0]).not.toHaveProperty("rubric");
  });
});

describe("scoring", () => {
  it("computes overall score as a percentage of max points", () => {
    expect(overallScore([{ score: 2 }, { score: 1 }, { score: 0 }])).toBe(50);
    expect(overallScore([{ score: 2 }, { score: 2 }, { score: 2 }])).toBe(100);
    expect(overallScore([])).toBe(0);
  });

  it("truncates long explanations", () => {
    const long = Array.from({ length: 80 }, () => "word").join(" ");
    expect(truncateWords(long, 60).split(" ")).toHaveLength(60);
    expect(truncateWords("short text", 60)).toBe("short text");
  });
});

describe("finalizeGrade", () => {
  const questions = [Q("q1", 1, 3), Q("q2", 4, 6), Q("q3", 7, 9)];
  const llm: LlmGrade = {
    results: [
      { id: "q1", score: 2, verdict: "Nailed it", feedback: "f", missed: [] },
      { id: "q2", score: 1, verdict: "Half", feedback: "f", missed: ["point b"] },
      { id: "q3", score: 2, verdict: "Model says great", feedback: "f", missed: [] },
    ],
    lessons: [{ questionId: "q2", title: "T", explanation: "E", agentPrompt: "P" }],
    headline: "",
  };

  it("forces skipped answers to 0 and adds lessons for every non-green question", () => {
    const out = finalizeGrade(
      questions,
      [
        { id: "q1", text: "good" },
        { id: "q2", text: "partial" },
        { id: "q3", text: "", skipped: true },
      ],
      llm,
    );
    expect(out.results.map((r) => r.score)).toEqual([2, 1, 0]);
    expect(out.results[2].verdict).toBe("Honest skip");
    expect(out.lessons.map((l) => l.questionId)).toEqual(["q2", "q3"]);
    expect(out.lessons[1].agentPrompt).toContain("lines 7–9");
    expect(out.overall.score).toBe(50);
    expect(out.overall.headline.length).toBeGreaterThan(0);
  });

  it("scores missing model results as 0", () => {
    const out = finalizeGrade(questions, questions.map((q) => ({ id: q.id, text: "x" })), { ...llm, results: [] });
    expect(out.results.every((r) => r.score === 0)).toBe(true);
  });
});

describe("computeHeatmap", () => {
  it("colors covered lines, takes the min on overlap and leaves others null", () => {
    const map = computeHeatmap(
      [
        { id: "q1", lineStart: 1, lineEnd: 2 },
        { id: "q2", lineStart: 2, lineEnd: 3 },
      ],
      [
        { id: "q1", score: 2 },
        { id: "q2", score: 0 },
      ],
      5,
    );
    expect(map).toEqual([2, 0, 0, null, null]);
  });
});
