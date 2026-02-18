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
