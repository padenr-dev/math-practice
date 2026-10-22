# Math Practice (IXL alternative prototype)

Google Apps Script web app for Grade 5 math practice. Students practice skills,
results go to the teacher's own Google Sheet. The full plan is in
`docs/build-plan.md`; the work is split into chunks 0–9.

## Ground rules for every session

- **One session per chunk.** Don't continue a chunk session into the next chunk.
- **First action:** read `HANDOFF.md` and this chunk's section of `docs/build-plan.md`.
  Don't re-read the feasibility report or mockups unless the chunk needs them
  (only chunks 3, 5 and 6 do, and only the matching mockup).
- **Stop line:** if the usage window is getting low, stop at the next passing test,
  commit, and update `HANDOFF.md`. Never leave failing tests on `main`; work on a branch.
- **End of chunk:** overwrite `HANDOFF.md` using the template in `docs/build-plan.md`,
  commit, and open a PR.
- **Keep files small** (under ~300 lines) so sessions read only what they need.
- **No student data in logs**, and no analytics or third-party scripts.

## Layout

- `src/core/` pure logic (scoring, sessions, helpers). No Apps Script globals.
- `src/skills/` one file per skill (generator + checker).
- `gas/` thin Apps Script layer: `doGet`, server functions, `SpreadsheetApp`,
  `Session`, `HtmlService`, `LockService`. Plus `appsscript.json`.
- `ui/` HTML Service pages (`.html`). Served by name, e.g. `ui/index.html` → `'index'`.
- `test/` `node --test` tests. Fake Google services in tests, never real ones.
- `scripts/build.js` bundles everything into `dist/` (git-ignored) for `clasp push`.

## Module rules (the build depends on these)

Apps Script has no modules: every file shares one global scope. `src/` is written
as ES modules for Node, and the build strips the module syntax. So:

- Imports: single-line named imports only, `import { a, b } from './x.js';`
- Exports: `export function|const|let|class name` only. No default exports, no `export { }` lists.
- Every top-level name must be unique across `src/` and `gas/`.
- `gas/` files are plain Apps Script (no import/export) and may call anything in `src/`.

## Commands

- `npm test` runs all tests (includes a build smoke test that runs `doGet` with fakes).
- `npm run build` writes `dist/`.
- `npm run push` builds and uploads to Apps Script (needs `clasp login`, on Paden's computer only).
- `npm run deploy` pushes and updates the web app at the same URL (ID in `.deployment-id`).

Cloud sessions can't push or deploy (no Google credentials, by design). They
build and test; Paden runs `npm run deploy` locally when a chunk says to.
