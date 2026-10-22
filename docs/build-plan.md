# Build Plan: Math Prototype in Usage-Window Chunks

*Prepared 2026-10-22. Builds the Apps Script prototype described in `feasibility/ixl-alternative-feasibility.md` (Option B) and the screens in `mockups/`.*

## The short version

Split the prototype into **10 chunks, one fresh Claude session each**. Every chunk ends with something you can test and a `HANDOFF.md` update, so the next session starts cold without re-reading the whole project.

| # | Chunk | Testable result | Model | Est. tokens* |
|---|---|---|---|---|
| 0 | Repo skeleton + deploy pipeline | "Hello, *your email*" page loads from your Apps Script URL | Opus | 150–300k |
| 1 | Question engine | `npm test` passes: 2 sample skills generate and check answers (incl. fractions) | Opus | 300–500k |
| 2 | SmartScore + session logic | `npm test` passes: score climbs, drops, enters Challenge Zone at 90 | Opus | 200–400k |
| 3 | Practice screen (mockup 3) | Open `preview.html` in a browser and answer questions with no Google setup | Opus | 400–700k |
| 4 | Results to the teacher's Sheet | Answer questions on the live URL; rows appear in your Sheet; refresh resumes the score | Opus | 400–700k |
| 5 | Sign-in + skill list (mockups 1–2) | Student and teacher accounts land on the right screens; skill list shows real scores | Opus | 400–600k |
| 6 | Teacher class results (mockup 4) | Teacher sees a class table, assigns skills, "needs help" list matches the Sheet | Opus | 400–700k |
| 7 | Content batch A: 5 skills | `npm test` passes for each new skill; they appear in the list | Sonnet | 200–400k |
| 8 | Content batch B: 5 skills | Same as 7 (10 skills total, one grade) | Sonnet | 200–400k |
| 9 | Hardening + pilot kit | 30-student load test passes; teacher setup guide works from a blank account | Opus | 300–500k |

**Total: roughly 3–5M tokens**, inside the earlier 2–6M estimate. Each chunk is sized to finish in well under one 5-hour window, leaving room for debugging.

*\*Token figures are planning estimates, not measured. Anthropic doesn't publish usage-window limits in tokens, and they vary by plan and model, so chunks are sized by **scope** (one feature, one test target, roughly 8 or fewer files touched) rather than by a token count.*

**First teacher-visible demo:** after chunk 4 (a student can practice and results land in a Sheet). **Pilot-ready:** after chunk 9.

---

## Why split it this way

1. **Context size is what burns usage, not the code.** Every message in a session re-sends the conversation so far. A session that runs for hours gets more expensive per message as it grows. Ten short fresh sessions cost far less than three long ones doing the same work.
2. **Pure logic first, Google plumbing later.** Chunks 1–3 run entirely on a laptop or in the cloud with Node and a browser. They don't need Apps Script, sign-in, or a deploy, so they're fast to test and cheap to debug. The Google-specific parts (4–6) build on logic that's already proven.
3. **One testable result per chunk.** If a window runs out mid-chunk, the worst case is redoing part of one chunk, never untangling half-finished work across three features.
4. **Content is separate from code.** Adding skills (7–8) is repetitive and well-specified, so it can run on Sonnet, which stretches your usage further. It can also happen any time after chunk 1, including on days when you have a short window.
5. **Your manual steps are batched.** Things only you can do (Google login, deploying, Workspace admin checks) are called out per chunk so a session isn't left waiting on you.

## Order and what can move

```
0 ──► 1 ──► 2 ──► 3 ──► 4 ──► 5 ──► 6 ──► 9
       └──► 7 ──► 8 (any time after 1; must finish before 9)
```

- 1 and 2 could swap, but 1 first means 2 can be tested against real questions.
- 7 and 8 are the best "short window" chunks: if you only have an hour left in a window, do one or two skills.
- If usage is tight, 6 can be trimmed to the class table + export (drop "assign skills" and "needs help" until after the pilot).

---

## Ground rules for every chunk session

Put these in the repo's `CLAUDE.md` during chunk 0 so every session follows them automatically:

- **Start a new session per chunk.** Don't continue a chunk session into the next chunk.
- **First action:** read `HANDOFF.md` and this chunk's section of `docs/build-plan.md`. Don't re-read the feasibility report or mockups unless the chunk needs them (only 3, 5, 6 do, and only the matching mockup).
- **Stop line:** if the window is getting low, stop at the next passing test, commit, and update `HANDOFF.md`. Never end a session with failing tests on `main`; use a branch.
- **Keep files small** (under ~300 lines) so sessions read only what they need.
- **Logic stays in plain JS modules** testable with `node --test`; Apps Script–only code (`SpreadsheetApp`, `Session`, `HtmlService`) lives in a thin `gas/` layer.
- **No student data in logs**, no analytics scripts.

### Handoff note template (`HANDOFF.md`, overwritten at the end of each chunk)

```markdown
# Handoff — after chunk N (<date>)

## Done
- <what now works, one line each>

## How to test it
- <exact commands / URL / clicks>

## Decisions made (and why)
- <anything the next session must not undo>

## Known issues / loose ends
- <bugs, TODOs, shortcuts taken>

## Next chunk
- Chunk N+1: <name>. Start by reading <specific files>.
- Needs from Paden before starting: <manual steps, or "nothing">
```

### Kickoff prompt to paste into each new session

> Read `HANDOFF.md` and the "Chunk N" section of `docs/build-plan.md`, then build chunk N. Stop at the testable result listed there, update `HANDOFF.md`, commit, and open a PR.

