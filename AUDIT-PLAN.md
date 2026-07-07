# KidsChores Improvement Audit

**Date**: Feb 17, 2026
**Scope**: 50+ findings from security, code quality, and design audits

## Phases

| # | Scope | Status | Details |
|---|-------|--------|---------|
| 1 | **Security Hardening** | DONE | S1: Auth on all endpoints (10 routers), S2: JWT secret required, S3: parent_name from JWT, S4: PIN rate limiting, S5: HTML escape emails, S6: Remove PIN from response, S7: Reject refresh tokens |
| 2 | **Stability** | DONE | T1: React Error Boundary, T2: Background task logging + try/except, T3: Axios error interceptor, T4: This file + skill update |
| 3 | **Code Quality** | DONE | Q1: Split Admin.tsx (1311→80 lines, 9 new files in components/admin/), Q2: Fix N+1 in approvals.py (joinedload), Q3: Add 9 DB indexes + ensure_indexes() startup |
| 4 | **Design Polish** | DONE | D2a: CategoryBadge theme tokens, D2b: ErrorBoundary theme tokens, D3: Delete dead App.css, D4: DeleteConfirmModal a11y (role/aria-modal/aria-labelledby), D5: GoogleLinkButton aria-label |
| 5 | **Tech Debt** | DONE | L1: Loggers on all 8 routers, L2: Replace print→logger in services, L3: Response schemas (3 new), L4: Type PendingApprovals, L5: Global mutation onError, L6: Remove console.log, L7: Pin dependencies |
| 6 | **Security & Authz Audit (v0.8.0)** | DONE | C1: test-router fail-closed + admin-gated + ENVIRONMENT=production; C2: JWT-secret placeholder guard; H1: require_parent role gate (multi-parent); H2/H3: kid-ownership IDOR guards; H4: API-token expiry; H5: notification-hijack; H6: PIN frontend hygiene; D3: bg-task fresh session; D4/D5/D6: balance/negative/zero-point guards; M1: per-account login limit; M2: refresh-loop; U1: invite auto-login; U2: reward Deny; U3: claim celebration; U4: error states; U5: kid allowance UI; U6: modal focus; M3: CSP |

## Phase 1 Files Modified (17 files)
- `backend/app/deps.py` — Reject refresh tokens
- `backend/app/config.py` — JWT secret required
- `backend/app/main.py` — Startup JWT validation
- `backend/app/schemas.py` — ParentResponse without PIN, optional parent_name in approve
- `backend/app/routers/chores.py` — Auth on all endpoints, parent_name from JWT
- `backend/app/routers/kids.py` — Auth on all endpoints
- `backend/app/routers/rewards.py` — Auth on all endpoints, parent_name from JWT
- `backend/app/routers/parents.py` — Auth/admin, PIN rate limiting, PIN body param
- `backend/app/routers/approvals.py` — Auth on all endpoints
- `backend/app/routers/categories.py` — Auth on GET, admin on mutations
- `backend/app/routers/allowance.py` — Auth on GET, admin on mutations
- `backend/app/routers/notifications.py` — Auth on all endpoints
- `backend/app/routers/history.py` — Auth on all endpoints
- `backend/app/services/email_service.py` — HTML escape user values
- `backend/app/routers/auth.py` — Auto-admin first user
- `e2e/fixtures/test-database.ts` — Authenticated apiContext
- `e2e/api/parents.api.spec.ts` — PIN body instead of query param

## Phase 2 Files Modified (7 files)
- `frontend/src/components/ErrorBoundary.tsx` — NEW: React Error Boundary
- `frontend/src/App.tsx` — Wrap app with ErrorBoundary
- `frontend/src/api/client.ts` — Axios error interceptor (403/500/network toasts)
- `backend/app/routers/chores.py` — Logger + try/except on 3 background task functions
- `backend/app/routers/notifications.py` — Logger + try/except on 2 notification functions
- `AUDIT-PLAN.md` — This file
- `.claude/skills/fullstack-dev/SKILL.md` — Plan Persistence mandate

