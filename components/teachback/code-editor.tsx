"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { LineScore } from "@/lib/quiz";

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

export type LineRange = { start: number; end: number };

type Props = {
  value: string;
  onChange?: (value: string) => void;
  language: string;
  readOnly?: boolean;
  /** Lines to glow (the current question). */
  focus?: LineRange | null;
  /** Per-line score for the results heatmap. */
  heatmap?: LineScore[] | null;
  /** Fired on ⌘/Ctrl+Enter inside the editor. */
  onSubmit?: () => void;
  height?: string | number;
};

const HEAT_CLASS: Record<0 | 1 | 2, string> = { 0: "tb-heat-red", 1: "tb-heat-amber", 2: "tb-heat-green" };

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("teachback", {
    base: "vs-dark",
    inherit: true,
    rules: [{ token: "comment", foreground: "6b7280", fontStyle: "italic" }],
    colors: {
      "editor.background": "#0c0f16",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorLineNumber.foreground": "#4b5563",
      "editorLineNumber.activeForeground": "#9ca3af",
      "editorGutter.background": "#0c0f16",
    },
  });
};

function decorate(
  editor: MonacoEditor,
  monaco: Monaco,
  oldIds: string[],
  focusStart: number,
  focusEnd: number,
  heatmap: LineScore[] | null | undefined,
): string[] {
  const decorations: Parameters<MonacoEditor["deltaDecorations"]>[1] = [];

  heatmap?.forEach((score, i) => {
    if (score === null) return;
    decorations.push({
      range: new monaco.Range(i + 1, 1, i + 1, 1),
      options: { isWholeLine: true, className: HEAT_CLASS[score], linesDecorationsClassName: `${HEAT_CLASS[score]}-bar` },
    });
  });

  if (focusStart > 0) {
    decorations.push({
      range: new monaco.Range(focusStart, 1, focusEnd, 1),
      options: { isWholeLine: true, className: "tb-focus", linesDecorationsClassName: "tb-focus-bar" },
    });
    editor.revealLinesInCenterIfOutsideViewport(focusStart, focusEnd, monaco.editor.ScrollType.Smooth);
  }

  return editor.deltaDecorations(oldIds, decorations);
}

/** Height that fits the code without scrolling, within sensible bounds. */
export function fitHeight(code: string, min = 320, max = 640): number {
  return Math.min(max, Math.max(min, code.split("\n").length * 22 + 36));
}

export function CodeEditor({ value, onChange, language, readOnly, focus, heatmap, onSubmit, height = "100%" }: Props) {
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationIds = useRef<string[]>([]);
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    submitRef.current = onSubmit;
  }, [onSubmit]);

  const focusStart = focus?.start ?? 0;
  const focusEnd = focus?.end ?? 0;

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    decorationIds.current = decorate(editorRef.current, monacoRef.current, decorationIds.current, focusStart, focusEnd, heatmap);
  }, [focusStart, focusEnd, heatmap]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => submitRef.current?.());
    decorationIds.current = decorate(editor, monaco, decorationIds.current, focusStart, focusEnd, heatmap);
    if (!readOnly) editor.focus();
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme="teachback"
      beforeMount={defineTheme}
      onMount={handleMount}
      onChange={(v) => onChange?.(v ?? "")}
      loading={<EditorSkeleton />}
      options={{
        readOnly,
        domReadOnly: readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineHeight: 22,
        fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, Consolas, monospace",
        scrollBeyondLastLine: false,
        padding: { top: 14, bottom: 14 },
        renderLineHighlight: readOnly ? "none" : "line",
        lineDecorationsWidth: 10,
        glyphMargin: false,
        folding: false,
        stickyScroll: { enabled: false },
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
        smoothScrolling: true,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-3 bg-[#0c0f16] p-5">
      {[72, 54, 88, 40, 66, 80, 30, 58].map((w, i) => (
        <Skeleton key={i} className="h-3.5 bg-white/5" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
