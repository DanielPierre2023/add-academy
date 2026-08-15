#!/usr/bin/env node
/**
 * Lint ratchet.
 *
 * The repo carries pre-existing react-hooks debt (set-state-in-effect, purity,
 * memoization) concentrated in admin-dashboard.tsx and a few large views.
 * Fixing it properly means refactoring those components, which is tracked
 * separately — but nothing should be allowed to ADD to it in the meantime.
 *
 * CI fails if the error count exceeds BUDGET. Lower BUDGET as debt is paid off;
 * it must never be raised.
 */
import { execSync } from 'node:child_process';

const BUDGET = 12;

let out = '';
try {
  out = execSync('npx eslint . -f json', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  out = e.stdout || '';
}

let results;
try {
  results = JSON.parse(out);
} catch {
  console.error('lint-budget: could not parse eslint output');
  process.exit(1);
}

const errors = results.reduce((n, f) => n + f.errorCount, 0);
const warnings = results.reduce((n, f) => n + f.warningCount, 0);

const byRule = {};
for (const f of results) {
  for (const m of f.messages) {
    if (m.severity === 2) byRule[m.ruleId ?? 'unknown'] = (byRule[m.ruleId ?? 'unknown'] || 0) + 1;
  }
}

console.log(`eslint: ${errors} errors (budget ${BUDGET}), ${warnings} warnings`);
for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(3)}  ${rule}`);
}

if (errors > BUDGET) {
  console.error(`\nFAIL: ${errors} errors exceeds the budget of ${BUDGET}. Fix the new ones.`);
  process.exit(1);
}
if (errors < BUDGET) {
  console.log(`\nDebt reduced — lower BUDGET in scripts/lint-budget.mjs to ${errors} to lock it in.`);
}
