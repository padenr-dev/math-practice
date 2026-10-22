// Builds into a temp folder, then runs every dist/*.js in one shared global
// scope (like Apps Script does) with fake Google services, and calls doGet().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { build, stripModuleSyntax } from '../scripts/build.js';

test('strips module syntax and rejects unsupported forms', () => {
  const out = stripModuleSyntax("import { a } from './a.js';\nexport function f() {}\nexport const x = 1;", 't');
  assert.equal(out, '\nfunction f() {}\nconst x = 1;');
  assert.throws(() => stripModuleSyntax('export default 1;', 't'), /default exports/);
  assert.throws(() => stripModuleSyntax("import * as a from './a.js';", 't'), /named imports/);
});

test('built bundle runs doGet in an Apps Script-like global scope', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mp-build-'));
  try {
    build(dir);
    const files = readdirSync(dir);
    assert.ok(files.includes('appsscript.json'));
    assert.ok(files.includes('index.html'));

    let rendered = null;
    const fakeTemplate = {
      evaluate() { rendered = this.greeting; return this; },
      setTitle() { return this; },
      addMetaTag() { return this; },
    };
    const context = vm.createContext({
      HtmlService: { createTemplateFromFile: (name) => (assert.equal(name, 'index'), fakeTemplate) },
      Session: { getActiveUser: () => ({ getEmail: () => 'paden@school.org' }) },
    });
    const bundle = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
    vm.runInContext(bundle + '\ndoGet();', context);
    assert.equal(rendered, 'Hello, paden@school.org');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
