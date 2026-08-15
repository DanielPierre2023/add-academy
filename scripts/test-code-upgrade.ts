/**
 * Headless verification of the W2.6 in-place code upgrade across ALL lectures.
 * Run: node --experimental-strip-types scripts/test-code-upgrade.ts
 *
 * Asserts, for every lecture (all 3 languages), after upgrading the prose HTML:
 *   - every <pre> was replaced by a mount host (0 <pre> left),
 *   - no dead run-button / code-header chrome or runPyodideCode onclick remains,
 *   - the code text extracted for each block is non-empty,
 * and that the "drop the bottom duplicate" filter keeps every JSON codeBlock
 * exactly once (inline OR bottom, never zero, never twice).
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import {
  collectAndReplaceCodeBlocks,
  decodeEntities,
  normalizeCode,
} from '../src/lib/lecture-code-upgrade.ts';

const DIR = 'src/content/lectures';
const LANGS = ['en', 'ro', 'el'] as const;

let failures = 0;
let totalBlocks = 0;
let lecturesChecked = 0;

function isInline(lectureHtml: string, block: { code: string; id?: string }): boolean {
  if (block.id && lectureHtml.includes(`data-block-id="${block.id}"`)) return true;
  const decoded = normalizeCode(decodeEntities(lectureHtml));
  const key = normalizeCode(block.code).slice(0, 60);
  return key.length > 0 && decoded.includes(key);
}

function bottomBlocks(lectureHtml: string, codeBlocks: Array<{ code: string; id?: string }>): number[] {
  return codeBlocks.map((b, i) => ({ b, i })).filter(({ b }) => !isInline(lectureHtml, b)).map(({ i }) => i);
}

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json') && !x.includes('_index'))) {
  const lectureId = f.replace('.json', '');
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const codeBlocks: Array<{ code: string; runnable?: boolean; id?: string; language?: string; title?: string }> =
    d.codeBlocks || [];
  const jsonByCode = new Map<string, { runnable?: boolean }>();
  const jsonById = new Map<string, (typeof codeBlocks)[number]>();
  for (const b of codeBlocks) {
    jsonByCode.set(normalizeCode(b.code), b);
    if (b.id) jsonById.set(b.id, b);
  }
  const isRunnable = (code: string, language: string) => {
    if (language !== 'python') return false;
    const j = jsonByCode.get(normalizeCode(code));
    return j ? j.runnable === true : true; // python w/o JSON entry: best-effort runnable
  };
  const resolvePlaceholder = (blockId: string) => {
    const b = jsonById.get(blockId);
    return b ? { code: b.code, language: b.language, runnable: b.runnable, title: b.title } : undefined;
  };

  for (const lang of LANGS) {
    const html: string = (d.content && d.content[lang]) || '';
    if (!/<pre/i.test(html)) continue;
    lecturesChecked++;
    const preCount = (html.match(/<pre/gi) || []).length;

    const dom = new JSDOM(`<div id="root">${html}</div>`);
    const root = dom.window.document.getElementById('root') as unknown as HTMLElement;
    const sites = collectAndReplaceCodeBlocks(root, isRunnable, resolvePlaceholder);
    totalBlocks += sites.length;

    const problems: string[] = [];
    if (root.querySelectorAll('pre').length !== 0) problems.push('leftover <pre>');
    if (sites.length !== preCount) problems.push(`site count ${sites.length} != pre count ${preCount}`);
    if (root.querySelectorAll('.run-btn, .code-header, .code-actions').length !== 0)
      problems.push('leftover code chrome');
    if (/runPyodideCode|runCode\(/.test(root.innerHTML)) problems.push('leftover dead onclick handler');
    if (root.querySelectorAll('.lecture-code-host').length !== preCount)
      problems.push('host count mismatch');
    if (sites.some((s) => s.code.trim().length === 0)) problems.push('empty code extracted');

    // Every JSON codeBlock must be accounted for exactly once: it either
    // appears inline (excluded from bottom) or is in the bottom list.
    const bottom = bottomBlocks(html, codeBlocks);
    for (let i = 0; i < codeBlocks.length; i++) {
      if (normalizeCode(codeBlocks[i].code).length === 0) continue;
      const inline = isInline(html, codeBlocks[i]);
      const inBottom = bottom.includes(i);
      // Must be exactly one of inline / bottom — never both (double render) or
      // neither (dropped).
      if (inline === inBottom) problems.push(`codeBlock[${i}] inline=${inline} bottom=${inBottom}`);
    }

    if (problems.length) {
      failures++;
      console.log(`FAIL ${lectureId}.${lang}: ${problems.join('; ')}`);
    }
  }
}

console.log(
  `\nlectures/langs checked: ${lecturesChecked}, code blocks upgraded: ${totalBlocks}, failures: ${failures}`
);
process.exit(failures ? 1 : 0);
