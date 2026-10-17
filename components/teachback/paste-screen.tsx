"use client";

import { ArrowRight, Clock, FileCode2, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "@/lib/detect-language";
import { timeAgo, type RecentAttempt } from "@/lib/recent";
import { SAMPLES, type Sample } from "@/lib/samples";
import { MAX_CHARS, MAX_LINES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./code-editor";
import { ErrorBanner, Kbd, scoreColorVar } from "./shared";

type Props = {
  code: string;
  onCodeChange: (code: string) => void;
  intent: string;
  onIntentChange: (intent: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  onLoadSample: (sample: Sample) => void;
  onSubmit: () => void;
  loading: boolean;
  error: { message: string; retry?: () => void } | null;
  recent: RecentAttempt[];
  onOpenRecent: (attempt: RecentAttempt) => void;
  onClearRecent: () => void;
};

export function inputProblem(code: string): string | null {
  if (!code.trim()) return "empty";
  const lines = code.split("\n").length;
  if (lines > MAX_LINES) return `That's ${lines} lines. Teachback works best on one function or file: trim it to ${MAX_LINES} lines or fewer.`;
  if (code.length > MAX_CHARS) return `That's ${code.length.toLocaleString()} characters. Trim it to ${MAX_CHARS.toLocaleString()} or fewer.`;
  return null;
}

export function PasteScreen(p: Props) {
  const lines = p.code ? p.code.split("\n").length : 0;
  const problem = inputProblem(p.code);
  const tooLong = problem !== null && problem !== "empty";
  const canSubmit = !problem && !p.loading;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
      <section className="tb-rise mx-auto max-w-3xl pt-10 pb-8 text-center sm:pt-14">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-[var(--tb-focus)]" /> The teach-back method, for AI-written code
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Your AI wrote the code. <span className="text-muted-foreground">Can you explain it?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-muted-foreground">
          Paste code your assistant wrote. Answer 3 questions about specific lines. See a heatmap of what you actually own and
          get a lesson, plus a ready-to-paste prompt, for every gap.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="tb-rise flex flex-col gap-2" style={{ animationDelay: "60ms" }}>
          <div className="overflow-hidden rounded-xl ring-1 ring-white/10 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0c0f16] px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileCode2 className="size-4" />
                <span>Paste AI-written code</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="sr-only sm:not-sr-only">Language</span>
                <select
                  value={p.language}
                  onChange={(e) => p.onLanguageChange(e.target.value)}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id} className="bg-neutral-900">
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="relative h-[460px] bg-[#0c0f16]">
              <CodeEditor value={p.code} onChange={p.onCodeChange} language={p.language} onSubmit={() => canSubmit && p.onSubmit()} />
              {!p.code && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-xs text-center text-sm text-muted-foreground">
                    <p className="font-medium text-foreground/80">Paste a function your AI wrote</p>
                    <p className="mt-1">or load a sample on the right. Up to {MAX_LINES} lines.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span className={cn(tooLong && "text-[var(--tb-red)]")}>
              {lines} / {MAX_LINES} lines · {p.code.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
            </span>
            <span className="hidden sm:inline">
              <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> to start
            </span>
          </div>
        </div>

        <aside className="tb-rise flex flex-col gap-5" style={{ animationDelay: "120ms" }}>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="intent" className="text-sm font-medium">
                  What was this code supposed to do? <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  id="intent"
                  value={p.intent}
                  maxLength={500}
                  onChange={(e) => p.onIntentChange(e.target.value)}
                  placeholder="e.g. Only run the search after the user stops typing"
                  className="min-h-20 resize-none"
                />
              </div>
              <Button size="lg" className="h-11 text-base" disabled={!canSubmit} onClick={p.onSubmit}>
                {p.loading ? (
                  <>
                    <Loader2 className="animate-spin" /> Reading your code…
                  </>
                ) : (
                  <>
                    Quiz me <ArrowRight />
                  </>
                )}
              </Button>
              {tooLong && <ErrorBanner message={problem!} />}
              {p.error && <ErrorBanner message={p.error.message} onRetry={p.error.retry} />}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Try a sample</CardTitle>
              <CardDescription>Real AI-style code with a classic trap inside.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => p.onLoadSample(s)}
                  disabled={p.loading}
                  className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.blurb.replace(/`/g, "")}</span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" /> Recent attempts
              </CardTitle>
              {p.recent.length > 0 && (
                <Button variant="ghost" size="icon-sm" onClick={p.onClearRecent} aria-label="Clear recent attempts">
                  <Trash2 />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {p.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Your last 5 quizzes show up here. They stay in this browser.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {p.recent.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => p.onOpenRecent(r)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-white/5"
                      >
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-md text-xs font-semibold tabular-nums ring-1 ring-white/10"
                          style={{ color: scoreColorVar(r.score), background: `color-mix(in oklch, ${scoreColorVar(r.score)} 12%, transparent)` }}
                        >
                          {r.score}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-xs">{r.title}</span>
                          <span className="block text-xs text-muted-foreground">{timeAgo(r.at)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
