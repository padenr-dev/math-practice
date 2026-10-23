// Builds into a temp folder, then runs every dist/*.js in one shared global
// scope (like Apps Script does) with fake Google services, and calls doGet()
// and the practice server functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { build, stripModuleSyntax, topLevelNames } from '../scripts/build.js';
import { buildPreview } from '../scripts/preview.js';

test('strips module syntax and rejects unsupported forms', () => {
  const out = stripModuleSyntax("import { a } from './a.js';\nexport function f() {}\nexport const x = 1;", 't');
  assert.equal(out, '\nfunction f() {}\nconst x = 1;');
  assert.throws(() => stripModuleSyntax('export default 1;', 't'), /default exports/);
  assert.throws(() => stripModuleSyntax("import * as a from './a.js';", 't'), /named imports/);
});

test('built bundle runs doGet and the practice server functions in an Apps Script-like global scope', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mp-build-'));
  try {
    build(dir);
    const files = readdirSync(dir);
    for (const f of ['appsscript.json', 'practice.html', 'practice_css.html', 'practice_js.html']) assert.ok(files.includes(f), f);

    let rendered = null;
    const fakeTemplate = {
      evaluate() { rendered = this.pageJson; return this; },
      setTitle() { return this; },
      addMetaTag() { return this; },
    };
    const cache = new Map();
    const context = vm.createContext({
      HtmlService: { createTemplateFromFile: (name) => (assert.equal(name, 'practice'), fakeTemplate) },
      Session: { getActiveUser: () => ({ getEmail: () => 'paden@school.org' }) },
      CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v, secs) => (assert.equal(secs, 21600), cache.set(k, v)), remove: (k) => cache.delete(k) }) },
      Utilities: { getUuid: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    });
    const bundle = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
    vm.runInContext(bundle + "\ndoGet({ parameter: { skill: 'A.3' } });", context);
    assert.deepEqual(JSON.parse(rendered), { skill: { id: 'A.3', title: 'Round decimals', category: 'Decimals', grade: 5 }, email: 'paden@school.org' });

    // One question through google.script.run's entry points.
    const view = vm.runInContext("practiceStart('C.1')", context);
    assert.equal(view.id, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    const stored = JSON.parse(cache.get('practice:' + view.id)).question;
    const answered = vm.runInContext(`practiceAnswer(${JSON.stringify(view.id)}, ${JSON.stringify(stored.answerText)})`, context);
    assert.equal(answered.feedback.status, 'correct');
    assert.equal(vm.runInContext(`practiceNext(${JSON.stringify(view.id)})`, context).number, 2);
    assert.equal(vm.runInContext(`practiceFinish(${JSON.stringify(view.id)})`, context).answered, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('preview.html has no scriptlets left and its scripts parse', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mp-preview-test-'));
  try {
    const html = readFileSync(buildPreview(join(dir, 'preview.html')), 'utf8');
    assert.ok(!html.includes('<?'));
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.equal(scripts.length, 3);
    for (const source of scripts) new vm.Script(source);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('finds top-level names so the build can reject duplicates', () => {
  const src = 'function a() {\n  const inner = 1;\n}\nconst B = 2;\nlet c;\nclass D {}\nasync function e() {}';
  assert.deepEqual(topLevelNames(src), ['a', 'B', 'c', 'D', 'e']);
});
