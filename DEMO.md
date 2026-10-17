# Teachback: 2-minute demo script

**Before recording**

- Use **live mode**: put a real `GEMINI_API_KEY` in `.env.local`. The rules say the app must work exactly as shown, so record with real API calls, not demo mode. (In demo mode the answers below give green / amber / red. In live mode Gemini writes its own questions, so adapt your answers to what it asks.)
- `npm run build && npm start`, then open http://localhost:3000 in a clean browser window at 1440×900 or larger, zoomed to about 110%.
- Clear Recent attempts (trash icon) so the landing page looks fresh, or keep one attempt to show the feature.
- Have the dogfood result ready in a second tab: run Teachback on `app/api/grade/route.ts` (or another file the AI wrote) beforehand and keep the results screen open.
- No music with copyright issues, and no third-party logos.

---

### 0:00–0:15: The hook

*On screen: the landing page, the JS debounce sample loaded.*

> "AI wrote this function. It works. I'm a CS student at Missouri S&T, and I couldn't tell you why. That's comprehension debt, and every student using AI has it."

### 0:15–0:30: Who it's for

*Slowly scroll past the tagline and the "What was this code supposed to do?" field.*

> "Teachback is for students and new builders who code with AI. Instead of explaining code to you, it makes you explain it back. It's the teach-back method from healthcare, applied to code."

### 0:30–1:20: The live flow

1. Click **JS debounce**, then **Quiz me** (or press Ctrl+Enter).
2. **Q1** (lines 4–9 glow): *"The input event fires 3 times within 100ms. How many times does `fn` run, and when?"*
   Answer well:
   > It runs once, about 250ms after the last keystroke, because clearTimeout cancels the pending timer each time.

   Press **Ctrl+Enter**.
   > "Notice the editor highlights exactly the lines the question is about."
3. **Q2** (the closure, lines 2–3): give a partial answer:
   > The returned function is a closure, so it remembers timer.
4. **Q3** (`this` binding, lines 21–25): click **Skip – I don't know**.
   > "And I'll be honest here. An honest 'I don't know' is worth more than a lucky guess."

### 1:20–1:40: The payoff

*The results screen appears. Let the score ring animate.*

> "Green: I own it. Amber: I half get it. Red: I'm shipping code I don't understand."

- Point at the heatmap: lines 4–9 green, 2–3 amber, 21–25 red.
- Open the red **`this` binding** card and read the micro-lesson headline.
- Click **Copy prompt for your coding agent** (the toast confirms it).
  > "And it gives me the exact prompt to paste into my coding agent, so the same AI that wrote the code teaches me the part I missed."

### 1:40–1:52: The twist

*Switch to the dogfood tab.*

> "Then I ran Teachback on the code Claude wrote *for Teachback*. I scored **[your score]**. Here's the part I'd been faking." *(Point at the red region.)*

### 1:52–2:00: The close

*Flash the `devpost/` planning docs in the repo.*

> "Planned with the skill pack, built in one flow. Next: an instructor view and a git hook that asks you to explain your diff before you merge. Teachback: don't just ship it. Own it."

---

**Backup plan:** if the API is slow or rate-limited during recording, the error banner has a **Retry** button. Cut the wait in editing. Don't switch to demo mode for the final video.
