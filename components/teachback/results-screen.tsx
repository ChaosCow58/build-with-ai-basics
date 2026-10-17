"use client";

import { Check, ClipboardCopy, GraduationCap, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { computeHeatmap } from "@/lib/quiz";
import type { GradeResponse, QuizResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CodeEditor, fitHeight } from "./code-editor";
import type { Answer } from "./quiz-screen";
import { renderInlineCode } from "./quiz-screen";
import { DemoModeNote, SCORE_META, scoreColorVar } from "./shared";

type Props = {
  code: string;
  language: string;
  quiz: QuizResponse;
  grade: GradeResponse;
  answers: Record<string, Answer>;
  onNewSnippet: () => void;
  onRetake: () => void;
};

export function ResultsScreen(p: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const totalLines = p.code.split("\n").length;
  const heatmap = useMemo(
    () => computeHeatmap(p.quiz.questions, p.grade.results, totalLines),
    [p.quiz.questions, p.grade.results, totalLines],
  );
  const selectedQ = p.quiz.questions.find((q) => q.id === selected);
  const counts = [2, 1, 0].map((s) => p.grade.results.filter((r) => r.score === s).length);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-16 sm:px-6">
      <section className="tb-rise mb-6 flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:p-8">
        <ScoreRing score={p.grade.overall.score} />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Ownership score</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{p.grade.overall.headline}</h1>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {([2, 1, 0] as const).map((s, i) => (
              <span
                key={s}
                className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1", SCORE_META[s].soft, SCORE_META[s].ring)}
              >
                <span className={cn("size-2 rounded-full", SCORE_META[s].bg)} />
                {counts[i]} {SCORE_META[s].label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <Button onClick={p.onNewSnippet}>
            <Plus /> New snippet
          </Button>
          <Button variant="outline" onClick={p.onRetake}>
            <RotateCcw /> Quiz me again
          </Button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="tb-rise flex flex-col gap-2 lg:sticky lg:top-20 lg:h-fit" style={{ animationDelay: "80ms" }}>
          <div className="overflow-hidden rounded-xl ring-1 ring-white/10 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#0c0f16] px-3 py-2 text-xs text-muted-foreground">
              <span>Comprehension heatmap</span>
              <span className="flex items-center gap-3">
                {([2, 1, 0] as const).map((s) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-sm", SCORE_META[s].bg)} /> {SCORE_META[s].label}
                  </span>
                ))}
              </span>
            </div>
            <div className="bg-[#0c0f16]" style={{ height: fitHeight(p.code) }}>
              <CodeEditor
                value={p.code}
                language={p.language}
                readOnly
                heatmap={heatmap}
                focus={selectedQ ? { start: selectedQ.lineStart, end: selectedQ.lineEnd } : null}
              />
            </div>
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Lines are colored by how well you explained them. Uncolored lines weren&apos;t quizzed. Click a card to find its lines.
          </p>
          {p.grade.mode === "demo" && (
            <div className="px-1">
              <DemoModeNote />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {p.quiz.questions.map((q, i) => {
            const r = p.grade.results.find((x) => x.id === q.id);
            if (!r) return null;
            const lesson = p.grade.lessons.find((l) => l.questionId === q.id);
            const meta = SCORE_META[r.score];
            const a = p.answers[q.id];
            return (
              <Card
                key={q.id}
                onClick={() => setSelected(selected === q.id ? null : q.id)}
                className={cn(
                  "tb-rise cursor-pointer border-l-4 transition hover:ring-white/20",
                  r.score === 2 && "border-l-[var(--tb-green)]",
                  r.score === 1 && "border-l-[var(--tb-amber)]",
                  r.score === 0 && "border-l-[var(--tb-red)]",
                  selected === q.id && "ring-2 ring-[var(--tb-focus)]/60",
                )}
                style={{ animationDelay: `${140 + i * 90}ms` }}
              >
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      Q{i + 1} · {q.lineStart === q.lineEnd ? `line ${q.lineStart}` : `lines ${q.lineStart}–${q.lineEnd}`} · {q.concept}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 font-medium", meta.soft, meta.text)}>
                      {r.verdict} · {r.score}/2
                    </span>
                  </div>
                  <p className="text-sm font-medium text-pretty">{renderInlineCode(q.prompt)}</p>
                  <div className="rounded-md bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground">
                    <span className="mr-1 text-xs font-medium tracking-wide uppercase">You said:</span>
                    {a?.skipped || !a?.text.trim() ? <em>I don&apos;t know (skipped)</em> : a.text}
                  </div>
                  <p className="text-sm">{r.feedback}</p>
                  {r.missed.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">What you missed</p>
                      <ul className="flex flex-col gap-1 text-sm">
                        {r.missed.map((m, j) => (
                          <li key={j} className="flex gap-2">
                            <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", meta.bg)} />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lesson && (
                    <div className="mt-1 rounded-lg border border-white/10 bg-[var(--tb-focus)]/[0.07] p-3">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <GraduationCap className="size-4 text-[var(--tb-focus)]" /> {lesson.title}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{renderInlineCode(lesson.explanation)}</p>
                      <CopyPromptButton prompt={lesson.agentPrompt} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      className="mt-3"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(prompt);
          setCopied(true);
          toast.success("Prompt copied. Paste it into your coding agent.");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Couldn't access the clipboard. Select and copy the prompt manually.");
        }
      }}
      title={prompt}
    >
      {copied ? <Check /> : <ClipboardCopy />}
      {copied ? "Copied" : "Copy prompt for your coding agent"}
    </Button>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = scoreColorVar(score);
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-white/10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <span className="text-4xl font-semibold tabular-nums" style={{ color }}>
            {score}
          </span>
          <span className="block text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
    </div>
  );
}
