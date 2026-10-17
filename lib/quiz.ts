import type {
  GradeRequest,
  Lesson,
  LlmGrade,
  LlmQuiz,
  PrivateQuestion,
  PublicQuestion,
  QuestionResult,
} from "./types";

/** Pure quiz/grading logic shared by the API routes (and unit-tested). */

export function countLines(code: string): number {
  return code.replace(/\r\n/g, "\n").split("\n").length;
}

/** Prefix every line with its number so the model can anchor questions accurately. */
export function numberLines(code: string): string {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const width = String(lines.length).length;
  return lines.map((l, i) => `${String(i + 1).padStart(width, " ")}| ${l}`).join("\n");
}

export function clampRange(start: number, end: number, totalLines: number): [number, number] {
  const max = Math.max(1, totalLines);
  let a = Math.round(Number.isFinite(start) ? start : 1);
  let b = Math.round(Number.isFinite(end) ? end : a);
  if (a > b) [a, b] = [b, a];
  a = Math.min(Math.max(a, 1), max);
  b = Math.min(Math.max(b, 1), max);
  return [a, b];
}

/** Take exactly 3 questions, give them stable ids and clamp every line range to the code. */
export function normalizeQuiz(quiz: LlmQuiz, totalLines: number): PrivateQuestion[] {
  return quiz.questions.slice(0, 3).map((q, i) => {
    const [lineStart, lineEnd] = clampRange(q.lineStart, q.lineEnd, totalLines);
    return {
      id: `q${i + 1}`,
      type: q.type,
      prompt: q.prompt.trim(),
      lineStart,
      lineEnd,
      concept: q.concept.trim(),
      rubric: q.rubric.slice(0, 3),
    };
  });
}

export function toPublic(questions: PrivateQuestion[]): PublicQuestion[] {
  return questions.map(({ rubric: _rubric, ...rest }) => rest);
}

export function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ").replace(/[,;:]$/, "") + "…";
}

export function overallScore(results: Pick<QuestionResult, "score">[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + r.score, 0);
  return Math.round((total / (results.length * 2)) * 100);
}

export function defaultHeadline(score: number): string {
  if (score >= 85) return "You own this code. Ship it with confidence.";
  if (score >= 60) return "Mostly yours, with a gap or two worth closing.";
  if (score >= 30) return "Some of this is borrowed understanding. Close the red gaps first.";
  return "This code works, but it isn't yours yet. Start with the red sections.";
}

export function fallbackLesson(q: PrivateQuestion): Lesson {
  return {
    questionId: q.id,
    title: q.concept,
    explanation: truncateWords(`Key ideas for lines ${q.lineStart}–${q.lineEnd}: ${q.rubric.join("; ")}.`, 60),
    agentPrompt: agentPromptFor(q),
  };
}

export function agentPromptFor(q: Pick<PrivateQuestion, "lineStart" | "lineEnd" | "concept">): string {
  return `In the code you wrote for me, explain lines ${q.lineStart}–${q.lineEnd} step by step, focusing on ${q.concept}. Don't change the code. Use a tiny concrete example with real values, then ask me one question to check I understood.`;
}

/**
 * Merge the model's grading with the questions we actually asked.
 * Guarantees: one result per question in order, skips score 0, scores are 0|1|2,
 * every non-green question has a lesson, explanations ≤ 60 words.
 */
export function finalizeGrade(
  questions: PrivateQuestion[],
  answers: GradeRequest["answers"],
  grade: LlmGrade,
): { results: QuestionResult[]; lessons: Lesson[]; overall: { score: number; headline: string } } {
  const answerById = new Map(answers.map((a) => [a.id, a]));
  const results: QuestionResult[] = questions.map((q) => {
    const a = answerById.get(q.id);
    const skipped = !a || a.skipped || a.text.trim().length === 0;
    const r = grade.results.find((x) => x.id === q.id);
    if (skipped) {
      return {
        id: q.id,
        score: 0,
        verdict: "Honest skip",
        feedback: "You said you didn't know. That's the most useful answer: now you know exactly what to learn.",
        missed: q.rubric,
      };
    }
    if (!r) {
      return { id: q.id, score: 0, verdict: "Not graded", feedback: "We couldn't grade this answer.", missed: q.rubric };
    }
    return { ...r, id: q.id };
  });

  const lessons: Lesson[] = [];
  for (const q of questions) {
    const res = results.find((r) => r.id === q.id)!;
    if (res.score === 2) continue;
    const l = grade.lessons.find((x) => x.questionId === q.id) ?? fallbackLesson(q);
    lessons.push({
      questionId: q.id,
      title: l.title.trim() || q.concept,
      explanation: truncateWords(l.explanation, 60),
      agentPrompt: l.agentPrompt.trim() || agentPromptFor(q),
    });
  }

  const score = overallScore(results);
  const headline = grade.headline?.trim() || defaultHeadline(score);
  return { results, lessons, overall: { score, headline } };
}

export type LineScore = 0 | 1 | 2 | null;

/**
 * Heatmap: each line covered by a question takes that question's score.
 * Overlaps take the lowest score (a gap anywhere is a gap). Uncovered lines stay null.
 */
export function computeHeatmap(
  questions: Pick<PublicQuestion, "id" | "lineStart" | "lineEnd">[],
  results: Pick<QuestionResult, "id" | "score">[],
  totalLines: number,
): LineScore[] {
  const map: LineScore[] = Array.from({ length: totalLines }, () => null);
  for (const q of questions) {
    const r = results.find((x) => x.id === q.id);
    if (!r) continue;
    const [a, b] = clampRange(q.lineStart, q.lineEnd, totalLines);
    for (let line = a; line <= b; line++) {
      const cur = map[line - 1];
      map[line - 1] = cur === null ? r.score : (Math.min(cur, r.score) as 0 | 1 | 2);
    }
  }
  return map;
}
