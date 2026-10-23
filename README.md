# Math Practice

A free, Google Apps Script–based math practice app (Grade 5 prototype), built
as a lower-cost alternative to IXL. See `docs/build-plan.md` for the plan and
`HANDOFF.md` for current status.

## Setup (one time, on your own computer)

1. Install Node.js 20 or newer.
2. Turn on the Apps Script API: https://script.google.com/home/usersettings
3. In this folder:
   ```sh
   npm install
   npx clasp login
   npx clasp create --type webapp --title "Math Practice" --rootDir dist
   npm run deploy
   ```
4. Open the printed web app URL, approve the permission prompt, and you should
   see the practice screen for C.1 (add `?skill=A.3` to the URL for the other skill).
5. Commit the new `.clasp.json` and `.deployment-id` files.

`npx clasp login` stores your Google credentials in `~/.clasprc.json` on your
computer. Never copy that file into the repo or a cloud session.

## Trying the practice screen without Google

`npm run preview` writes `preview/preview.html`, a single file that runs the
real app code in any browser with fake Google services. Open it, answer some
questions, and use the links at the top to switch skills. Nothing is saved.
