# Handoff — after chunk 1 (2026-10-22)

## Done
- Skill interface documented in `src/core/skill.js`: `{ id, title, grade, category, generate(rng, difficulty), check(question, input) }`. Questions are plain JSON-safe data. `validateSkill` / `validateQuestion` enforce the contract.
- Seeded random numbers (`src/core/random.js`: `createRng(seed)`, `randInt`, `randPick`). Same seed, same question.
- Exact fraction math (`src/core/fractions.js`). Every answer type is compared as a fraction, so decimals never hit float rounding.
- Answer parsing and checking (`src/core/answers.js`): types `integer`, `decimal`, `fraction`. Fractions accept `3/4`, `1 3/4`, `7/4`, whole numbers, and `{ whole, num, den }` objects from separate input boxes. Equivalent fractions count as correct unless `question.requireSimplest`, in which case the result is `{ correct: false, unsimplified: true }`.
- Two skills: **C.1 Add fractions with unlike denominators** and **A.3 Round decimals**, each with 3 difficulty levels, a hint, and a step-by-step explanation.
- Skill registry `src/skills/registry.js`: `allSkills()`, `findSkill(id)`.
- Build now fails if two files in `src/` or `gas/` declare the same top-level name (Apps Script's shared global scope would silently overwrite one).

## How to test it
- `npm test` (39 tests). `test/skills.test.js` runs every registered skill through 300 seeds × 3 difficulties: valid question, its own answer is accepted, near-miss answers are rejected, junk input is flagged invalid.
- Try it by hand: `node -e "import('./src/skills/registry.js').then(async ({findSkill}) => { const {createRng} = await import('./src/core/random.js'); const s = findSkill('C.1'); const q = s.generate(createRng(1), 3); console.log(q.prompt, s.check(q, '1/2')); })"`

## Decisions made (and why)
- **`check()` returns `{ correct, explanation, invalid?, unsimplified?, error? }`.** `invalid` (blank or unreadable input) should not be scored by chunk 2; the UI just shows `explanation` ("Type an answer first."). `unsimplified` is `correct: false`; chunk 2 decides whether it costs points (suggest: treat as wrong, like IXL, but the UI can say "almost").
- **Improper fractions count as simplest form** (`7/4` is fine, `1 3/4` is fine, `14/8` is not). Grade 5 standards accept either form.
- **Decimals compare by value**: for "round 2.996 to the nearest hundredth", `3.00`, `3.0` and `3` are all accepted. `answerText` shows the place-value form (`3.00`).
- **Fraction answers don't accept decimals** (`0.75` for `3/4` is "invalid", with a message asking for a fraction).
- **Difficulty is an integer 1–3** (`clampDifficulty` rounds and clamps anything else). Chunk 2 maps score → difficulty.
- **Registry is a function, not a top-level array**, because Apps Script runs files in name order and a top-level array could reference skills not yet defined.
- **Private helpers have long, specific names** (`parseDecimalText`, `pickAddFractionDenominators`) because everything shares one global scope in Apps Script. Follow this in new skill files.

## Known issues / loose ends
- The question object includes the answer. That's fine for the prototype, but when chunk 3/4 sends questions to the browser, a curious student could read the answer in dev tools. Option: keep questions server-side (or send a copy without `answer`/`answerText`/`data`) and check on the server.
- `skill.check` re-derives explanations from `question.data`, so stored questions must keep `data` if they are re-checked later.
- Wording and grade level of generated questions haven't been reviewed by a teacher yet.

## Next chunk
- Chunk 2: SmartScore + session logic. Start by reading `HANDOFF.md`, `CLAUDE.md`, the "Chunk 2" section of `docs/build-plan.md`, and `src/core/skill.js` (for the `check()` result shape). Put scoring in `src/core/`; test it against real questions from `findSkill('C.1')`.
- Needs from Paden before starting: nothing. The live deploy (`clasp login` + first deploy, see `README.md`) is needed before chunk 4.
