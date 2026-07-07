# KidsChores Roadmap

Post-`v0.8.0` improvement backlog, from the 2026-07 whole-project audit. `v0.8.0` shipped the **Critical/High security & authorization** fixes (see `CHANGELOG.md` + `AUDIT-PLAN.md`); this file tracks everything deferred, ranked by priority.

**Effort:** S ≈ hours · M ≈ 1–3 days · L ≈ week+. **Impact** is relative to a self-hosted family app going public.

---

## Tier 1 — CI/CD + testing (the foundational gap)

No CI exists (`.github/workflows/` is empty) and the backend has zero tests. This is the highest-leverage work — it makes every later change safe.

- **Add `ci.yml`** — frontend `npm ci → lint → tsc → build → vitest` on every push/PR. **[M · very high]**
- **Wire the existing e2e suite into CI** — `e2e/` already has ~20 spec files / ~239 tests and `playwright.config.ts` gates on `CI` with a ready (commented) `webServer` block that spins up backend + frontend. Uncomment + run in CI against an ephemeral stack. **[M · very high]**
- **Backend `pytest` suite** — cover the v0.8.0 authz helpers (`require_parent`, `require_kid_access`/`assert_kid_access`, `get_user_kid`, `ApiToken.expires_at` expiry) + points/allowance math + the reward-approve balance guard. **[M · high]**
- ~~**Modernize the ~18 stale-selector e2e specs**~~ — ✅ **Done 2026-07-07.** `AdminPage.ts` rewritten to the app's stable `data-testid`s (+ a `Promise.all` waitForResponse race fix); the 7 workflow tests moved off the unauthenticated `page` fixture; `allowance`/`history` rewritten for the `role="tab"` kid selector + single-kid auto-select. `ChoresPage`/`RewardsPage`/`HomePage` were validated working (no change needed). Full e2e green on the `:3104` test instance: **api 112 passed / 1 skipped, chromium 109 passed / 0 failed**.
- **Supply-chain + hygiene** — Dependabot/Renovate; `npm audit` + `pip-audit` in CI; a coverage gate; pre-commit hooks (husky/lint-staged); consolidate the two Playwright configs (`e2e/` vs `frontend/e2e/`). **[S–M · med]**

## Tier 1 — Security-hardening + observability + Docker

- **Auth-dependency risk** — migrate off `python-jose ~=3.3.0` (unmaintained; CVE-2024-33663/33664) to `pyjwt` or `joserfc`; fix the `passlib 1.7.4` + `bcrypt 4.2` compatibility trap (pin `bcrypt<4.1` or drop passlib for direct `bcrypt`). **[M · med-high]**
- **Observability (currently none)** — structured JSON logging + a request-id middleware (backend); **Sentry** on backend + frontend (the `ErrorBoundary` + axios interceptor currently swallow errors), prod sourcemaps, and global `onerror`/`unhandledrejection` handlers. **[M · med-high]**
- **Auth hardening** — JWT revocation/blocklist + shorter refresh TTL; verify Google OAuth `email_verified` + `aud`; tighten uvicorn `--forwarded-allow-ips` off `"*"`; constant-time token compares. **[S–M · med]**
- **Docker** — nginx → `nginxinc/nginx-unprivileged`; compose `no-new-privileges` + `read_only` + `mem_limit`/`cpus` + log rotation; digest-pin base images. **[S–M · med]**

## Tier 2 — Frontend performance + PWA

- **Code-split the single ~701 KB bundle** — `React.lazy` the ~16 route pages in `App.tsx` behind the existing spinner, `manualChunks` for the react/router/framer vendors, and a `lazyWithRetry` wrapper (nginx already caches `/assets` immutable 1y). Biggest perceived-perf win. **[M · high]**
- **Lint/format/a11y** — Prettier + type-aware ESLint (`recommendedTypeChecked`) + `eslint-plugin-jsx-a11y`; a11y polish (icon-button labels, focus rings, ErrorBoundary hides the raw message). **[S–M · med]**
- **Real PWA/offline** — a service-worker `fetch`/precache (Workbox) registered at startup (not only on push opt-in), fix the broken `/icons/…` push-notification icon paths, and a richer `manifest.json`. **[M · med]**

## Tier 3 — Data-integrity + money (invasive; do on an Alembic baseline)

- **Consolidate the schema onto Alembic** — today `create_all` + hand-written `migrations/*.py` + a baseline-less Alembic coexist; establish a baseline first, then delete the broken `migrations/{migrate_auth,v2_features}.py`. **Unlocks the rest.** **[M · high]**
- **Referential integrity** — enable SQLite FK enforcement **with** cascades (enabling PRAGMA `foreign_keys` alone breaks deletes) + JSON-list cleanup, as one migration. **[M]**
- **Concurrency + money** — atomic point mutations / row locks (D2); integer-cents money instead of float dollars (D7); timezone normalization (D9); a durable job store + idempotent streak + a real daily-summary `points_today` (P4). **[M each]**
- **Query perf** — add the missing FK/filter indexes (P1); paginate the unbounded `.all()` list endpoints (P2); fix N+1s + share a `useKids()` hook on the frontend (P3). **[S–M]**

---

*Priorities set with the operator 2026-07: **Tier 1 first** (CI/CD + testing, then security/observability/Docker); frontend-perf and data-integrity rank lower. Item codes (C#/H#/D#/P#/U#) map to `AUDIT-PLAN.md`.*
