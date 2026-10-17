"use client";

import { ArrowLeft, ArrowRight, CheckCheck, HelpCircle, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { QuizResponse } from "@/lib/types";
import { CodeEditor, fitHeight } from "./code-editor";
import { DemoModeNote, ErrorBanner, Kbd } from "./shared";

export type Answer = { text: string; skipped: boolean };

const TYPE_LABEL = { predict: "Predict", explain: "Explain", what_if: "What if" } as const;

type Props = {
  code: string;
  language: string;
  quiz: QuizResponse;
  index: number;
  answers: Record<string, Answer>;
  onAnswerChange: (id: string, text: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  grading: boolean;
  error: { message: string; retry?: () => void } | null;
};

export function QuizScreen(p: Props) {
  const q = p.quiz.questions[p.index];
  const total = p.quiz.questions.length;
  const isLast = p.index === total - 1;
  const answer = p.answers[q.id]?.text ?? "";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [p.index]);

  const lineLabel = q.lineStart === q.lineEnd ? `Line ${q.lineStart}` : `Lines ${q.lineStart}–${q.lineEnd}`;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px]">
      <div className="tb-rise flex flex-col gap-2">
        <div className="overflow-hidden rounded-xl ring-1 ring-white/10 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0c0f16] px-3 py-2 text-xs text-muted-foreground">
            <span className="truncate">{p.quiz.summary}</span>
            <span className="ml-3 shrink-0 rounded bg-[var(--tb-focus)]/15 px-2 py-0.5 font-medium text-[var(--tb-focus)]">
              {lineLabel}
            </span>
          </div>
          <div className="bg-[#0c0f16]" style={{ height: fitHeight(p.code) }}>
            <CodeEditor value={p.code} language={p.language} readOnly focus={{ start: q.lineStart, end: q.lineEnd }} />
          </div>
        </div>
        {p.quiz.mode === "demo" && (
          <div className="px-1">
            <DemoModeNote />
          </div>
        )}
      </div>

      <Card className="tb-rise h-fit" style={{ animationDelay: "80ms" }}>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Question {p.index + 1} of {total}
              </span>
              <span>{Math.round((p.index / total) * 100)}% done</span>
            </div>
            <Progress value={((p.index + (p.grading ? 1 : 0)) / total) * 100} />
          </div>

          {p.grading ? (
            <GradingState />
          ) : (
            <div key={q.id} className="tb-rise flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{TYPE_LABEL[q.type]}</Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {q.concept}
                </Badge>
              </div>
              <h2 className="text-lg leading-snug font-medium text-pretty">{renderInlineCode(q.prompt)}</h2>
              <div className="flex flex-col gap-2">
                <label htmlFor="answer" className="sr-only">
                  Your answer
                </label>
                <Textarea
                  id="answer"
                  ref={textareaRef}
                  value={answer}
                  maxLength={2000}
                  onChange={(e) => p.onAnswerChange(q.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && answer.trim()) {
                      e.preventDefault();
                      p.onNext();
                    }
                  }}
                  placeholder="Explain it in your own words, like you're teaching a friend…"
                  className="min-h-36 resize-y text-[15px] leading-relaxed"
                />
                <p className="text-xs text-muted-foreground">
                  1–3 sentences is plenty. <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> to continue.
                </p>
              </div>

              {p.error && <ErrorBanner message={p.error.message} onRetry={p.error.retry} />}

              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={p.onBack} disabled={p.index === 0}>
                  <ArrowLeft /> Back
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={p.onSkip}>
                    <HelpCircle /> Skip – I don&apos;t know
                  </Button>
                  <Button onClick={p.onNext} disabled={!answer.trim()}>
                    {isLast ? (
                      <>
                        Grade me <CheckCheck />
                      </>
                    ) : (
                      <>
                        Next <ArrowRight />
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Skipping scores 0, and that&apos;s fine. An honest &ldquo;I don&apos;t know&rdquo; is worth more than a lucky guess.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GradingState() {
  return (
    <div className="flex flex-col gap-4 py-2" aria-live="polite">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin text-[var(--tb-focus)]" />
        Grading your answers and writing lessons…
      </div>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/** Render `backtick` spans as inline code. */
export function renderInlineCode(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}
