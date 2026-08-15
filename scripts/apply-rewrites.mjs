/**
 * Merge the workflow's per-chunk rewrite files (scripts/rw/part-*.json) and
 * apply them to the quiz JSONs — options text only, correct[] indices and
 * option counts preserved. Then INDEPENDENTLY verify, across every quiz and
 * every language, that the correct option is never the unique longest.
 *
 *   node scripts/apply-rewrites.mjs           # dry run: report only
 *   node scripts/apply-rewrites.mjs --write   # apply, then verify
 */
import fs from 'fs';
import path from 'path';

const DIR = 'src/content/quizzes';
const RW = 'scripts/rw';
const LANGS = ['en', 'ro', 'el'];
const write = process.argv.includes('--write');

// unicode-aware length (matches how options render)
const len = (s) => [...String(s)].length;

function longestIsCorrect(q) {
  if (!q?.options?.length) return false;
  // "Select all" where every option is correct — length can't be exploited.
  if ((q.correct || []).length >= q.options.length) return false;
  const lens = q.options.map(len);
  const max = Math.max(...lens);
  // Trivially short options (pure numbers/tokens like 4/32/12) carry no
  // meaningful length signal, so the "click the longest" heuristic can't work.
  if (max <= 4) return false;
  const winners = lens.map((l, i) => (l === max ? i : -1)).filter((i) => i >= 0);
  // exploit exists if ANY longest option is a correct one (covers ties too)
  return winners.some((i) => (q.correct || []).includes(i));
}

// 1. merge parts
const merged = {};
for (const p of fs.readdirSync(RW).filter((f) => /^part-.*\.json$/.test(f))) {
  const d = JSON.parse(fs.readFileSync(path.join(RW, p)));
  for (const rawFile of Object.keys(d)) {
    const file = rawFile.replace(/\.json$/, ''); // agents keyed inconsistently
    merged[file] = merged[file] || {};
    Object.assign(merged[file], d[rawFile]);
  }
}

// 2. apply (validating option counts)
const problems = [];
let applied = 0;
for (const file of Object.keys(merged)) {
  const fp = path.join(DIR, `${file}.json`);
  if (!fs.existsSync(fp)) { problems.push(`${file}: file missing`); continue; }
  const doc = JSON.parse(fs.readFileSync(fp));
  let dirty = false;
  for (const qIdxStr of Object.keys(merged[file])) {
    const qIdx = Number(qIdxStr);
    const rw = merged[file][qIdxStr];
    for (const lang of LANGS) {
      const q = doc[lang]?.questions?.[qIdx];
      const opts = rw[lang];
      if (!q || !opts) { problems.push(`${file}.${lang}.q${qIdx}: missing`); continue; }
      if (opts.length !== q.options.length) {
        problems.push(`${file}.${lang}.q${qIdx}: option count ${opts.length}!=${q.options.length}`);
        continue;
      }
      q.options = opts.slice();
      dirty = true;
    }
    applied++;
  }
  if (dirty && write) fs.writeFileSync(fp, JSON.stringify(doc, null, 2) + '\n');
}

// 3. verify across ALL quizzes, ALL languages
const perLang = { en: [0, 0], ro: [0, 0], el: [0, 0] };
const offenders = [];
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
  const doc = JSON.parse(fs.readFileSync(path.join(DIR, f)));
  const file = f.replace('.json', '');
  for (const lang of LANGS) {
    for (const q of doc[lang]?.questions || []) {
      if (!q?.options?.length) continue;
      perLang[lang][1]++;
      if (longestIsCorrect(q)) {
        perLang[lang][0]++;
        offenders.push(`${file}.${lang}.q${q.index}`);
      }
    }
  }
}

console.log(`parts merged: ${Object.keys(merged).length} files, ${applied} questions`);
console.log(write ? 'APPLIED to quiz files.' : '(dry run — pass --write to apply)');
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  problems.forEach((p) => console.log('  ' + p));
}
console.log('\nExploit rate (correct is a longest option) across ALL 63 quizzes:');
for (const l of LANGS) console.log(`  ${l}: ${perLang[l][0]}/${perLang[l][1]} = ${(100 * perLang[l][0] / perLang[l][1]).toFixed(1)}%`);
console.log(`\nremaining offenders total: ${offenders.length}`);
if (offenders.length) console.log('  -> ' + offenders.join(', '));
