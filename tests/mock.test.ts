import { describe, expect, it } from "vitest";
import { mockGrade, mockQuiz, mockScore, pointHit } from "@/lib/mock";
import { countLines, finalizeGrade, normalizeQuiz } from "@/lib/quiz";
import { SAMPLES } from "@/lib/samples";

describe("mockQuiz", () => {
  it("returns hand-written, in-range questions for every sample", () => {
    for (const s of SAMPLES) {
      const quiz = mockQuiz(s.code);
      const total = countLines(s.code);
      expect(quiz.questions).toHaveLength(3);
      for (const q of quiz.questions) {
        expect(q.lineStart).toBeGreaterThanOrEqual(1);
        expect(q.lineEnd).toBeLessThanOrEqual(total);
        expect(q.lineStart).toBeLessThanOrEqual(q.lineEnd);
      }
    }
  });

  it("anchors the debounce timing question to lines 4–9", () => {
    const quiz = mockQuiz(SAMPLES[0].code);
    expect(quiz.questions[0]).toMatchObject({ lineStart: 4, lineEnd: 9 });
  });

  it("matches samples even with CRLF line endings", () => {
    const quiz = mockQuiz(SAMPLES[1].code.replace(/\n/g, "\r\n"));
    expect(quiz.questions[0].concept).toBe("Mutable default argument");
  });

  it("builds 3 non-overlapping heuristic questions for arbitrary code", () => {
    const code = `async function load(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const items = await res.json();
  for (const item of items) {
    item.seen = true;
  }
  return items;
}`;
    const quiz = mockQuiz(code);
    const qs = normalizeQuiz(quiz, countLines(code));
    expect(qs).toHaveLength(3);
    for (let i = 1; i < qs.length; i++) expect(qs[i].lineStart).toBeGreaterThan(qs[i - 1].lineEnd);
  });

  it("handles one-line code", () => {
    const quiz = mockQuiz("x = 1");
    expect(quiz.questions).toHaveLength(3);
  });
});

describe("mock grading", () => {
  it("matches rubric points on key terms, tolerant of wording", () => {
    expect(pointHit("fn runs only once", "It runs once.")).toBe(true);
    expect(pointHit("each call clears the previous timer and starts a new one", "clearTimeout cancels the pending timer")).toBe(true);
    expect(pointHit("fn runs only once", "no idea")).toBe(false);
  });

  it("produces the demo script's green / amber / red flow for the debounce sample", () => {
    const s = SAMPLES[0];
    const qs = normalizeQuiz(mockQuiz(s.code), countLines(s.code));
    const answers = [
      { id: "q1", text: "It runs once, about 250ms after the last keystroke, because clearTimeout cancels the pending timer each time." },
      { id: "q2", text: "The returned function is a closure, so it remembers timer." },
      { id: "q3", text: "", skipped: true },
    ];
    const out = finalizeGrade(qs, answers, mockGrade(s.code, qs, answers));
    expect(out.results.map((r) => r.score)).toEqual([2, 1, 0]);
    expect(out.lessons).toHaveLength(2);
    expect(out.overall.score).toBe(50);
  });

  it("scores empty answers as 0", () => {
    expect(mockScore(["a point"], "   ").score).toBe(0);
  });
});
