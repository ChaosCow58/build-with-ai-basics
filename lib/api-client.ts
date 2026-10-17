import type { ApiError, GradeRequest, GradeResponse, QuizRequest, QuizResponse } from "./types";

const CLIENT_TIMEOUT_MS = 60_000;

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: ApiError["code"] | "network",
  ) {
    super(message);
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw controller.signal.aborted
      ? new ApiClientError("The request timed out. Check your connection and retry.", "timeout")
      : new ApiClientError("Couldn't reach the Teachback server. Is it running?", "network");
  } finally {
    clearTimeout(timer);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiClientError("The server sent an unreadable response. Please retry.", "llm_error");
  }
  if (!res.ok) {
    const err = data as Partial<ApiError>;
    throw new ApiClientError(err.error ?? `Request failed (${res.status}).`, err.code ?? "llm_error");
  }
  return data as T;
}

export const createQuiz = (req: QuizRequest) => post<QuizResponse>("/api/quiz", req);
export const gradeQuiz = (req: GradeRequest) => post<GradeResponse>("/api/grade", req);
