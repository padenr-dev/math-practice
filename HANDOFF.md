# Handoff — after chunk 0 (2026-10-22)

## Done
- Repo skeleton: `src/core/`, `src/skills/`, `gas/`, `ui/`, `test/`, `scripts/`, `docs/`.
- `npm test` runs with Node's built-in runner (4 passing tests, no test dependencies).
- Build script bundles `src` + `gas` + `ui` into `dist/` for `clasp push`, stripping ES module syntax.
- Hello page: `gas/Code.js` `doGet()` renders `ui/index.html` with "Hello, <email>".
- Build smoke test runs the bundle in a shared global scope with fake `HtmlService`/`Session`, so the Apps Script glue is tested without Google.
- `npm run deploy` pushes and redeploys a single saved deployment ID so the web app URL stays the same.
- `CLAUDE.md` (ground rules + module rules), `docs/build-plan.md` (copy of the plan), `README.md` (setup).

## How to test it
- `npm install && npm test` (anywhere, including cloud sessions).
- Live page: Paden's one-time setup in `README.md`, then open the URL `npm run deploy` prints.

## Decisions made (and why)
- **No bundler.** `src/` is plain ES modules; `scripts/build.js` strips `import`/`export` because Apps Script shares one global scope. Keeps zero runtime deps. Costs: single-line named imports only, no default exports, unique top-level names (build throws on violations).
- **clasp 2.x pinned** (`^2.4.2`, installed 2.5.0). clasp 3 renamed commands and flags; don't upgrade mid-project.
- **Manifest:** `executeAs: USER_DEPLOYING`, `access: DOMAIN`, scope `userinfo.email` only. Later chunks add Sheets scopes when they need them.
- **`.clasp.json` and `.deployment-id` are committed** (not secrets); `.clasprc.json` (credentials) is git-ignored and must never enter a cloud session.
- **Time zone** set to `America/Chicago` as a placeholder; change in `gas/appsscript.json` if the district is elsewhere.

## Known issues / loose ends
- The live deploy has not been run yet: it needs Paden's `clasp login` (see README). `.clasp.json` and `.deployment-id` don't exist until then.
- `access: DOMAIN` only works on a Google Workspace (school) account. If deploying from a personal Gmail account for testing, temporarily set `"access": "MYSELF"`.
- `scripts/deploy.js` parses the deployment ID from clasp 2 output (`- AKfy... @N`); untested against a real deploy.

## Next chunk
- Chunk 1: Question engine. Start by reading `HANDOFF.md`, `CLAUDE.md`, and the "Chunk 1" section of `docs/build-plan.md`. Put the skill interface and answer parsing in `src/core/`, sample skills in `src/skills/`.
- Needs from Paden before starting: nothing (chunk 1 is pure Node). The live deploy from chunk 0 can happen any time before chunk 4.
