import { agentPromptFor, defaultHeadline, overallScore, truncateWords } from "./quiz";
import { findSample, type Sample } from "./samples";
import type { GradeRequest, Lesson, LlmGrade, LlmQuiz, PrivateQuestion, QuestionResult } from "./types";

/**
 * Demo mode: used when GEMINI_API_KEY is not set, so the app runs end to end
 * with no account. Sample snippets get hand-written quizzes; any other code gets
 * heuristic questions. Grading is keyword overlap against the rubric.
 */

type CannedQuestion = LlmQuiz["questions"][number] & { lesson: { title: string; explanation: string } };
type CannedQuiz = { summary: string; language: string; questions: CannedQuestion[] };

const CANNED: Record<Sample["id"], CannedQuiz> = {
  "js-debounce": {
    summary: "Debounces a search handler so it runs only after the user stops typing for 250ms.",
    language: "javascript",
    questions: [
      {
        type: "predict",
        prompt: "The input event fires 3 times within 100ms. How many times does `fn` run, and when?",
        lineStart: 4,
        lineEnd: 9,
        concept: "Debounce timing",
        rubric: [
          "fn runs only once",
          "it runs about 250ms after the last event",
          "each call clears the previous timer and starts a new one",
        ],
        lesson: {
          title: "Every call resets the clock",
          explanation:
            "Each event calls clearTimeout(timer) and schedules a fresh 250ms timer. Three quick events cancel the first two timers, so fn runs exactly once, 250ms after the last keystroke. That's the whole point of debounce: wait for a pause.",
        },
      },
      {
        type: "explain",
        prompt:
          "Every call to `debouncedRun` sees the same `timer` variable. Why? What would break if `let timer` moved inside the returned function?",
        lineStart: 2,
        lineEnd: 5,
        concept: "Closures and shared state",
        rubric: [
          "the returned function is a closure that captures timer from debounce's scope",
          "one timer exists per debounce() call and is shared across keystrokes",
          "if moved inside, each call gets a fresh timer so clearTimeout cancels nothing and fn runs every time",
        ],
        lesson: {
          title: "Closures remember their birthplace",
          explanation:
            "debounce runs once, creating one `timer`. The returned function keeps a live reference to it, even after debounce returns. Every keystroke shares that variable, which is how a new call can cancel the old timeout. Move `let timer` inside and each call gets its own, so nothing is ever cancelled.",
        },
      },
      {
        type: "what_if",
        prompt: "When `search.run` finally executes, what does `this.query` evaluate to, and why?",
        lineStart: 21,
        lineEnd: 25,
        concept: "`this` binding",
        rubric: [
          "this is not the search object, so this.query is undefined (or throws in strict mode)",
          "passing search.run detaches the method from search; debouncedRun() is called with no receiver",
          "fix with search.run.bind(search) or an arrow wrapper () => search.run()",
        ],
        lesson: {
          title: "Methods forget their object when passed around",
          explanation:
            "`debounce(search.run, 250)` passes just the function, not the object. Later debouncedRun() is called plainly, so `this` is undefined (or window), and apply forwards that. Result: this.query is undefined. Bind it: debounce(search.run.bind(search), 250), or pass () => search.run().",
        },
      },
    ],
  },
  "py-memo": {
    summary: "Counts grid paths with a memoized recursive walk, and computes Fibonacci with lru_cache.",
    language: "python",
    questions: [
      {
        type: "predict",
        prompt: "Look at the `memo={}` default on line 3. What does line 27 actually print, and why?",
        lineStart: 3,
        lineEnd: 3,
        concept: "Mutable default argument",
        rubric: [
          "it prints 2 instead of the correct answer 1",
          "the default dict is created once and shared across every call",
          "the stale (0, 0) entry from the first grid is reused",
        ],
        lesson: {
          title: "Default values are created once",
          explanation:
            "Python evaluates `memo={}` once, when the function is defined. Every call that doesn't pass memo shares that same dict. The first grid stores memo[(0, 0)] = 2, so the second call finds it immediately and returns 2 instead of 1. Use memo=None, then create a fresh dict inside.",
        },
      },
      {
        type: "explain",
        prompt: "Why do the checks on lines 9–12 come before the memo lookup, and what does the memo save on line 15?",
        lineStart: 9,
        lineEnd: 16,
        concept: "Base cases and memoization",
        rubric: [
          "base cases stop the recursion at walls, the edge of the grid, and the goal",
          "the bounds check prevents indexing outside the grid",
          "the memo stores each cell's result so overlapping subproblems are computed once instead of exponentially",
        ],
        lesson: {
          title: "Stop first, then remember",
          explanation:
            "walk() first rejects cells off the grid or on walls (so grid[r][c] never goes out of bounds), then returns 1 at the goal. Only real cells reach the memo. Many paths reach the same cell, so caching memo[(r, c)] turns an exponential search into one computation per cell.",
        },
      },
      {
        type: "what_if",
        prompt: "What would happen when calling `fib(80)` if you removed `@lru_cache`?",
        lineStart: 21,
        lineEnd: 23,
        concept: "Exponential recursion",
        rubric: [
          "it would effectively never finish because the number of calls grows exponentially",
          "fib recomputes the same smaller values over and over",
          "lru_cache stores each result so each n is computed once, making it linear",
        ],
        lesson: {
          title: "Two branches per call adds up fast",
          explanation:
            "Without caching, fib(80) calls fib(79) and fib(78), each splitting again, recomputing the same values trillions of times. That's roughly 2^55 calls: it wouldn't finish today. lru_cache remembers each fib(n), so there are only 81 distinct calls.",
        },
      },
    ],
  },
  "cs-async": {
    summary: "Loads non-cancelled orders, groups them into per-customer totals, and returns the top spenders with names.",
    language: "csharp",
    questions: [
      {
        type: "explain",
        prompt: "Where does the filter on line 4 run, in the database or in memory? What does `await … ToListAsync()` do?",
        lineStart: 3,
        lineEnd: 5,
        concept: "IQueryable and await",
        rubric: [
          "the Where is translated to SQL and runs in the database",
          "ToListAsync executes the query and loads the results into a list in memory",
          "await frees the thread while waiting instead of blocking it",
        ],
        lesson: {
          title: "IQueryable builds SQL, ToListAsync runs it",
          explanation:
            "_db.Orders is an IQueryable, so .Where becomes a SQL WHERE clause and runs in the database. Nothing executes until ToListAsync(), which sends the query and materializes rows into a List. await releases the thread while the database works, so the server can handle other requests.",
        },
      },
      {
        type: "predict",
        prompt:
          "`summaries` is built on lines 7–15 and enumerated twice (lines 17 and 22). What will `Name` be on the objects returned at line 22, and why?",
        lineStart: 7,
        lineEnd: 15,
        concept: "Deferred execution",
        rubric: [
          "Name will be null on the returned objects",
          "the LINQ query is deferred, so enumerating it again re-runs Select and creates new OrderSummary objects",
          "fix by materializing with ToList() before the loop",
        ],
        lesson: {
          title: "LINQ queries are recipes, not results",
          explanation:
            "summaries is a deferred query. The foreach on line 17 runs it and sets Name on those objects. Line 22 runs the recipe again, building brand-new OrderSummary objects, so Name is null. Add .ToList() after OrderByDescending so both loops share the same objects.",
        },
      },
      {
        type: "what_if",
        prompt: "The loop awaits `GetNameAsync` one customer at a time. What changes if you rewrite it with `Task.WhenAll`?",
        lineStart: 17,
        lineEnd: 20,
        concept: "Sequential vs concurrent awaits",
        rubric: [
          "the lookups run concurrently instead of one after another",
          "total time becomes roughly the slowest call instead of the sum of all calls",
          "watch for shared resources like a DbContext that isn't thread-safe",
        ],
        lesson: {
          title: "await in a loop means one at a time",
          explanation:
            "Each await waits for the previous name before starting the next, so 5 lookups at 100ms take about 500ms. Starting all tasks and awaiting Task.WhenAll runs them together: about 100ms total. But a shared DbContext can't run concurrent queries, so check what GetNameAsync uses.",
        },
      },
    ],
  },
};