---

## Chunk details

### Chunk 0 — Repo skeleton + deploy pipeline
- **Build:** GitHub repo; folder layout (`src/core/` pure logic, `src/skills/`, `gas/` Apps Script glue, `ui/` HTML, `test/`); `package.json` with `node --test`; `clasp` config; a build script that bundles `src` + `ui` into the Apps Script project; `CLAUDE.md` with the ground rules; copy of this plan to `docs/build-plan.md`; first `HANDOFF.md`.
- **Test:** `npm test` runs (one trivial test); the deployed web app shows "Hello, <your email>".
- **Your steps:** create the GitHub repo and connect it to the project; enable the Apps Script API in your Google account; run `clasp login` once on your own computer (credentials shouldn't go into a cloud session); do the first deploy as "Execute as me, accessible to anyone in the domain."

### Chunk 1 — Question engine
- **Build:** a skill = `{ id, title, grade, generate(rng, difficulty) → question, check(question, answer) → {correct, explanation} }`. Seeded random numbers so tests are repeatable. Answer types: integer, decimal, fraction (accepts equivalent fractions, flags unsimplified if the skill requires it). Two sample skills: **C.1 Add fractions with unlike denominators** and **A.3 Round decimals** (both appear in the mockups).
- **Test:** generators produce valid questions at 3 difficulty levels; checker accepts every correct form and rejects wrong ones.

### Chunk 2 — SmartScore + session logic
- **Build:** score 0–100 with big early gains, smaller near mastery, a penalty for wrong answers, Challenge Zone at 90+; difficulty steps up with score; session stats (answered, correct, time). Pure functions over a list of answer events, so the score can be rebuilt from Sheet rows later.
- **Test:** scripted answer sequences produce expected scores; 100 = mastered; wrong answers in Challenge Zone cost more.

### Chunk 3 — Practice screen (mockup `3-practice.png`)
- **Build:** HTML Service page matching the mockup: question, fraction/number inputs, feedback box with explanation, hint, read-aloud (browser `speechSynthesis`), SmartScore ring, session panel. A `preview.html` with a fake `google.script.run` so it runs in any browser without Google.
- **Test:** open `preview.html`, answer 10 questions, score and feedback behave; keyboard-only and screen-reader labels work.

### Chunk 4 — Results to the teacher's Sheet
- **Build:** the template Sheet with a `Results` tab (timestamp, student email, skill, score, answered, correct, seconds) and a `Settings` tab. Server functions to append a result (with `LockService` so simultaneous students don't collide) and to read back a student's latest score per skill to resume. Write once per answered question set, not per keystroke, to stay inside quotas. Wire the practice screen to it.
- **Test:** in your own copy, practice on the live URL; rows appear; reload and the score resumes. Unit tests use a fake `SpreadsheetApp`.
- **Your steps:** redeploy (new version) and try it with a second account if you have one.

### Chunk 5 — Sign-in + skill list (mockups `1-signin.png`, `2-skills.png`)
- **Build:** landing page; detect the user via `Session.getActiveUser()`; the Sheet owner is the teacher, everyone else is a student. Skill list grouped by category with progress bars from the Sheet, "Assigned" badges, Mastered/Recent filters, stat cards.
- **Simplification vs. mockups:** in the Apps Script version each teacher has their own copy and link, so the **class code** isn't needed for the prototype. Keep it for the later server version (Option A).
- **Test:** teacher account sees the teacher home; student account sees the skill list with correct scores.
- **Your steps:** confirm with the Workspace admin that student accounts can open a domain-only Apps Script web app (the under-18 "Trusted app" setting).

### Chunk 6 — Teacher class results (mockup `4-teacher.png`)
- **Build:** class table (students × assigned skills, color-coded), questions and time columns, week filter, "Open in Sheets" link, assign-skills dialog (writes to `Settings`), "needs help" panel (below 40 on an assigned skill). Export options map to building summary tabs in the same Sheet.
- **Test:** seed the Sheet with fake rows (script provided); the table and needs-help list match.

### Chunks 7 and 8 — Content batches
- **Build:** 5 Grade 5 skills per chunk, following the chunk 1 pattern. Suggested from the mockups: A.1 Read and write decimals, A.2 Compare decimals, A.4 Powers of ten, B.1 Multiply multi-digit numbers, B.2 Divide 4-digit by 2-digit, B.3 Estimate quotients, B.4 Division word problems, C.2 Multiply fractions by whole numbers. Swap in whatever the pilot teachers actually assign.
- **Test:** each skill has generator + checker tests and shows up in the skill list.
- **Your steps:** have a teacher spot-check 10 generated questions per skill for wording and grade level.

### Chunk 9 — Hardening + pilot kit
- **Build:** load test simulating 30 students finishing at once (verifies the lock and quota handling); error messages for "teacher revoked access" or "Sheet deleted"; accessibility pass; `docs/teacher-setup.md` (make a copy, deploy, share link); `docs/privacy-data-flow.md` (one page for the district's records, per feasibility §3.4).
- **Test:** a teacher who has never seen the project follows the setup guide and has a working class link.

---

## If something runs long

- **A chunk won't fit:** split it at its natural seam (e.g. chunk 6 → 6a table + export, 6b assign + needs help) and note the split in `HANDOFF.md`.
- **A window ends mid-chunk:** the session should already be on a branch; the next session reads `HANDOFF.md` plus `git log` on that branch and continues.
- **Usage is the bottleneck overall:** run 7–8 on Sonnet (already planned), and consider Sonnet for 2 as well, since it's small and fully unit-tested.
