import { z } from "zod";

export const MAX_LINES = 300;
export const MAX_CHARS = 12_000;
export const MAX_ANSWER_CHARS = 2_000;

export const QUESTION_TYPES = ["predict", "explain", "what_if"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/* ---------- /api/quiz ---------- */

export const QuizRequestSchema = z.object({
  code: z
    .string()
    .refine((s) => s.trim().length > 0, "Paste some code first.")
    .refine((s) => s.length <= MAX_CHARS, `Code must be ${MAX_CHARS.toLocaleString()} characters or fewer.`)
    .refine((s) => s.split("\n").length <= MAX_LINES, `Code must be ${MAX_LINES} lines or fewer.`),
  intent: z.string().max(500).optional(),
  language: z.string().max(40).optional(),
});
export type QuizRequest = z.infer<typeof QuizRequestSchema>;

/** What the model returns (and what the server keeps privately). */
export const LlmQuestionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  prompt: z.string().min(1),
  lineStart: z.number(),
  lineEnd: z.number(),
  concept: z.string().min(1),
  rubric: z.array(z.string().min(1)).min(1).max(4),
});
export const LlmQuizSchema = z.object({
  summary: z.string(),
  language: z.string(),
  questions: z.array(LlmQuestionSchema).min(3),
});
export type LlmQuiz = z.infer<typeof LlmQuizSchema>;

export type PrivateQuestion = z.infer<typeof LlmQuestionSchema> & { id: string };

/** Public question shape sent to the browser. No rubric. */
export type PublicQuestion = Omit<PrivateQuestion, "rubric">;

export type QuizResponse = {
  summary: string;
  language: string;
  questions: PublicQuestion[];
  quizToken: string;
  mode: "live" | "demo";
};

/* ---------- /api/grade ---------- */

export const GradeRequestSchema = z.object({
  quizToken: z.string().min(10),
  answers: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().max(MAX_ANSWER_CHARS),
        skipped: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(5),
});
export type GradeRequest = z.infer<typeof GradeRequestSchema>;

export const ResultSchema = z.object({
  id: z.string(),
  score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  verdict: z.string(),
  feedback: z.string(),
  missed: z.array(z.string()),
});
export const LessonSchema = z.object({
  questionId: z.string(),
  title: z.string(),
  explanation: z.string(),
  agentPrompt: z.string(),
});
export const LlmGradeSchema = z.object({
  results: z.array(ResultSchema),
  lessons: z.array(LessonSchema),
  headline: z.string(),
});
export type LlmGrade = z.infer<typeof LlmGradeSchema>;

export type QuestionResult = z.infer<typeof ResultSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

export type GradeResponse = {
  results: QuestionResult[];
  lessons: Lesson[];
  overall: { score: number; headline: string };
  mode: "live" | "demo";
};

/** Contents of the encrypted quiz token. */
export type QuizTokenPayload = {
  v: 1;
  exp: number;
  code: string;
  intent?: string;
  language: string;
  questions: PrivateQuestion[];
};

export type ApiError = { error: string; code: "bad_request" | "timeout" | "llm_error" | "bad_token" | "rate_limited" };
