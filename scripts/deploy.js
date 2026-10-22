// Pushes the build and updates the web app. The first run creates a deployment
// and saves its ID to .deployment-id; later runs redeploy that same ID so the
// web app URL never changes.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ID_FILE = '.deployment-id';
const clasp = (...args) => execFileSync('npx', ['clasp', ...args], { encoding: 'utf8' });
const description = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

const existing = existsSync(ID_FILE) ? readFileSync(ID_FILE, 'utf8').trim() : '';
const output = existing
  ? clasp('deploy', '-i', existing, '-d', description)
  : clasp('deploy', '-d', description);
console.log(output.trim());

if (!existing) {
  const id = output.match(/- (AKfy[\w-]+)/)?.[1];
  if (!id) throw new Error('Could not find the deployment ID in clasp output above.');
  writeFileSync(ID_FILE, id + '\n');
  console.log(`Saved ${ID_FILE}. Commit it so every session redeploys the same URL.`);
}
const id = existing || readFileSync(ID_FILE, 'utf8').trim();
console.log(`Web app: https://script.google.com/macros/s/${id}/exec`);
