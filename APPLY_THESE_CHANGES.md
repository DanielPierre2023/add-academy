# ADD Academica — improvements delivery (apply guide)

Everything here was built on a fresh clone of `main` (`4942e6c`), typechecked, built, and
verified. Nothing was pushed — apply it yourself as below. Base commit these were built on:
`4942e6c`.

## How to apply (3 steps)

1. **Unzip over your checkout** (files are at their repo paths; 33 files, additive + edits).
2. **Install the new dependencies** (5 added — all free-tier / open-source):
   ```bash
   npm install
   ```
   Added: `qrcode`, `@types/qrcode`, `@upstash/ratelimit`, `@upstash/redis`, `@sentry/nextjs`.
   `package.json` and `package-lock.json` are included, so `npm install` is deterministic.
3. **Run ONE database migration** in the Supabase SQL editor (see next section).

Then commit. `npm run verify` (typecheck + lint budget + content) passes; `next build` is green.

## The one SQL migration — `supabase/migrations/007_certificate_issuance.sql`

Run its contents once in Supabase. It is idempotent and transactional (safe to re-run). It:

- adds a `course_name` column to `academy_certificates`,
- adds a unique `(student_id, course_name)` index (one certificate per student per course),
- adds a `student_id` index for the owner-read RLS policy,
- re-issues `verify_certificate()` to also return `course_name`.

It was tested against a real PostgreSQL 16: applies clean, the verifier returns the new
column, the uniqueness constraint fires, and a second run is a no-op.

## Environment variables (Vercel) — to switch features fully on

Nothing below breaks the build if unset; each feature no-ops until its var exists.

- **Analytics:** add `NEXT_PUBLIC_GA_ID` (`G-…`) — you currently record zero analytics.
- **Error tracking (Sentry):** add `NEXT_PUBLIC_SENTRY_DSN` (and, for source-map upload in
  CI only, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`). Without a DSN, Sentry is a
  no-op and `next.config.ts` is returned unwrapped — the CSP already allows sentry ingest.
- **Durable rate limiting:** add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
  (free Upstash project). Without them the limiter falls back to the previous in-memory
  behaviour, so nothing regresses.
- **Security (still recommended, dashboard-only):** scope your production secrets to
  Production and give Preview its own test-mode keys.

---

## What changed, by item

### A — Server-issued, verifiable certificates (W1.2) ✅
The table, RLS, `verify_certificate()` RPC and `/api/verify-certificate` already existed, but
**no code ever wrote a certificate** — so the verifier always failed and the downloaded file
was client-generated with a self-typed name (forgeable). Now:
- `src/lib/certificates/actions.ts` mints a certificate on the **server**, re-deriving
  completion from the database (≥80% of lectures), using the account's **profile name** (a
  name can be set once, then it's fixed — you can't mint in someone else's name), generating a
  random `verification_hash`, and inserting idempotently via the service role.
- `certificate/page.tsx` is now a server component; `certificate-client.tsx` renders a
  print-ready certificate with an embedded **QR code** and a public verification link.
- `src/app/verify/[hash]/page.tsx` is a new **public verification page** the QR/link points to.

### E — `/review` page now shows the question (W3.2) ✅
The spaced-repetition page asked you to self-grade **without ever showing the question, options,
answer, or explanation**. It now loads each due question (React 19 `use()` + Suspense — no new
lint debt) and renders the text, options, the correct answer on reveal, and the explanation.

### D — Quiz distractors, batch 1 (W2.5) ⏳ (foundational batch done)
Measured exploit: **picking the longest option scored 92.2%** (219/307 questions had the
correct answer as the clear longest). `scripts/quiz-distractors.mjs` measures this and applies
curated, length-balanced, tri-lingual rewrites. **Batch 1 (lectures 0–2, 13 questions, EN/RO/EL)
is done and verified** — the length tell is fully removed on that batch. **Remaining: ~294
questions across 60 quizzes** (stages 2–6 + genai) — same mechanism, continue on approval.

### F — Admin dashboard (W4.5) ✅ (safe scope)
No refactored admin existed anywhere. Extracted `types.ts`, `utils.ts`, `StatCard`, `SearchBar`
from the 2,888-line monolith (now 2,674) and fixed 3 of its 5 lint hazards
(pagination-reset effects → setter wrappers; `Date.now()` purity → module helper). **Overall
lint errors 15 → 12; budget locked at 12.** The deep tab-by-tab render split was deliberately
**not** done big-bang (high regression risk on the live admin without manual QA) — it's the
clear next step for this component.

### B — Durable rate limiting + honest AI metering (W1.5) ✅
`src/lib/rate-limit.ts` now uses Upstash Redis when configured (shared across serverless
instances, survives cold starts) and falls back to the old in-memory limiter otherwise — all 5
call sites updated to `await`. The AI daily cap now counts **user messages sent today** (via
per-message timestamps) instead of conversation rows, closing the "reuse one conversation to get
unlimited Gemini calls" hole.

### C — Sentry error tracking (W0.4) ✅
`@sentry/nextjs` wired the modern Next 16 way (`instrumentation.ts`, `instrumentation-client.ts`,
`sentry.server/edge.config.ts`), **fully DSN-gated** and building green both with and without a
DSN. `next.config.ts` is only wrapped when Sentry env is present.

### G — Colab GPU capstone notebook (W2.3) ✅
`notebooks/ADD_Academica_Capstone_GPU.ipynb` — trains the same architecture you built in NumPy
on a real GPU (Tiny Shakespeare, GPT-2 BPE), then loads **OpenAI's official GPT-2 weights** into
your architecture to prove it's correct. Every code cell is syntax-validated by its generator
(`scripts/build_capstone_notebook.py`). Suggested link: from the capstone (lecture 32b).

## Verification run before packaging
- `tsc --noEmit` → exit 0
- `next build` → green (30 routes; new `/verify/[hash]`, dynamic `/certificate`)
- `npm run verify` (typecheck + lint budget + content) → pass
- content integrity → 68 lectures / 68 files / 63 quizzes / 274 blocks
- migration 007 → applied + behaviour-tested on real PostgreSQL 16
