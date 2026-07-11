# KidsChores Roadmap

Post-`v0.8.0` improvement backlog, from the 2026-07 whole-project audit. `v0.8.0` shipped the **Critical/High security & authorization** fixes (see `CHANGELOG.md` + `AUDIT-PLAN.md`); this file tracks everything deferred, ranked by priority.

**Effort:** S ≈ hours · M ≈ 1–3 days · L ≈ week+. **Impact** is relative to a self-hosted family app going public.

---

## Tier 1 — CI/CD + testing (the foundational gap)

~~No CI exists (`.github/workflows/` is empty) and the backend has zero tests.~~ **Closed 2026-07-11** — CI now gates every push/PR with lint/typecheck/build/vitest + backend pytest + the full e2e suite.

- ~~**Add `ci.yml`**~~ — ✅ **Done 2026-07-11 (v0.8.1).** Frontend `npm ci → lint(non-blocking) → tsc+build → vitest` + backend job on every push/PR.
- ~~**Wire the existing e2e suite into CI**~~ — ✅ **Done 2026-07-11.** The `e2e` CI job builds the real compose stack (`ENVIRONMENT=test`, ephemeral DB) via `docker compose up --build` and runs the api+chromium projects (~220 tests, retries=2 in CI, HTML report uploaded on failure). Chose the compose stack over the commented vite-dev `webServer` block: prod-shaped nginx→backend proxying, and the vite dev proxy points at prod.
- ~~**Backend `pytest` suite**~~ — ✅ **Done 2026-07-11.** `backend/tests/` (22 tests): v0.8.0 authz (`require_parent` blocks kid accounts + multi-parent allowed, `require_kid_access`/`assert_kid_access` IDOR guards path+body), API-token lifecycle incl. `expires_at` enforcement + revocation, chore-approve points math (default/multiplier-rounding/explicit-0), reward redeem/approve balance guards (insufficient, price-edit-after-redemption, drained-balance re-check), allowance payout lifecycle (deduct/refund-on-cancel/pay, `gt=0` schema guard). Runs in CI (`requirements-dev.txt`).
- ~~**Modernize the ~18 stale-selector e2e specs**~~ — ✅ **Done 2026-07-07.** `AdminPage.ts` rewritten to the app's stable `data-testid`s (+ a `Promise.all` waitForResponse race fix); the 7 workflow tests moved off the unauthenticated `page` fixture; `allowance`/`history` rewritten for the `role="tab"` kid selector + single-kid auto-select. `ChoresPage`/`RewardsPage`/`HomePage` were validated working (no change needed). Full e2e green on the `:3104` test instance: **api 112 passed / 1 skipped, chromium 109 passed / 0 failed**.
- ~~**Supply-chain + hygiene**~~ — ✅ **Mostly done 2026-07-11.** Dependabot (`.github/dependabot.yml`: npm frontend+e2e, pip backend, github-actions, docker digest pins — weekly, minor/patch grouped); `npm audit --audit-level=high` + `pip-audit` as non-blocking CI report steps; the duplicate `frontend/e2e/` + `frontend/playwright.config.ts` removed (root `e2e/` is canonical; its accessibility/error-handling specs cover /help). *Deferred: husky/lint-staged pre-commit (CI already gates) + a hard coverage gate.* **[S]**

## Tier 1 — Security-hardening + observability + Docker

- ~~**Auth-dependency risk**~~ — ✅ **Done 2026-07-11.** python-jose → **pyjwt ~=2.10**; passlib was verified an UNUSED leftover (security.py already used direct bcrypt) and removed from requirements.
- ~~**Observability**~~ — ✅ **Done 2026-07-11.** Backend: `RequestIdMiddleware` (accepts/echoes `X-Request-ID`, per-request access line with duration), `LOG_FORMAT=json` structured logging, **Sentry dormant-until-DSN** (`sentry-sdk[fastapi]`, activates on `SENTRY_DSN`). Frontend: global `onerror`/`unhandledrejection` handlers + `ErrorBoundary` reporting via `utils/monitoring.ts`; `@sentry/react` dynamic-imported only when `VITE_SENTRY_DSN` is set (zero main-bundle cost when off). *Remaining: create a Sentry/GlitchTip account + set the DSNs; prod sourcemaps when Sentry is live.*
- ~~**Auth hardening**~~ — ✅ **Done 2026-07-11** (minus one deliberate deferral). Google sign-in now requires `verified_email` + enforces the id_token `aud`; uvicorn proxy trust off `"*"` → `FORWARDED_ALLOW_IPS` env (Docker private ranges in compose; fail-closed 127.0.0.1 default; uvicorn →~=0.35 for IP-network support); refresh TTL 30d→14d; constant-time reset-token compare. **Deferred: JWT revocation/blocklist** — needs a design decision (DB blocklist vs per-user token-version claim) + frontend logout coordination. **[M · med]**
- ~~**Docker**~~ — ✅ **Done 2026-07-11.** Frontend → `nginxinc/nginx-unprivileged` (uid 101, listens 8080); compose `no-new-privileges` + `mem_limit`/`cpus` + json-file log rotation on both services; base images digest-pinned (`tag@sha256`, Dependabot keeps them fresh). *`read_only` rootfs deferred (needs tmpfs mapping work). Prod gt-stacks compose adopts these at the next deploy — note: the port mapping changes to `:8080` and `FORWARDED_ALLOW_IPS` must be set.*

## Tier 2 — Frontend performance + PWA + UI modernization

