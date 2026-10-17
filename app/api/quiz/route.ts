import { jsonError, llmErrorResponse } from "@/lib/api-errors";
import { generateJson, isLlmConfigured } from "@/lib/llm";
import { mockQuiz } from "@/lib/mock";
import { QUIZ_JSON_SCHEMA, QUIZ_SYSTEM, quizPrompt } from "@/lib/prompts";
import { countLines, normalizeQuiz, toPublic } from "@/lib/quiz";
import { sealQuiz } from "@/lib/token";
import { LlmQuizSchema, QuizRequestSchema, type LlmQuiz, type QuizResponse } from "@/lib/types";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be JSON.", "bad_request", 400);
  }
  const parsed = QuizRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.", "bad_request", 400);
  }

  const code = parsed.data.code.replace(/\r\n/g, "\n");
  const intent = parsed.data.intent?.trim() || undefined;
  const live = isLlmConfigured();

  let quiz: LlmQuiz;
  if (live) {
    try {
      quiz = await generateJson({
        system: QUIZ_SYSTEM,
        prompt: quizPrompt(code, intent),
        jsonSchema: QUIZ_JSON_SCHEMA,
        validate: LlmQuizSchema,
      });
    } catch (err) {
      return llmErrorResponse(err);
    }
  } else {
    quiz = mockQuiz(code);
  }

  const questions = normalizeQuiz(quiz, countLines(code));
  const language = parsed.data.language || quiz.language.toLowerCase();
  const quizToken = sealQuiz({ code, intent, language, questions });

  return Response.json({
    summary: quiz.summary,
    language,
    questions: toPublic(questions),
    quizToken,
    mode: live ? "live" : "demo",
  } satisfies QuizResponse);
}
