"use client";

import { Plus } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiClientError, createQuiz, gradeQuiz } from "@/lib/api-client";
import { detectLanguage } from "@/lib/detect-language";
import {
  clearRecent,
  getRecentServerSnapshot,
  getRecentSnapshot,
  saveRecent,
  subscribeRecent,
  titleFor,
  type RecentAttempt,
} from "@/lib/recent";
import { findSample, type Sample } from "@/lib/samples";
import type { GradeResponse, QuizResponse } from "@/lib/types";
import { PasteScreen, inputProblem } from "./paste-screen";
import { QuizScreen, type Answer } from "./quiz-screen";
import { ResultsScreen } from "./results-screen";
import { Logo } from "./shared";

type Phase = "paste" | "quiz" | "results";
type UiError = { message: string; retry: "quiz" | "grade" } | null;

function errorMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Something unexpected went wrong. Please retry.";
}

export function TeachbackApp() {
  const [phase, setPhase] = useState<Phase>("paste");
  const [code, setCode] = useState("");
  const [intent, setIntent] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [languagePinned, setLanguagePinned] = useState(false);

  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [grade, setGrade] = useState<GradeResponse | null>(null);

  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<UiError>(null);
  const [lastAnswers, setLastAnswers] = useState<Record<string, Answer>>({});
  const recent = useSyncExternalStore(subscribeRecent, getRecentSnapshot, getRecentServerSnapshot);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  const handleCodeChange = (next: string) => {
    setCode(next);
    setError(null);
    if (!languagePinned) setLanguage(detectLanguage(next));
  };

  const startQuiz = async () => {
    if (inputProblem(code)) return;
    setLoadingQuiz(true);
    setError(null);
    try {
      const res = await createQuiz({ code, intent: intent.trim() || undefined, language });
      setQuiz(res);
      setAnswers({});
      setIndex(0);
      setGrade(null);
      setPhase("quiz");
    } catch (err) {
      setPhase("paste");
      setError({ message: errorMessage(err), retry: "quiz" });
    } finally {
      setLoadingQuiz(false);
    }
  };

  const submitGrade = async (finalAnswers: Record<string, Answer>) => {
    if (!quiz) return;
    setLastAnswers(finalAnswers);
    setGrading(true);
    setError(null);
    try {
      const res = await gradeQuiz({
        quizToken: quiz.quizToken,
        answers: quiz.questions.map((q) => ({
          id: q.id,
          text: finalAnswers[q.id]?.text ?? "",
          skipped: finalAnswers[q.id]?.skipped ?? false,
        })),
      });
      setGrade(res);
      setPhase("results");
      saveRecent({ title: findSample(code)?.label ?? titleFor(code), language, score: res.overall.score, code, intent: intent || undefined });
    } catch (err) {
      const expired = err instanceof ApiClientError && err.code === "bad_token";
      setError({ message: errorMessage(err), retry: expired ? "quiz" : "grade" });
    } finally {
      setGrading(false);
    }
  };

  const uiError = error && {
    message: error.message,
    retry: () => void (error.retry === "quiz" ? startQuiz() : submitGrade(lastAnswers)),
  };

  const advance = (nextAnswers: Record<string, Answer>) => {
    if (!quiz) return;
    setError(null);
    if (index < quiz.questions.length - 1) setIndex(index + 1);
    else void submitGrade(nextAnswers);
  };

  const handleSkip = () => {
    if (!quiz) return;
    const id = quiz.questions[index].id;
    const next = { ...answers, [id]: { text: "", skipped: true } };
    setAnswers(next);
    advance(next);
  };

  const goHome = () => {
    setPhase("paste");
    setError(null);
  };

  const newSnippet = () => {
    setCode("");
    setIntent("");
    setLanguagePinned(false);
    setLanguage("javascript");
    setQuiz(null);
    setGrade(null);
    goHome();
  };

  const loadSample = (s: Sample) => {
    setCode(s.code);
    setIntent(s.intent);
    setLanguage(s.language);
    setLanguagePinned(true);
    setError(null);
  };

  const openRecent = (r: RecentAttempt) => {
    setCode(r.code);
    setIntent(r.intent ?? "");
    setLanguage(r.language);
    setLanguagePinned(true);
    setError(null);
    toast("Snippet loaded. Quiz yourself again to see if your score improves.");
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={goHome}
            disabled={grading}
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">Don&apos;t just ship it. Own it.</span>
            {phase !== "paste" && (
              <Button variant="outline" size="sm" onClick={newSnippet} disabled={grading}>
                <Plus /> New snippet
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {phase === "paste" && (
          <PasteScreen
            code={code}
            onCodeChange={handleCodeChange}
            intent={intent}
            onIntentChange={setIntent}
            language={language}
            onLanguageChange={(l) => {
              setLanguage(l);
              setLanguagePinned(true);
            }}
            onLoadSample={loadSample}
            onSubmit={() => void startQuiz()}
            loading={loadingQuiz}
            error={uiError}
            recent={recent}
            onOpenRecent={openRecent}
            onClearRecent={clearRecent}
          />
        )}

        {phase === "quiz" && quiz && (
          <QuizScreen
            code={code}
            language={language}
            quiz={quiz}
            index={index}
            answers={answers}
            onAnswerChange={(id, text) => setAnswers((a) => ({ ...a, [id]: { text, skipped: false } }))}
            onNext={() => advance(answers)}
            onBack={() => {
              setError(null);
              setIndex((i) => Math.max(0, i - 1));
            }}
            onSkip={handleSkip}
            grading={grading}
            error={uiError}
          />
        )}

        {phase === "results" && quiz && grade && (
          <ResultsScreen
            code={code}
            language={language}
            quiz={quiz}
            grade={grade}
            answers={answers}
            onNewSnippet={newSnippet}
            onRetake={() => void startQuiz()}
          />
        )}
      </main>

      <footer className="border-t border-white/5 py-5 text-center text-xs text-muted-foreground">
        Built for Build With AI: Basics · Teachback doesn&apos;t store your code. It&apos;s sent to the AI model only to write and
        grade your quiz.
      </footer>
    </div>
  );
}
