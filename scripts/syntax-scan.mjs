import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  const candidates = [
    '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js',
    '/usr/local/lib/node_modules/typescript/lib/typescript.js',
    '/usr/lib/node_modules/typescript/lib/typescript.js',
  ];
  const fallback = candidates.find((candidate) => fs.existsSync(candidate));
  if (!fallback) {
    console.error('Syntax scan FAILED: TypeScript compiler is unavailable');
    process.exit(1);
  }
  ts = require(fallback);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const failures = [];
let tsUnits = 0;
let astroUnits = 0;

const walk = (dir, predicate = () => true) => {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(file, predicate));
    else if (predicate(file)) output.push(file);
  }
  return output;
};

const formatDiagnostic = (diagnostic, label, source) => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (diagnostic.start == null) return `${label}: ${message}`;
  const file = ts.createSourceFile(label, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const { line, character } = file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${label}:${line + 1}:${character + 1}: ${message}`;
};

const scanUnit = (source, label, scriptKind = ts.ScriptKind.TS) => {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      verbatimModuleSyntax: true,
    },
    fileName: label,
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      failures.push(formatDiagnostic(diagnostic, label, source));
    }
  }

  // transpileModule does not expose every parser diagnostic in all compiler versions.
  const parsed = ts.createSourceFile(label, source, ts.ScriptTarget.Latest, true, scriptKind);
  for (const diagnostic of parsed.parseDiagnostics ?? []) {
    failures.push(formatDiagnostic(diagnostic, label, source));
  }
};

for (const file of walk(src, (candidate) => candidate.endsWith('.ts') && !candidate.endsWith('.d.ts'))) {
  const relative = path.relative(root, file);
  scanUnit(fs.readFileSync(file, 'utf8'), relative);
  tsUnits += 1;
}

for (const file of walk(src, (candidate) => candidate.endsWith('.astro'))) {
  const relative = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');

  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatter) {
    scanUnit(frontmatter[1], `${relative}#frontmatter`);
    astroUnits += 1;
  }

  const scriptPattern = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let index = 0;
  for (const match of source.matchAll(scriptPattern)) {
    index += 1;
    scanUnit(match[1], `${relative}#script-${index}`);
    astroUnits += 1;
  }
}

if (failures.length) {
  console.error('Syntax scan FAILED');
  for (const failure of [...new Set(failures)]) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Syntax scan PASS');
console.log(`  ${tsUnits} TypeScript source units parsed`);
console.log(`  ${astroUnits} Astro frontmatter/script units parsed`);
