#!/usr/bin/env node
/**
 * Content integrity gate (W2.1).
 *
 * Guards the class of defects that shipped for months because nothing checked
 * them: index entries with no file, dead next/prev links, hasQuiz lying about
 * a quiz file, and the escaping corruption that printed a literal "\n" to
 * learners (735 occurrences across 115 blocks before the repair).
 *
 * Python execution is verified separately by scripts/verify-python.py, which
 * needs a Python runtime; this script is dependency-free so it always runs.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/lectures';
const QDIR = 'src/content/quizzes';
const problems = [];

const ids = new Set(
  readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== '_index.json').map((f) => f.slice(0, -5))
);
const quizzes = new Set(
  readdirSync(QDIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
);
const index = JSON.parse(readFileSync(join(DIR, '_index.json'), 'utf8'));

for (const l of index.lectures) {
  if (!ids.has(l.id)) problems.push(`index entry "${l.id}" has no lecture file (hard 404)`);
  for (const k of ['next', 'prev']) {
    if (l[k] && !ids.has(l[k])) problems.push(`${l.id}.${k} -> "${l[k]}" does not exist`);
  }
  if (Boolean(l.hasQuiz) !== quizzes.has(l.id)) {
    problems.push(`${l.id}.hasQuiz=${l.hasQuiz} but quiz file exists=${quizzes.has(l.id)}`);
  }
}

let blocks = 0;
for (const id of ids) {
  const doc = JSON.parse(readFileSync(join(DIR, `${id}.json`), 'utf8'));
  for (const [i, b] of (doc.codeBlocks || []).entries()) {
    blocks++;
    const code = b.code || '';
    // A literal backslash-backslash-n prints "\n" to the learner.
    if (code.includes('\\\\n')) problems.push(`${id}[${i}] contains the \\\\n corruption`);
    if (b.runnable === true && (b.language || 'python') !== 'python') {
      problems.push(`${id}[${i}] runnable=true but language=${b.language}`);
    }
  }
}

if (problems.length) {
  console.error(`content verification FAILED (${problems.length} problems):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`content OK: ${index.lectures.length} lectures, ${ids.size} files, ${quizzes.size} quizzes, ${blocks} code blocks`);
