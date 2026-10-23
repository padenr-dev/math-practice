# Handoff — after chunk 3 (2026-10-23)

## Done
- Practice screen (`ui/practice.html` + `practice_css.html` + `practice_js.html`) matching mockup 3: question with stacked fractions, fraction boxes (optional whole-number box, numerator, denominator) or one box for decimals, feedback box with the explanation, Hint, Read aloud, SmartScore ring with change and Challenge Zone message, session panel (answered, correct, time), "I'm done for now" summary.
- `doGet` now serves the practice screen. `?skill=A.3` picks the skill (default C.1). `ui/index.html` (the hello page) is gone.
- Server side in `src/core/practiceRun.js` over a key/value store: `beginPracticeRun`, `answerPracticeRun`, `nextPracticeRun`, `finishPracticeRun`. `gas/Code.js` wraps them as `practiceStart/Answer/Next/Finish` for `google.script.run`, with `CacheService.getScriptCache()` as the store.
- The browser never gets the answer: the full question stays in the cache under a random run id, and the page only gets a "view" (prompt, hint, feedback, score). This closes the chunk 1 loose end.
- The simplify setting from chunk 2 shows as a soft amber box with `SIMPLIFY_FRACTION_HINT`; the question stays, and a right answer after it earns half points.
- Read aloud uses the browser's `speechSynthesis`. `src/core/spokenMath.js` turns "1/4 + 2/3 = ?" into "1 fourth plus 2 thirds equals what?"; the server sends spoken text for the question and the feedback.
- `npm run preview` writes `preview/preview.html` (git-ignored): one file with the real bundle, fake CacheService/Utilities/Session, and a fake `google.script.run` that calls the real `gas/Code.js` functions.

## How to test it
- `npm test` (70 tests). `test/practiceRun.test.js` plays runs through the store; `test/build.test.js` calls doGet and all four server functions in the built bundle, and checks preview.html's scripts parse.
- `npm run preview`, open `preview/preview.html`, answer 10 questions with the keyboard only: type, Enter submits, focus moves to "Next question", Enter again. Type `/` in the top box to jump to the bottom one. Try 2/4-style answers for the simplify hint and a blank submit.
- Checked here with Playwright (Chromium): 10 C.1 answers (right, wrong, unsimplified then right), score 0 → 69 as the table predicts, summary, A.3 blank + right at phone width, no console errors.

## Decisions made (and why)
- **Script cache, not user cache.** The web app runs "Execute as me", so `getUserCache()` would be Paden's cache for every student. Runs are keyed by `Utilities.getUuid()` and kept 6 hours (the cache maximum). No email or name is stored in the cache.
- **Checking is server-side** (one `google.script.run` call per submit, about a second). Slower than checking in the browser, but answers can't be read in dev tools.
- **No skipping**: `nextPracticeRun` ignores the call until the question is answered. A second submit of an answered question returns the same view, so a double click can't record twice.
- **At 100 the run stops** offering questions and the button becomes "See my results".
- **The Hint button is free** (no point cost). IXL has no hint button; if students lean on it, make it set `hinted` like the simplify hint.
- **The whole-number box is optional** and dashed; "17/12" in the fraction boxes is also accepted (improper fractions count as simplest).
- **Time** in the side panel is a live clock since the page opened; the summary uses the session's capped per-question seconds (chunk 2 rule).
- **No `<form>`** on the practice screen: sandboxed viewers without `allow-forms` block form submission, so Submit was dead there. Submit is a plain button and Enter is handled on the answer boxes.
- Header shows the signed-in email (we don't have names until chunk 5). All server text goes into the page with `textContent`; `scriptJson` escapes `<` for the page data.

## Known issues / loose ends
- Nothing is saved yet: `practiceStart` uses start score 0 and default teacher settings, and `finishPracticeRun` only returns stats. Chunk 4 hooks in there (comments mark the spots in `gas/Code.js` and `practiceRun.js`).
- If a run's cache entry expires (6 h) or is evicted, the page shows "timed out, reload". The script cache is 100 KB per key, enough for several hundred answers.
- `src/core/greeting.js` is no longer used by the page; delete it in chunk 5 if the sign-in screen doesn't want it.
- Read-aloud voices vary by browser; Chromebooks have one built in. Not tested with a real screen reader (labels and live regions are in place: answer boxes are labeled, feedback is `role=status`, the ring is `role=img` with the score).
- The live deploy hasn't happened yet, so the page hasn't run inside Apps Script's iframe.

## Next chunk
- Chunk 4: Results to the teacher's Sheet. Start by reading `HANDOFF.md`, the "Chunk 4" section of `docs/build-plan.md`, `gas/Code.js`, `src/core/practiceRun.js` (`finishPracticeRun`) and `src/core/teacherSettings.js`.
- Needs from Paden before starting: the one-time Google setup (`clasp login` + first deploy, see `README.md`). After that, opening the web app URL should show this practice screen.