## Phase 3 Files Modified (14 files)
- `frontend/src/components/admin/DeleteConfirmModal.tsx` — NEW: Extracted delete confirmation modal
- `frontend/src/components/admin/FormElements.tsx` — NEW: Extracted FormInput + FormSelect
- `frontend/src/components/admin/EntityCard.tsx` — NEW: Extracted entity card component
- `frontend/src/components/admin/ApprovalsList.tsx` — NEW: Extracted approvals tab (self-contained)
- `frontend/src/components/admin/KidsSection.tsx` — NEW: Kids tab (AddKid, EditKid, GoogleLink/Unlink)
- `frontend/src/components/admin/ChoresSection.tsx` — NEW: Chores tab (AddChore, EditChore)
- `frontend/src/components/admin/RewardsSection.tsx` — NEW: Rewards tab (AddReward, EditReward)
- `frontend/src/components/admin/ParentsSection.tsx` — NEW: Parents tab (AddParent, EditParent)
- `frontend/src/components/admin/index.ts` — NEW: Barrel re-exports
- `frontend/src/pages/Admin.tsx` — Reduced from 1311 to 80 lines (tab controller only)
- `backend/app/routers/approvals.py` — Replace N+1 queries with joinedload
- `backend/app/models.py` — Add index=True to 9 columns (ChoreClaim, RewardClaim, AllowancePayout, PushSubscription)
- `backend/app/database.py` — Add ensure_indexes() for existing databases
- `backend/app/main.py` — Call ensure_indexes() at startup

## Phase 4 Files Modified (6 files)
- `frontend/src/components/CategoryBadge.tsx` — Replace hardcoded gray classes with theme tokens (bg-bg-accent, text-text-secondary)
- `frontend/src/components/ErrorBoundary.tsx` — Replace text-gray-600/dark:text-gray-400 with text-text-secondary
- `frontend/src/components/admin/DeleteConfirmModal.tsx` — Add role="dialog", aria-modal="true", aria-labelledby
- `frontend/src/components/admin/KidsSection.tsx` — Add aria-label to Google email input
- `frontend/src/App.css` — DELETED (Vite template boilerplate, 36 lines, unused)
- `AUDIT-PLAN.md` — Update Phase 4 status

## Phase 5 Files Modified (17 files)
- `backend/app/routers/kids.py` — Add logger
- `backend/app/routers/approvals.py` — Add logger + response_model (PendingCountResponse, ApprovalHistoryItem)
- `backend/app/routers/auth.py` — Add logger
- `backend/app/routers/rewards.py` — Add logger + response_model (MessageResponse)
- `backend/app/routers/parents.py` — Add logger
- `backend/app/routers/allowance.py` — Add logger
- `backend/app/routers/categories.py` — Add logger
- `backend/app/routers/history.py` — Add logger
- `backend/app/services/email_service.py` — Replace 7 print() with logger, remove traceback import
- `backend/app/services/push_service.py` — Replace 2 print() with logger
- `backend/app/schemas.py` — Add MessageResponse, PendingCountResponse, ApprovalHistoryItem
- `backend/requirements.txt` — Pin all 15 dependencies to exact versions
- `frontend/src/api/client.ts` — Replace any[] with PendingChoreClaim/PendingRewardClaim types
- `frontend/src/components/admin/ApprovalsList.tsx` — Replace (claim: any) with typed claims
- `frontend/src/App.tsx` — Add default mutation onError to QueryClient
- `frontend/src/hooks/usePushNotifications.ts` — Remove console.log
- `AUDIT-PLAN.md` — Update Phase 5 status

## Phase 6 — Security & Authz Audit (v0.8.0, 2026-07-05)

Second full audit (security / data-integrity / performance / UX-a11y). Critical + High findings fixed; the deep data-integrity + performance work is deferred (below).

