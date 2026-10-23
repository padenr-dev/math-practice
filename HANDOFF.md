# Handoff — after chunk 2 (2026-10-23)

## Done
- SmartScore in `src/core/smartScore.js`: score 0–100, big early gains, smaller near mastery, a penalty for wrong answers that grows with the score, Challenge Zone at 90–99, mastered at 100. The rules are one table (`SMART_SCORE_BANDS`) documented at the top of the file.
- `difficultyForScore(score)`: difficulty 1 below 40, 2 from 40, 3 from 75.
- Score is never stored. `replaySmartScore(events, startScore)` rebuilds it from answer events, so chunk 4 can recompute it from Sheet rows.
- Teacher setting "Students must simplify fractions" (`src/core/teacherSettings.js`). Logic only; the checkbox itself lands in the teacher view (chunk 6), stored on the `Settings` tab (chunk 4).
- Practice sessions in `src/core/practiceSession.js`: `startPracticeSession(skillId, startScore, now, settings)`, `checkPracticeAnswer`, `recordPracticeAnswer` (turns a `check()` result into an answer event), `nextPracticeQuestion` (picks difficulty from the current score), `practiceSessionScore`, `practiceSessionStats` (answered, correct, wrong, accuracy %, seconds, start score, score, change, Challenge Zone, mastered).

## How to test it
- `npm test` (61 tests). `test/smartScore.test.js` has scripted sequences and the exact perfect-run curve; `test/practiceSession.test.js` plays real C.1 questions through whole sessions.
- By hand: `node -e "import('./src/core/smartScore.js').then(m => console.log(m.replaySmartScore(Array(19).fill({correct:true})).history))"`

## Decisions made (and why)
- **Bands (score before the answer):** 0–29 +10/−2, 30–49 +8/−3, 50–69 +6/−4, 70–79 +4/−5, 80–89 +3/−6, 90–99 +2/−8. A perfect run reaches 90 in 15 answers and 100 in 19, which is close to IXL. One slip in the Challenge Zone costs four right answers. Tune the table, not the code, if the teacher pilot finds it too hard or too easy.
- **Unsimplified fractions are a teacher checkbox** (Paden's call): `requireSimplestForm` in `src/core/teacherSettings.js`, default on. On: `checkPracticeAnswer` returns `retry: true` with the mild hint `SIMPLIFY_FRACTION_HINT` (it doesn't reveal the answer), the unsimplified try costs nothing, and the student tries again. A correct answer after the hint earns half the usual gain, rounded up (+5, +4, +3, +2, +2, +1 by band); a wrong one costs the usual amount (Paden's call). The UI passes `{ hinted: lastResult.hinted }` to the next `checkPracticeAnswer` on the same question, and the event stores `hinted`. Off: `nextPracticeQuestion` clears `question.requireSimplest`, so any equal fraction is correct. Sheet checkbox values (`TRUE`/`FALSE`) are accepted by `normalizeTeacherSettings`.
- **Retry answers are not recorded** (invalid input or the simplify hint): `recordPracticeAnswer` returns the same session. The UI should use `checkPracticeAnswer`, not `skill.check`, so the setting applies.
- **Answer event shape** (one Sheet row each in chunk 4): `{ skillId, correct, unsimplified, hinted, difficulty, shownAt, answeredAt }`, times in epoch ms. No student identity in the event; chunk 4 adds the student column.
- **Time per question is capped at 300 s** so an idle tab doesn't inflate "time spent".
- **Score carries across sessions**: pass the replayed score of past rows as `startScore`. Answers after 100 still count (a wrong one drops the score), but the UI should end the session at mastery like IXL.
- **Sessions are immutable plain data**; every function returns a new session, so they can go through `google.script.run`.

## Known issues / loose ends
- No streak bonus or "time since last practice" decay. IXL has neither in the score itself, so left out on purpose.
- `nextPracticeQuestion` takes a seed; real use should pass a random integer (e.g. `Math.floor(Math.random() * 2**31)`). It doesn't avoid repeating a question the student just saw.
- Still open from chunk 1: questions include the answer, so a curious student could read it in dev tools if questions are sent to the browser.

## Next chunk
- Chunk 3: Practice screen (mockup `3-practice.png`). When `checkPracticeAnswer` returns `retry`, show its `explanation` softly and keep the question. Start by reading `HANDOFF.md`, the "Chunk 3" section of `docs/build-plan.md`, `src/core/practiceSession.js`, `src/core/teacherSettings.js`, and the mockup `/mnt/project-files/mockups/3-practice.png`.
- Needs from Paden before starting: nothing. The live deploy (`clasp login` + first deploy, see `README.md`) is needed before chunk 4.