*The UI items come from the July 2026 UX review (`docs/UX-REVIEW-2026-07.md`) — full rationale, evidence, and competitor research live there.*

- **P0 broken-token & consistency fixes** — the design system references tokens that don't exist, so parts of the intended design silently don't render: `shadow-card/sm/md/lg` map to undefined `--shadow-*` vars (no-op across ~20 files); `error-*`/`status-error` color scale undefined (12 files); `.input`/`.btn-outline` classes undefined (unstyled native controls on Allowance + NotificationSettings); Accordion `border-border-primary` undefined; phantom Plus Jakarta Sans in `font-sans`; `BRAND-GUIDELINES.md` still documents the retired "Electric Neon" dark palette; `sw.js` push icon paths broken. Pure CSS/config — safe to ride along early. **[S · high]** *(UX-REVIEW §3)*
- **Code-split the single ~701 KB bundle** — `React.lazy` the ~16 route pages in `App.tsx` behind the existing spinner, `manualChunks` for the react/router/framer vendors, and a `lazyWithRetry` wrapper (nginx already caches `/assets` immutable 1y). Biggest perceived-perf win. **[M · high]**
- **UI polish pass** — shared `Button`/`Tabs`/`Pill` primitives replacing ~6 divergent inline styles (the multiplier for everything else); kid-card gradient depth + white-on-gradient contrast fix; purposeful decoration (tame the scattered sparkles); typography hierarchy per `BRAND-GUIDELINES.md`; tablet/desktop responsive pass (phone-column-on-wide-screens today); avatar picker (wire the existing-but-unexposed `ThemeContext.setKidColor` + emoji set); inline form validation. **[M · high]** *(UX-REVIEW §4)*
- **Lint/format/a11y** — Prettier + type-aware ESLint (`recommendedTypeChecked`) + `eslint-plugin-jsx-a11y`; a11y polish (icon-button `aria-label`s U8, focus rings U9, `aria-current` on bottom nav, ThemeToggle menu semantics, ErrorBoundary hides the raw message U11). **[S–M · med]**
- **Real PWA/offline** — a service-worker `fetch`/precache (Workbox) registered at startup (not only on push opt-in), fix the broken `/icons/…` push-notification icon paths, and a richer `manifest.json`. **[M · med]**

## Tier 2.5 — Product features (from the 2026-07 UX review + competitor research)

Operator-selected 2026-07-10; full designs in `docs/UX-REVIEW-2026-07.md` §5. Sequenced after the P0 fixes + shared components; each is additive to the existing chore→points→reward loop.

- **Badges & Challenges engine** — mostly a wiring job: `Badge`/`Bonus`/`Penalty` tables exist (`models.py:295+`) with `Kid.badges` JSON but no router is mounted and nothing awards; frontend already ships `BadgeDisplay` (12 badges w/ rarity), `BadgeGrid`, celebrations. Phase 1: badges router + award logic on the chore-approve path and nightly streak job (the `# Future: Trigger celebration` TODO), newly-awarded returned in the approve response → existing celebration fires. Phase 2: time-boxed `Challenge`s that reward badges. `Bonus`/`Penalty` stay dormant (deliberate). **[M · high]**
- **Savings goals** — the #1 motivator pattern in Greenlight/Rooster-class apps. New `SavingsGoal` model denominated in **points** (renders as $ via the existing `points_per_dollar` — deliberately sidesteps the float-money D7 dependency); `ProgressRing` on Home kid card + Allowance; celebration + one-tap payout-request on completion; parent boost via the existing adjust endpoint. **[M · high]**
- **Kiosk / shared-tablet mode** — the self-hosted differentiator (subscription-gated in commercial apps). `/kiosk` route seeded from the `SelectKid` picker: fullscreen, big tappable today-chores, claim + celebration, idle-return to picker. Auth: a claim-only scoped session — preferred option is finally enforcing the dead `ApiToken.scopes` column (`kiosk` scope), which also closes that audit gap. Landscape-first; builds on the Tier 2 responsive pass. **[M–L · med-high]**

## Tier 3 — Data-integrity + money (invasive; do on an Alembic baseline)

- **Consolidate the schema onto Alembic** — today `create_all` + hand-written `migrations/*.py` + a baseline-less Alembic coexist; establish a baseline first, then delete the broken `migrations/{migrate_auth,v2_features}.py`. **Unlocks the rest.** **[M · high]**
- **Referential integrity** — enable SQLite FK enforcement **with** cascades (enabling PRAGMA `foreign_keys` alone breaks deletes) + JSON-list cleanup, as one migration. **[M]**
- **Concurrency + money** — atomic point mutations / row locks (D2); integer-cents money instead of float dollars (D7); timezone normalization (D9); a durable job store + idempotent streak + a real daily-summary `points_today` (P4). **[M each]**
- **Query perf** — add the missing FK/filter indexes (P1); paginate the unbounded `.all()` list endpoints (P2); fix N+1s + share a `useKids()` hook on the frontend (P3). **[S–M]**

---

*Priorities set with the operator 2026-07: **Tier 1 first** (CI/CD + testing, then security/observability/Docker); frontend-perf and data-integrity rank lower. Item codes (C#/H#/D#/P#/U#) map to `AUDIT-PLAN.md`. The Tier 2 UI items + Tier 2.5 features come from the 2026-07-10 UX review — see `docs/UX-REVIEW-2026-07.md` for evidence, competitor landscape, and the explicitly-deferred list (photo proof, auto-payout job, quiet-hours enforcement, custom recurrence).*