**Backend:**
- `app/main.py` — fail-closed test-router mount gate (C1); JWT-secret placeholder+length guard (C2); version 0.8.0
- `app/routers/test.py` — `require_admin` + fail-closed env check on reset/status (C1)
- `app/deps.py` — enforce `ApiToken.expires_at` (H4); new `require_parent` / `require_kid_access` / `assert_kid_access` / `get_user_kid` (H1/H2/H3)
- `app/routers/{chores,kids,rewards,parents,categories,allowance,history,approvals}.py` — `require_admin`→`require_parent` on management; kid-ownership on kid-facing endpoints
- `app/routers/notifications.py` — server-derived subscription ownership + self-only prefs (H5)
- `app/routers/chores.py` / `rewards.py` — background tasks open their own session (D3); falsy-0/round (D6); reward-approve balance re-check (D4)
- `app/routers/allowance.py` — `points_to_convert` `Field(gt=0)` (D5)
- `app/routers/auth.py` — per-account login rate limiting (M1)
- Deploy: `docker-compose.yml` (+ homelab `nas-bringup/stacks/kidschores`) set `ENVIRONMENT=production`

**Frontend:**
- `auth/AuthContext.tsx` — refresh-loop guard (M2) + `applyTokens` (U1)
- `pages/AcceptInvitation.tsx` — use `applyTokens` (U1)
- `pages/Chores.tsx` — celebrate on success only + error state (U3/U4)
- `pages/Rewards.tsx` — error state (U4)
- `pages/Allowance.tsx` — hide parent-only actions from kids + gate query by role (U5)
- `components/admin/ApprovalsList.tsx` — wire reward Deny + drop hardcoded "Parent" (U2/U10)
- `components/admin/ParentsSection.tsx` — don't pre-fill PIN + mask input (H6)
- `components/admin/DeleteConfirmModal.tsx` — autofocus + Esc (U6)
- `api/client.ts` — `rewardsApi.disapprove`; PIN documented write-only
- `nginx.conf` — Content-Security-Policy (M3)

### Deferred to a follow-up (tracked, NOT done in v0.8.0)

- **Data integrity (invasive — needs schema + migration work):** enable SQLite `PRAGMA foreign_keys=ON` **together with** `ondelete` cascade declarations + symmetric delete cleanup of JSON id lists (D1 — enabling the PRAGMA alone would make deletes fail); concurrency locking / atomic `UPDATE` on point + payout mutations (D2/D16); money as integer cents (D7/D15); targeted-claim approval for shared chores (D8); timezone normalization UTC↔local (D9); consolidate the 3 competing schema mechanisms — `create_all` + hand migrations + Alembic — onto Alembic with a real baseline; delete the broken `migrations/{migrate_auth,v2_features}.py` (D10/L2).
- **Performance:** add missing FK/filter indexes (P1); paginate unbounded list endpoints (P2); fix N+1s in `get_todays_chores` / category counts / the streak + daily-summary jobs + the frontend per-kid polling fan-out (P3); durable job store + idempotent streak increment + real `points_today` in daily-summary (P4).
- **Lower a11y / quality:** icon-button `aria-label`s (U8); visible focus rings on Login/Register (U9); ErrorBoundary hide raw message (U11); allowance settings gear + DailyProgress error state (U7); `any` cleanup + shared `useKids()` hook; JWT revocation/blocklist + shorter refresh lifetime; constant-time token compares; Google OAuth `email_verified` check; tighten uvicorn `--forwarded-allow-ips`.

### Verification note (must run in the operator's build/local env)

`node_modules` and the backend venv are absent from the canonical tree — full `tsc -b && vite build`, `pytest`, and the Playwright e2e suite must run in the build clone / operator local per the dev-workflow gate. Agent-side checks done: `py_compile` on all backend files + static import-consistency audit (clean). **The nginx CSP (M3) must be validated in the browser console (no CSP violations) at all breakpoints before prod** — relax a specific directive if the built bundle or Google OAuth trips it.
