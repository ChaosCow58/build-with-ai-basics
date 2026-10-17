# Teachback

**Your AI wrote the code. Can you explain it?**

Teachback is a "teach-back" quiz for AI-written code. Paste a function your coding assistant wrote and Teachback asks you 3 questions about specific lines. It grades your answers and then colors the code by how well you understood each part: **green** (you own it), **amber** (shaky) or **red** (gap). Every gap gets a short lesson and a prompt you can copy straight into your coding agent.

The name comes from the teach-back method used in healthcare, where patients explain instructions back in their own words to prove they understood. Teachback does the same thing for code.

| Paste | Quiz | Heatmap |
|---|---|---|
| ![Landing screen](docs/screenshots/landing.png) | ![Quiz screen](docs/screenshots/quiz.png) | ![Results screen](docs/screenshots/results.png) |

## What it does

1. **Paste**: drop in up to 300 lines of code (or load one of 3 samples: a JS debounce with a closure/`this` trap, a Python memoized recursion with a mutable-default trap, and a C# async/LINQ method with a deferred-execution trap). You can add what the code was *supposed* to do.
2. **Quiz**: one question at a time (predict / explain / what-if). The lines each question is about glow in the editor. Answer in your own words, or hit **Skip – I don't know** (an honest skip scores 0).
3. **Results**: an Ownership score (0–100), a one-line headline and a full-code heatmap. Each question gets a card with a verdict, what you missed and a micro-lesson, plus a **Copy prompt for your coding agent** button.
4. **Recent attempts**: your last 5 quizzes are saved in `localStorage` so you can retake them.

## Run it locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local     # optional: add a GEMINI_API_KEY
npm run dev                    # http://localhost:3000
```

**No key? It still works.** Without `GEMINI_API_KEY`, Teachback runs in **demo mode**: the 3 samples use hand-written questions and lessons, other code gets heuristic questions, and grading uses keyword matching against the rubric. A "Demo mode" note shows in the UI.

**Live mode** uses Google Gemini (free tier, no credit card):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Key from <https://aistudio.google.com/apikey>. Empty = demo mode. |
| `GEMINI_MODEL` | Defaults to `gemini-3.6-flash`. Check the [models page](https://ai.google.dev/gemini-api/docs/models) for the current Flash model. |
| `QUIZ_TOKEN_SECRET` | Long random string used to encrypt quiz tokens. A dev fallback is used if empty; **set it in any deployment**. |

Other scripts:

```bash
npm test            # Vitest unit tests (quiz logic, mock grader, token sealing, LLM retry/timeout)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # production build
npm start           # serve the production build
```

> The Monaco editor loads its files from the jsDelivr CDN, so you need an internet connection even in demo mode.

## How it works

- **Next.js 16 (App Router) + TypeScript** in one repo. The two API routes keep the LLM key on the server.
- `POST /api/quiz` validates the input with **zod**, sends the code to the model with every line prefixed by its number (`12| ...`) so anchors are accurate, and asks for exactly 3 questions with a private rubric. Gemini's structured output (`responseJsonSchema`) returns JSON, which is validated again with zod. Line ranges are clamped on the server.
- The rubric never reaches the browser. The server seals the quiz (code, questions, rubric) into a **`quizToken` encrypted and authenticated with AES-256-GCM**, so grading is stateless and tamper-proof. The GCM auth tag does the job the plan gave to an HMAC, and the encryption also hides the rubric.
- `POST /api/grade` opens the token, grades each answer 0/1/2, writes lessons (≤ 60 words) and agent prompts for every non-green question, and computes the overall score. Skipped answers are always 0.
- **Heatmap on the client**: lines in a question's range take that question's color, overlaps take the lowest score, and uncovered lines stay neutral. Drawn with Monaco `deltaDecorations`.
- **Resilience**: empty and too-long input are blocked before sending. LLM calls time out after 30s. Malformed JSON gets one automatic retry, then a friendly error with a **Retry** button. Rate limits (429) get their own message.
- `lib/llm.ts` is the only provider-specific file. To switch to OpenAI or Anthropic, re-implement `generateJson` there.
- Prompt-injection hygiene: the system prompts treat everything inside `<code_under_review>` and `<answer>` as data, not instructions.

```
app/api/quiz/route.ts     quiz generation
app/api/grade/route.ts    grading + lessons
lib/llm.ts                Gemini wrapper (timeout, retry, error mapping)
lib/prompts.ts            system prompts + JSON schemas
lib/quiz.ts               pure logic: numbering, clamping, scoring, heatmap
lib/token.ts              AES-GCM quiz token
lib/mock.ts               demo-mode quizzes and keyword grader
components/teachback/     paste, quiz and results screens, Monaco wrapper
tests/                    Vitest suites
```

## Pre-existing code and templates (disclosure)

- Scaffolded with `create-next-app` (Next.js 16 template).
- UI primitives from **shadcn/ui** (Button, Card, Textarea, Progress, Badge, Skeleton, Sonner) via the shadcn CLI, built on Base UI.
- Libraries: `@monaco-editor/react`, `@google/genai`, `zod`, `highlight.js` (language detection only), `lucide-react`, `sonner`, Vitest.
- Everything else was written for this hackathon, with an AI coding assistant.

## License

[MIT](LICENSE)

---

## Devpost submission text

> Draft below. Rewrite it in your own words before submitting (the rules ask for that), and add your real dogfood score.

### Inspiration

AI assistants made it easy to ship code that works but that nobody can explain. I call that **comprehension debt**. As a student I'd paste a function from an assistant, watch the tests pass, and couldn't have told you why it worked. Healthcare solved a version of this with the *teach-back* method: patients repeat instructions in their own words so the clinician knows they really understood. I wanted that for code.

### What it does

Teachback flips the usual AI explainer. Instead of explaining code *to* you, it makes *you* explain it. Paste AI-written code and Teachback picks the 3 regions most likely to be misunderstood (closures, async, recursion, mutation, edge cases). It asks you one question about each, anchored to exact lines, and grades your free-text answers. The result is an Ownership score and a line-by-line heatmap: green where you own it, red where you're shipping code you don't understand. Every gap comes with a 60-word micro-lesson and a ready-made prompt to paste into your coding agent, so a gap becomes a next step.

It's built for intro CS students and self-taught builders who code with AI, and for the instructors who teach them.

### How we built it

I planned the project with the Build With AI: Basics skill pack (scope → PRD → spec; see `devpost/`) **[confirm once you've run the skills]**, then built it with an AI coding agent. It's a Next.js App Router app in TypeScript with Tailwind and shadcn/ui. The editor is Monaco, with decorations for the glowing question lines and the heatmap. Google Gemini generates the quiz and grades the answers through structured JSON output, and every response is validated with zod. To keep grading stateless without leaking the answer key, the server seals each quiz's rubric into an AES-GCM-encrypted token that only the server can open. Code is sent to the model with line numbers so the questions point at the right lines, and line ranges are clamped on the server anyway. A demo mode with hand-written quizzes and a keyword grader lets anyone run it without an API key.

### Challenges we ran into

- **Accurate line anchors.** Models are bad at counting lines. Prefixing every line with its number and clamping ranges on the server fixed it.
- **Hiding the rubric without a database.** I wanted no server storage, but the client can't see the grading key. Authenticated encryption on a stateless token solved both.
- **Fair grading.** Wording shouldn't matter, but understanding should. The rubric holds 2–3 concrete key points, and an honest "I don't know" is scored as honest rather than penalized twice.
- **LLM flakiness.** Timeouts, rate limits and malformed JSON each get a specific, friendly error, one automatic retry and a Retry button.

### Accomplishments that we're proud of

- The heatmap makes comprehension *visible*, line by line.
- The "copy prompt for your agent" button closes the loop: the same AI that wrote the code now teaches you the part you missed.
- I ran Teachback on the code my AI assistant wrote *for Teachback* and scored **[YOUR SCORE]**. The red section was **[WHAT YOU LEARNED]**.

### What we learned

**[Write this yourself.]** For example: what the dogfood run showed you didn't understand, what you learned about closures or async while building this, and how planning with the skill pack changed the build.

### What's next for Teachback

- An instructor dashboard and shareable "comprehension receipts"
- A git pre-commit hook or PR check: "explain this diff before you merge it"
- Multi-file projects
- "Retry my weak spots": a follow-up quiz on just the red regions

### Built with

`next.js` `typescript` `react` `tailwindcss` `shadcn-ui` `monaco-editor` `google-gemini` `zod` `vitest`
