// Writes preview/preview.html: the practice page as one file that runs in any
// browser with no Google account. It inlines the same bundle `npm run build`
// makes, fakes CacheService/Utilities/Session, and fakes google.script.run so
// every call goes through the real gas/Code.js functions. Nothing is saved.
//
//   npm run preview            then open preview/preview.html
//   preview.html?skill=A.3     to try another skill
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_FUNCTIONS = ['practiceStart', 'practiceAnswer', 'practiceNext', 'practiceFinish'];

const FAKE_GOOGLE = `
var PREVIEW_CACHE = new Map();
var CacheService = { getScriptCache: function () { return {
  get: function (k) { return PREVIEW_CACHE.has(k) ? PREVIEW_CACHE.get(k) : null; },
  put: function (k, v) { PREVIEW_CACHE.set(k, String(v)); },
  remove: function (k) { PREVIEW_CACHE.delete(k); },
}; } };
var Utilities = { getUuid: function () { return 'preview-' + Math.random().toString(36).slice(2, 12); } };
var Session = { getActiveUser: function () { return { getEmail: function () { return 'student@example.org'; } }; } };
// Like google.script.run: async, and arguments/results go through JSON.
function previewRunner(onOk, onFail) {
  var runner = {
    withSuccessHandler: function (f) { return previewRunner(f, onFail); },
    withFailureHandler: function (f) { return previewRunner(onOk, f); },
  };
  ${JSON.stringify(SERVER_FUNCTIONS)}.forEach(function (name) {
    runner[name] = function () {
      var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));
      setTimeout(function () {
        try { var result = JSON.parse(JSON.stringify(window[name].apply(null, args))); if (onOk) onOk(result); }
        catch (err) { if (onFail) onFail(err); }
      }, 250);
    };
  });
  return runner;
}
var google = { script: { run: previewRunner(null, null) } };
`;

const PREVIEW_BANNER = `<div style="background:#1b2430;color:#fff;padding:8px 16px;font:14px system-ui,sans-serif">
Preview: no Google account, nothing is saved. Skill:
<a style="color:#9cc2ff" href="?skill=C.1">C.1</a> · <a style="color:#9cc2ff" href="?skill=A.3">A.3</a></div>`;

export function buildPreview(outFile = join(ROOT, 'preview', 'preview.html')) {
  const dir = mkdtempSync(join(tmpdir(), 'mp-preview-'));
  try {
    build(dir);
    const files = readdirSync(dir);
    const bundle = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
    const readHtml = (name) => readFileSync(join(dir, name + '.html'), 'utf8');
    const page = readHtml('practice')
      .replace(/<\?!= include\('(\w+)'\) \?>/g, (_, name) => readHtml(name))
      .replace('<?!= pageJson ?>', "practicePageData(new URLSearchParams(location.search).get('skill') || 'C.1', 'student@example.org')");
    if (/<\?/.test(page)) throw new Error('preview.html still has an Apps Script scriptlet in it');
    const html = page
      .replace('</head>', () => `<script>\n${bundle}\n${FAKE_GOOGLE}\n</script>\n</head>`)
      .replace(/<body>/, () => '<body>\n' + PREVIEW_BANNER);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, html);
    return outFile;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Wrote ${buildPreview()}`);
}