/* ---------------- quiz ---------------- */

type Detector = {
  test: RegExp;
  build: (start: number, end: number) => Omit<LlmQuiz["questions"][number], "lineStart" | "lineEnd">;
};

const DETECTORS: Detector[] = [
  {
    test: /\b(async|await|Promise|setTimeout|Task<|\.then\()/,
    build: (s, e) => ({
      type: "predict",
      prompt: `Walk through lines ${s}–${e}: in what order do things happen here, and what is the code waiting on?`,
      concept: "Async control flow",
      rubric: [
        "names what is awaited or scheduled to run later",
        "describes the order in which the steps execute",
        "says what happens if the awaited work fails or is slow",
      ],
    }),
  },
  {
    test: /(\/[^/\s]+\/[gimsuy]*\.test|new RegExp|re\.(compile|match|search|sub)|Regex\()/,
    build: (s) => ({
      type: "explain",
      prompt: `What does the pattern on line ${s} match? Give one string that matches and one that doesn't.`,
      concept: "Regular expression",
      rubric: ["describes what the pattern matches", "gives a matching example", "gives a non-matching example"],
    }),
  },
  {
    test: /^\s*(for|while|foreach)\b|\.forEach\(|\.map\(|\.reduce\(/,
    build: (s, e) => ({
      type: "predict",
      prompt: `Trace the loop on lines ${s}–${e}: what changes on each pass, and when does it stop?`,
      concept: "Loop behavior",
      rubric: [
        "what changes on each iteration",
        "the stopping condition of the loop",
        "the final value or result after the loop ends",
      ],
    }),
  },
  {
    test: /\bif\b.*(<=|>=|===?|!==?|<|>|null|None|undefined|length|len\(|empty)/,
    build: (s, e) => ({
      type: "what_if",
      prompt: `What happens on lines ${s}–${e} when the input is empty, missing, or exactly at the boundary?`,
      concept: "Edge cases",
      rubric: [
        "identifies the boundary or edge case being checked",
        "what the code does in that case",
        "what would break without the check",
      ],
    }),
  },
  {
    test: /\b(function|def|func|fn)\b|=>|\b(public|private|static)\b.*\(/,
    build: (s, e) => ({
      type: "explain",
      prompt: `In your own words, what does the code on lines ${s}–${e} take in, and what does it give back?`,
      concept: "Inputs and outputs",
      rubric: [
        "the inputs or parameters it uses",
        "what value it returns or produces",
        "any side effects or outside variables it changes",
      ],
    }),
  },
];

function genericQuestion(s: number, e: number): Omit<LlmQuiz["questions"][number], "lineStart" | "lineEnd"> {
  return {
    type: "explain",
    prompt: `Explain what lines ${s}–${e} do and why they're needed.`,
    concept: "Purpose of this block",
    rubric: ["what the lines do step by step", "why the code needs them", "what would break if they were removed"],
  };
}

export function mockQuiz(code: string): LlmQuiz {
  const sample = findSample(code);
  if (sample) {
    const c = CANNED[sample.id];
    return { summary: c.summary, language: c.language, questions: c.questions.map(({ lesson: _l, ...q }) => q) };
  }

  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const total = lines.length;
  const taken: [number, number][] = [];
  const questions: LlmQuiz["questions"] = [];
  const overlaps = (a: number, b: number) => taken.some(([x, y]) => a <= y && b >= x);

  for (const d of DETECTORS) {
    if (questions.length >= 3) break;
    const idx = lines.findIndex((l, i) => d.test.test(l) && !overlaps(i + 1, i + 1));
    if (idx === -1) continue;
    const s = idx + 1;
    let e = Math.min(total, s + 3);
    while (e > s && overlaps(s, e)) e--;
    taken.push([s, e]);
    questions.push({ ...d.build(s, e), lineStart: s, lineEnd: e });
  }

  // Fill any remaining slots with evenly spaced chunks of non-blank code.
  for (let k = 0; questions.length < 3 && k < total; k++) {
    const s = Math.min(total, 1 + Math.floor((k * total) / 3));
    if (!lines[s - 1]?.trim() || overlaps(s, s)) continue;
    let e = Math.min(total, s + 2);
    while (e > s && overlaps(s, e)) e--;
    taken.push([s, e]);
    questions.push({ ...genericQuestion(s, e), lineStart: s, lineEnd: e });
  }
  while (questions.length < 3) {
    questions.push({ ...genericQuestion(1, Math.min(total, 3)), lineStart: 1, lineEnd: Math.min(total, 3) });
  }

  questions.sort((a, b) => a.lineStart - b.lineStart);
  return {
    summary: `A ${total}-line snippet. (Demo mode: questions are generated by heuristics. Add a GEMINI_API_KEY for AI-written questions.)`,
    language: "plaintext",
    questions,
  };
}

/* ---------------- grading ---------------- */

const STOPWORDS = new Set(
  "the a an and or of to in on is it its be are was for so by at as if with that this than then from into each every one new when what which there their they not no does do can will would about instead".split(
    " ",
  ),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_^\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function keyTerms(point: string): string[] {
  return [...new Set(tokens(point).filter((t) => t.length > 2 && !STOPWORDS.has(t)))];
}

/** A rubric point is "hit" if the answer mentions enough of its key terms (prefix match handles plurals/tenses). */
export function pointHit(point: string, answer: string): boolean {
  const terms = keyTerms(point);
  if (terms.length === 0) return false;
  const ans = tokens(answer);
  const matches = terms.filter((t) => {
    const stem = t.slice(0, Math.max(3, Math.min(5, t.length)));
    return ans.some((a) => a.startsWith(stem) || (a.length >= 4 && t.startsWith(a)));
  }).length;
  return matches / terms.length >= 0.4;
}

export function mockScore(rubric: string[], answer: string): { score: 0 | 1 | 2; missed: string[] } {
  if (!answer.trim()) return { score: 0, missed: rubric };
  const missed = rubric.filter((p) => !pointHit(p, answer));
  const hits = rubric.length - missed.length;
  const score: 0 | 1 | 2 = hits * 3 >= rubric.length * 2 ? 2 : hits > 0 ? 1 : 0;
  return { score, missed: score === 2 ? [] : missed };
}

const VERDICTS = { 2: "Nailed it", 1: "Half there", 0: "Not yet" } as const;
const FEEDBACK = {
  2: "You explained the key ideas in your own words. This part is yours.",
  1: "You're on the right track, but your answer skipped an important piece. Check what you missed below.",
  0: "This answer didn't hit the key ideas yet. Read the lesson below, then try explaining it again.",
} as const;

export function mockGrade(code: string, questions: PrivateQuestion[], answers: GradeRequest["answers"]): LlmGrade {
  const sample = findSample(code);
  const canned = sample ? CANNED[sample.id] : undefined;

  const results: QuestionResult[] = questions.map((q) => {
    const a = answers.find((x) => x.id === q.id);
    const { score, missed } = mockScore(q.rubric, a?.skipped ? "" : (a?.text ?? ""));
    return { id: q.id, score, verdict: VERDICTS[score], feedback: FEEDBACK[score], missed };
  });

  const lessons: Lesson[] = questions.map((q, i) => {
    const c = canned?.questions[i];
    return {
      questionId: q.id,
      title: c?.lesson.title ?? q.concept,
      explanation: c?.lesson.explanation ?? truncateWords(`A strong answer covers: ${q.rubric.join("; ")}.`, 60),
      agentPrompt: agentPromptFor(q),
    };
  });

  return { results, lessons, headline: defaultHeadline(overallScore(results)) };
}
