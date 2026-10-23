// Bundles src/ (ES modules) + gas/ + ui/ into dist/ for `clasp push`.
// Apps Script has no modules: every .js file shares one global scope, so the
// build strips `import` lines and `export` keywords. Consequences, enforced here:
//   - imports must be single-line, named only:  import { a, b } from './x.js';
//   - exports must be `export function|const|let|class name`, no default exports
//   - top-level names must be unique across all of src/ and gas/
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function listFiles(dir, ext) {
  let out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(listFiles(full, ext));
    else if (name.endsWith(ext)) out.push(full);
  }
  return out;
}

export function stripModuleSyntax(source, fileLabel) {
  return source
    .split('\n')
    .map((line, i) => {
      const where = `${fileLabel}:${i + 1}`;
      if (/^\s*import\s/.test(line)) {
        if (!/^\s*import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?\s*$/.test(line)) {
          throw new Error(`${where}: only single-line named imports are supported`);
        }
        return '';
      }
      if (/^\s*export\s+default\b/.test(line)) throw new Error(`${where}: default exports are not supported`);
      if (/^\s*export\s*\{/.test(line)) throw new Error(`${where}: export lists are not supported; export at the declaration`);
      return line.replace(/^(\s*)export\s+(?=(async\s+)?(function|const|let|class)\b)/, '$1');
    })
    .join('\n');
}

// Top-level declarations in a script (src/ after stripping, or gas/).
export function topLevelNames(source) {
  const names = [];
  for (const m of source.matchAll(/^(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.push(m[1]);
  return names;
}

// Apps Script shares one global scope, so a repeated name would silently
// overwrite another file's function. Fail the build instead.
function assertUniqueNames(scripts) {
  const seen = new Map();
  for (const [label, source] of scripts) {
    for (const name of topLevelNames(source)) {
      if (seen.has(name)) throw new Error(`top-level name "${name}" is in both ${seen.get(name)} and ${label}`);
      seen.set(name, label);
    }
  }
}

export function build(outDir = join(ROOT, 'dist')) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // src/core/greeting.js -> dist/src_core_greeting.js (clasp pushes flat files fine)
  const scripts = [];
  for (const file of listFiles(join(ROOT, 'src'), '.js')) {
    const rel = relative(ROOT, file);
    const target = rel.replace(/[\\/]/g, '_');
    const source = stripModuleSyntax(readFileSync(file, 'utf8'), rel);
    scripts.push([rel, source]);
    writeFileSync(join(outDir, target), `// Built from ${rel}. Do not edit.\n` + source);
  }
  for (const file of listFiles(join(ROOT, 'gas'), '.js')) scripts.push([relative(ROOT, file), readFileSync(file, 'utf8')]);
  assertUniqueNames(scripts);
  for (const file of listFiles(join(ROOT, 'gas'), '')) {
    copyFileSync(file, join(outDir, relative(join(ROOT, 'gas'), file).replace(/[\\/]/g, '_')));
  }
  for (const file of listFiles(join(ROOT, 'ui'), '.html')) {
    copyFileSync(file, join(outDir, relative(join(ROOT, 'ui'), file).replace(/[\\/]/g, '_')));
  }
  return outDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = build();
  console.log(`Built ${readdirSync(out).length} files into ${relative(ROOT, out)}/`);
}
