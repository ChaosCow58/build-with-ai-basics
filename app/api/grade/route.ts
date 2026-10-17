import { jsonError, llmErrorResponse } from "@/lib/api-errors";
import { generateJson, isLlmConfigured } from "@/lib/llm";
import { mockGrade } from "@/lib/mock";
import { GRADE_JSON_SCHEMA, GRADE_SYSTEM, gradePrompt } from "@/lib/prompts";
import { finalizeGrade } from "@/lib/quiz";
import { openQuiz } from "@/lib/token";
import { GradeRequestSchema, LlmGradeSchema, type GradeResponse, type LlmGrade } from "@/lib/types";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be JSON.", "bad_request", 400);
  }
  const parsed = GradeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.", "bad_request", 400);
  }

  const quiz = openQuiz(parsed.data.quizToken);
  if (!quiz) {
    return jsonError("This quiz has expired or was tampered with. Start a new one.", "bad_token", 400);
  }

  const { answers } = parsed.data;
  const live = isLlmConfigured();
  const allSkipped = quiz.questions.every((q) => {
    const a = answers.find((x) => x.id === q.id);
    return !a || a.skipped || !a.text.trim();
  });

  let grade: LlmGrade;
  if (live && !allSkipped) {
    try {
      grade = await generateJson({
        system: GRADE_SYSTEM,
        prompt: gradePrompt(quiz.code, quiz.questions, answers, quiz.intent),
        jsonSchema: GRADE_JSON_SCHEMA,
        validate: LlmGradeSchema,
        temperature: 0.2,
      });
    } catch (err) {
      return llmErrorResponse(err);
    }
  } else {
    // Demo mode, or nothing to grade: no need to spend an LLM call.
    grade = mockGrade(quiz.code, quiz.questions, answers);
  }

  const { results, lessons, overall } = finalizeGrade(quiz.questions, answers, grade);
  return Response.json({ results, lessons, overall, mode: live ? "live" : "demo" } satisfies GradeResponse);
}
