"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SCORE_META = {
  2: { label: "Own it", text: "text-[var(--tb-green)]", bg: "bg-[var(--tb-green)]", ring: "ring-[var(--tb-green)]/40", soft: "bg-[var(--tb-green)]/10" },
  1: { label: "Shaky", text: "text-[var(--tb-amber)]", bg: "bg-[var(--tb-amber)]", ring: "ring-[var(--tb-amber)]/40", soft: "bg-[var(--tb-amber)]/10" },
  0: { label: "Gap", text: "text-[var(--tb-red)]", bg: "bg-[var(--tb-red)]", ring: "ring-[var(--tb-red)]/40", soft: "bg-[var(--tb-red)]/10" },
} as const;

export function scoreColorVar(score: number): string {
  if (score >= 75) return "var(--tb-green)";
  if (score >= 40) return "var(--tb-amber)";
  return "var(--tb-red)";
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid size-8 grid-cols-2 gap-0.5 rounded-lg bg-white/5 p-1.5 ring-1 ring-white/10">
        <span className="rounded-[2px] bg-[var(--tb-green)]" />
        <span className="rounded-[2px] bg-[var(--tb-green)]" />
        <span className="rounded-[2px] bg-[var(--tb-amber)]" />
        <span className="rounded-[2px] bg-[var(--tb-red)]" />
      </div>
      <span className="text-lg font-semibold tracking-tight">Teachback</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "tb-rise flex items-start gap-3 rounded-lg border border-[var(--tb-red)]/30 bg-[var(--tb-red)]/10 p-3 text-sm",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--tb-red)]" />
      <p className="flex-1 text-foreground/90">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
          <RotateCcw /> Retry
        </Button>
      )}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  );
}

export function DemoModeNote() {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-[var(--tb-amber)]">Demo mode</span>: no <code>GEMINI_API_KEY</code> set, so questions and
      grading use built-in examples and keyword matching.
    </p>
  );
}
