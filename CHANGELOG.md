# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.14.0] - 2026-07-12

### Added
- **Streak freezes are now earnable**: kids earn one at every streak milestone
  from 7 days up (7, 14, 30, ...), stockpiling up to 3 — a freeze is used
  automatically to protect the streak on a missed day
- **Streak milestone notifications**: hitting a milestone now sends a push
  celebration to the kid and the parents
- **"Requires approval" toggle** on the reward form — make any reward instant
  or parent-approved
- **Chore categories in the chore form** — pick a category when creating or
  editing a chore, so kids can filter their list by room or type
- **Allowance settings panel** — set points-per-dollar and the minimum payout
  right from the Allowance page (gear icon)

### Changed
- The Help guide was rewritten to match how the app actually works today,
  including new sections for Badges & Challenges and Notifications

## [0.13.1] - 2026-07-12

### Fixed
- Push notifications now show the KidsChores icon instead of the browser's
  logo (the notification artwork pointed at files that didn't exist)
- New status-bar badge icon so Android shows the KidsChores spark silhouette
  in the notification shade

## [0.13.0] - 2026-07-12

### Added — install KidsChores like an app

KidsChores can now be **installed to your phone's home screen** — it opens
full-screen with its own icon, just like a native app.

- On Android (Chrome): tap the **Install app** prompt, or use the new
  "Install the app" card on the Help page
- On iPhone/iPad: the Help page shows the Add-to-Home-Screen steps
- Proper app icon on every launcher shape (new maskable icon)

### Changed
- README documents the install flow

## [0.12.0] - 2026-07-11

### Changed — icons get their colors back

Chore, category, and reward icons are now **full-color emoji artwork**
(Twemoji) — the pizza is red, the dog is brown, the gift has a ribbon — and
they render identically on every phone, tablet, and computer (native emoji
used to look different per device; this artwork doesn't).

- The icon picker shows the same colorful artwork
- Everything you already picked keeps working — stored icons swap artwork
  automatically, nothing to re-select
- Navigation and buttons keep the sleek monochrome line style

### Added
- Twemoji artwork attribution (CC-BY 4.0) on the Help page

## [0.11.0] - 2026-07-11

### Changed — line icons everywhere

The last emoji surface is gone: chore, category, and reward icons are now
crisp line icons matching the Midnight + Electric design.

- **Icon picker**: choose from a curated, searchable set of ~35 icons when
  creating chores and rewards — in onboarding AND (new) in the parent
  dashboard edit forms
- **Your existing data migrates itself**: known emoji icons convert to their
  matching line icon on first launch; a custom emoji you typed yourself keeps
  rendering until you edit it
- Category colors align with the app's accent palette
- Consistent icon rendering everywhere (history, onboarding, category chips
  — a few spots previously showed raw text)

## [0.10.1] - 2026-07-11

### Fixed
- **Allowance balance card was invisible in light theme** (white text on a
  white card). Root cause: custom component classes were unlayered CSS and
  silently beat Tailwind utility overrides — all component classes now live
  in `@layer components`, and the balance card uses the neutral design-system
  treatment (accent numerals on a plain card)
- Reward Shop restyled to the design system (flat volt CTAs with dark text,
  neutral icon tiles) — it had kept the old green-gradient treatment
- Light theme contrast tightened to WCAG AA: hero cyan and volt deepened for
  small text, muted text darkened, category chips now use theme-token text
  (stored category colors are decorative backgrounds/borders only)
- Onboarding category cards had an undefined border variable (white borders
  in dark mode)

### Added
- Automated color-contrast CI gate: axe-core scans Home/Allowance/Chores/
  Rewards in both themes on every push (`e2e/ui/contrast.spec.ts`)

## [0.10.0] - 2026-07-11

### Changed — "Midnight + Electric" redesign

A ground-up visual redesign: modern and sleek, still made for kids — no longer
a children's game. Dark is now the flagship theme and the default.

- **Dark-first design system**: deep blue-charcoal surfaces, one electric-cyan
  hero accent, volt green for points; a derived cool-light variant remains for
  bright rooms (theme toggle unchanged)
- **Per-kid accent colors** replace the rainbow gradient cards: each kid's hue
  now lives in the card edge, avatar ring, numerals, and progress ring
- **Ring progress**: today's progress renders as a conic ring in the kid's
  accent on Home and Chores
- **New typography**: Space Grotesk display face for headings and the big
  point/streak numbers (tabular)
- **Grown-up gamification art**: badges and levels on bronze/silver/gold
  metal chips (legendary glows), streaks as a gradient flame, celebrations
  restrained to a 5-color brand burst
- **New logo**: a clean geometric spark replaces the Chorbie mascot
  (favicons updated to match)

### Removed
- The Chorbie mascot (all screens)
- Seasonal themes, floating emoji particles, and holiday banners
- Emoji avatars (kids now get an initial in their accent ring; the per-kid
  color picker remains)

## [0.9.0] - 2026-07-11

Gamification release: the badges & challenges engine — plus the security-hardening and full test infrastructure that landed since 0.8.2.

### Added
- **Badges!** Kids now earn achievement badges automatically: First Steps, streak badges (3/7/30 days), Early Bird (chore before 8 AM), Team Player (10 shared chores), Goal Crusher (1000 points), Champion (first reward), Legend (2500 points) — with a full-screen confetti celebration on the kid's device when a new badge unlocks, badge push notifications, and real badge art (with rarity rings) on the Home cards. Parents can also create custom badges and grant any badge manually.
- **Challenges!** Parents start time-boxed goals from templates (Weekend Warrior, Point Sprint, Perfect Week) in the new Parent → Challenges tab; kids see live progress bars on their Chores page; finishing awards bonus points and sometimes a badge — exactly once.
- **Continuous integration got teeth**: every change now runs a 34-test backend suite and the full ~220-test end-to-end suite against a real stack before it can merge; dependency updates arrive automatically via Dependabot.

### Security & infrastructure
- Replaced an unmaintained JWT library (python-jose, 2 CVEs) with PyJWT; removed an unused password-hashing dependency.
- Google sign-in now requires a verified email and validates the token audience.
- The web server runs unprivileged (non-root nginx); proxy-header trust is locked down (no more trust-everything); refresh tokens live 14 days instead of 30.
- Error monitoring hooks (Sentry) ship ready to activate; every API response carries a request ID for troubleshooting.

## [0.8.2] - 2026-07-11

UI polish release from the July 2026 UX review (P1 pass, `docs/UX-REVIEW-2026-07.md` §4). Same features, noticeably more consistent and accessible.

### Added
- **Avatar personalization**: pick an emoji and color for each kid (Parent → Kids → Edit) — shows on the kid picker, Home cards, and profile circles. Saved per device.
- **Tablet & desktop layouts**: kid cards go two-column on wider screens and the app uses more of the window on desktop.
- **Inline form validation** on sign-in/sign-up: clear field-level messages instead of silent failures.

### Changed
- **Consistent buttons, tabs, and pills everywhere** — one shared component set replaces the six divergent styles that had accumulated (approve/deny, admin tabs, kid selectors, view toggles, reward buttons).
- **Kid cards got depth**: soft elevation, a subtle light-play gradient, and better text contrast on the lighter kid colors.
- **Calmer everyday decoration**: the floating sparkles now sit at the screen edges instead of drifting over content; seasonal themes keep their full personality.
- Headings follow the brand typography hierarchy consistently.

### Accessibility
- Every icon-only button now has a proper screen-reader label; keyboard users get a visible focus ring everywhere; the bottom nav announces the current page; the theme menu behaves like a real menu (Escape closes it and returns focus); error screens no longer expose technical details.

## [0.8.1] - 2026-07-11

Design-system repair release from the July 2026 UX review (`docs/UX-REVIEW-2026-07.md`), plus the project's first CI pipeline.

### Fixed
- **Card shadows render again.** The `shadow-card`/`shadow-sm/md/lg` utilities pointed at CSS variables that never existed, so cards across ~20 screens (Home kid cards, kid picker, rewards, level badges) silently rendered flat. They now use the real theme-aware shadow tokens.
- **Allowance and Notification Settings inputs are styled again.** The `.input` and `.btn-outline` classes used by those pages were never defined, leaving browser-default form controls; both are now proper themed components.
- **Error/destructive states show their color again.** The `error-*` color scale referenced across 12 files (login error banner, destructive hovers, negative point changes) was missing from the Tailwind config.
- **Help-page accordion dividers are visible again** (undefined border token).
- **Push-notification icons display correctly** (the service worker referenced icon paths that never existed).
- **Confetti uses the brand palette** instead of leftover colors from the retired neon dark theme.

### Added
- **Continuous integration**: every push and pull request now runs frontend lint, typecheck, build, and unit tests plus a backend startup check (GitHub Actions).

### Internal
- Unit tests run again on Node 25+ (Web Storage API conflict with the jsdom test environment; the theme test suite was silently failing).
- Brand guidelines reconciled with the shipped dark-mode palette; dropped a declared-but-never-loaded font.

## [0.8.0] - 2026-07-05

Security & hardening release from a full security / data-integrity / UX audit.

### Security
- **Blocked the unauthenticated database-wipe endpoint in production.** `/api/test/*` (including the destructive `/api/test/reset`) is now mounted only in explicit `development`/`test` environments (fail-closed — an unset `ENVIRONMENT` no longer exposes it), and the endpoints additionally require an authenticated admin. `ENVIRONMENT=production` is now set in the deploy configs.
- **Rejected placeholder JWT secrets at startup.** The startup guard now refuses any known placeholder (including the one shipped in `.env.example`) or a secret shorter than 16 characters, so an app can no longer boot with a publicly-known signing key.
- **Proper parent/kid authorization model.** Management actions (create/edit/delete kids, chores, rewards, parents, categories; approve/deny; adjust points; allowance payouts; invitations) now require a **parent** account instead of only the first-registered admin — so second parents can finally manage the family — while kid accounts are blocked. Kid-facing actions and reads (claim, redeem, streak-freeze, allowance convert, per-kid stats/streaks/history/export) now enforce that a kid can only touch their own data.
- **Enforced API-token expiry** (previously ignored — "expired" tokens kept working forever).
- **Fixed a push-notification hijack:** subscription ownership is derived server-side, so a kid can no longer register as a parent subscription and receive the family's parent alerts. Notification preferences are now self-only.
- **Per-account login rate limiting** (in addition to per-IP) to resist brute-forcing a specific account behind a reverse proxy.
- **Added a Content-Security-Policy** to the web server (defense-in-depth for the token-in-storage XSS surface).

### Fixed
- **Chore/reward notifications now actually send** — background tasks were using a database session that had already been closed, so every push/email silently failed.
- **Accepting a parent invitation now logs you in** (the auto-login was calling the wrong function and silently failing).
- **Approving a chore worth 0 points no longer silently awards the default;** point math now rounds instead of truncating.
- **Reward approval re-checks the balance** and uses the amount recorded at redemption, preventing negative balances and cost drift.
- **The reward "Deny" button now works** (it previously did nothing).
- **Claiming a chore only celebrates on real success** — the confetti/points animation no longer appears when a claim fails.
- **Chores and Rewards pages now show a distinct error state** (with a retry) instead of an empty "nothing here" message when the API is unreachable.
- **Fixed an infinite refresh loop / request storm** when a refresh token expired (now cleanly logs out).
- Approvals now record the actual approving parent's name instead of a hardcoded "Parent".

### Changed
- Allowance page hides parent-only payout actions from kid sessions; delete-confirmation dialog now traps initial focus and closes on Escape; parent PIN inputs are masked.

## [0.7.9] - 2026-02-23

### Changed
- **Modern Warm Minimal UI redesign**: Complete visual overhaul from neobrutalist to refined modern style
  - New color system: Iris Violet primary (hsl 252), Sand warm grays, deep navy dark mode
  - Plus Jakarta Sans font (replacing Inter)
  - Soft 1px borders, subtle box shadows, rounded-lg corners throughout
  - 5 seasonal themes refined (Default, Halloween, Christmas, Easter, Summer) with HSL palette
  - Reduced ambient glow opacity and softer kid color gradients
  - Modernized all component classes (cards, badges, buttons, inputs)
  - Sentence case labels (removed uppercase/tracking-wide)
  - Smoother micro-interactions (translateY hover, scale active, spring focus rings)
  - Softer Chorbie mascot animations (reduced bounce, slower timing)
- **Theme toggle on login screen**: ThemeToggle component added to login page for pre-auth theme preview

## [0.7.8] - 2026-02-20

### Added
- **Category selection toggle**: Onboarding CategoriesStep cards are now interactive — tap to select/deselect with visual feedback (colored border, tinted background, checkmark)
- **Accordion chore picker**: AddChoresStep redesigned with expandable accordion sections per category, replacing horizontal scroll strip
- **Bulk "Add All Suggestions"**: One-tap button to add all suggested chores for a category at once
- **Count badges**: Per-category chore count badges on accordion headers
- **Custom chore category selector**: Custom chore form now includes category dropdown (accessible without selecting a category first)
- **Total chore counter**: Summary footer showing total chores added across all categories

### Fixed
- **Duplicate categories**: Case-insensitive dedup guard on seed-defaults endpoint, unique constraint on category name column
- **E2E auth rate limiting**: File-based token caching in test-database.ts shared across all 17 test files (3-tier cache: in-memory, file, API)

### Changed
- Category deselection in onboarding deletes unwanted categories before advancing to Add Chores step

## [0.7.7] - 2026-02-19

### Added
- **Onboarding skip button**: "Skip for now" link visible on all wizard steps (except final), navigates directly to dashboard
- **Adult chore assignees**: Parents can now be assigned to chores alongside kids in Add/Edit forms, with "Adults:" section below kid toggles
- **Inline chore editing**: Edit form now expands in-place on the chore card instead of jumping to top of section, with smooth scroll-into-view

### Changed
- Chore card "Assigned" display resolves both kid and parent names

## [0.7.5] - 2026-02-18

### Security
- **Authentication on all endpoints**: All 10 API routers now require JWT authentication (previously some were unprotected)
- **JWT secret required at startup**: App refuses to start with default/empty JWT secret
- **Parent name from JWT**: Approval endpoints derive parent_name from JWT token, not request body
- **PIN rate limiting**: 5 attempts per minute per parent ID with lockout
- **HTML escape in emails**: All user-supplied values escaped in email templates
- **PIN removed from API responses**: ParentResponse schema no longer includes PIN hash
- **Refresh token rejection**: Access-only endpoints reject refresh tokens

### Added
- **React Error Boundary**: Graceful crash recovery with retry UI
- **Axios error interceptor**: Auto-toast for network errors, 403, and 500+ responses
- **Global mutation error handling**: QueryClient default onError catches 400/422 validation errors across all 25+ mutations
- **Background task error handling**: All background tasks (notifications, email) wrapped in try/except with structured logging
- **Database indexes**: 9 indexes on frequently-queried columns (ChoreClaim, RewardClaim, AllowancePayout, PushSubscription)
- **Response schemas**: MessageResponse, PendingCountResponse, ApprovalHistoryItem for previously untyped endpoints
- **Typed approval claims**: PendingChoreClaim and PendingRewardClaim interfaces replace `any[]`

### Changed
- **Admin page decomposed**: Monolithic Admin.tsx (1,311 lines) split into 9 self-contained components in components/admin/
- **N+1 query fix**: Approval history endpoint uses joinedload instead of per-row queries
- **Structured logging**: All 10 routers have loggers; email_service and push_service replaced 9 print() calls with proper logging
- **Dependencies pinned**: All 15 backend packages pinned to exact versions for reproducible builds

### Fixed
- **ErrorBoundary type import**: ReactNode import uses type-only syntax for verbatimModuleSyntax compatibility
- **Theme token consistency**: CategoryBadge and ErrorBoundary use CSS custom properties instead of hardcoded gray classes

### Removed
- **Dead CSS**: Deleted unused App.css (Vite template boilerplate)
- **Console.log**: Removed production console.log from push notification hook

### Accessibility
- **Delete modal**: Added role="dialog", aria-modal="true", aria-labelledby
- **Google link input**: Added aria-label for screen readers

## [0.7.0] - 2026-02-16

### Changed
- **Open-sourced on GitHub**: All configuration defaults genericized for any deployment (no hardcoded infrastructure references)
- **Build script**: Registry and repository now configurable via `DOCKER_REGISTRY` and `DOCKER_REPO` environment variables
- **E2E tests**: All test URLs now use environment variables with `localhost:3103` defaults

### Added
- **CONTRIBUTING.md**: Development setup guide, coding standards, PR process
- **SECURITY.md**: Vulnerability reporting policy
- **CODE_OF_CONDUCT.md**: Contributor Covenant v2.1
- **Nginx security headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Removed
- Hardcoded infrastructure references from all configuration defaults
- Stale `hacs.json` from upstream Home Assistant fork

## [0.6.1] - 2026-02-16

### Fixed
- **Google OAuth invalid_client error**: Removed Dockerfile ARG/ENV that blanked `VITE_GOOGLE_CLIENT_ID` at build time — Google Client ID now correctly read from `frontend/.env.production`
- **Register page Google redirect URI**: Used `window.location.origin` instead of `VITE_GOOGLE_REDIRECT_ORIGIN` env var, causing redirect URI mismatch on non-standard ports
- **SQLite read-only database**: Non-root container user (UID 999) couldn't write to root-owned mounted volume — documented `chown -R 999:999` requirement for NAS deployments

### Changed
- **Frontend Google SSO configuration**: `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_REDIRECT_ORIGIN` now set exclusively via `frontend/.env.production` (not Dockerfile build args)
- **Documentation**: Updated README, `.env.example`, and Google SSO setup instructions to reflect build-time vs runtime variable separation

## [0.6.0] - 2026-02-16

### Changed
- **Docker containerization**: Backend and frontend now build as self-contained Docker images pushed to a container registry
- **Multi-stage backend Dockerfile**: Dependencies installed in builder stage via venv, clean copy to production image. Eliminates ~90s pip install on every container restart.
- **Multi-stage frontend Dockerfile**: Node.js builds static assets, served by nginx:1.27-alpine. No more volume-mounted dist/ directory.
- **Non-root container user**: Backend runs as `kidschores` user (security best practice)
- **Proxy headers**: uvicorn configured with `--proxy-headers --forwarded-allow-ips *` for Traefik
- **Build script**: `scripts/build-and-push.sh` for repeatable image builds and registry pushes

### Fixed
- **Missing passlib dependency**: Added `passlib[bcrypt]>=1.7.4` to requirements.txt (was only in inline pip install command)

## [0.5.3] - 2026-02-16

### Fixed
- **Tailwind v4 theme system completely broken**: Added missing `@config` directive — ALL custom theme utility classes (`bg-primary-500`, `text-text-primary`, `bg-bg-surface`, etc.) were silently not generating CSS. Selected buttons, backgrounds, and text colors across entire app now work correctly.
- **Kid selector invisible**: Selected kid button had transparent background (no `bg-primary-500` CSS) with dark text, invisible on dark themes. Now properly themed with ARIA `role="tab"` + `aria-selected` accessibility attributes.
- **View toggle invisible**: Stats/Calendar/List and Today/All selected state had same invisible styling; replaced inline `style` with Tailwind `text-text-inverse` class
- **Zero points not displayed**: `0` points treated as falsy, hiding the points badge; fixed with null check
- **Calendar empty beyond 60 days**: Analytics query now dynamically extends range based on calendar navigation
- **Export error silent**: Added toast notifications for export success/failure
- **Stats/Calendar loading states**: Added skeleton loaders while analytics data loads
- **Christmas dark mode border contrast**: Brightened `--border-color` from `#993344` to `#AD3F52` (2.74:1 → 3.41:1, WCAG 1.4.11 compliance)
- **Analytics stuck loading for kids with history**: Timezone-aware vs naive datetime comparison — old claims stored as naive UTC, v0.5.2 comparison used aware UTC, causing `TypeError`. Normalized all comparisons to naive UTC.
- **Analytics/history error handling**: Added error state UI for all views (Stats, Calendar, List) — previously showed blank space on API failure

### Performance
- **Backend N+1 query elimination**: `get_history`, `get_analytics`, and `export_csv` rewritten with SQL joins and bulk-loading (40+ queries per page → 3-4 queries)

## [0.5.2] - 2026-02-15

### Security
- **bcrypt password hashing**: Migrated from SHA256 to bcrypt (12 rounds) with transparent rehash-on-login
- **Login rate limiting**: 5 attempts per IP per 5-minute window (HTTP 429)
- **CORS restriction**: Tightened from wildcard `*` to explicit allowed origins
- **PIN migration**: Plaintext PINs auto-migrate to bcrypt on first verification
- **Password validation**: Minimum 8 characters enforced on registration
- **Admin authorization**: Added `require_admin` dependency for admin-only endpoints
- **Removed test router**: `/api/test` no longer exposes internal state

### Added
- **Google SSO**: OAuth 2.0 authorization code flow with Google sign-in on Login and Register pages
- **Kid Google sign-in**: Kids can sign in via parent portal link sharing (Google OAuth)
- **Google callback page**: Handles OAuth redirect with loading state and error handling
- **Admin middleware**: `require_admin` FastAPI dependency for guarding admin routes

### Changed
- **Dockerfile**: Updated to Python 3.14-slim with baked-in dependencies (eliminates pip install on every start)
- **API token lookup**: Prefix-based database query instead of O(n) full-table scan
- **datetime fix**: All `datetime.utcnow()` replaced with `datetime.now(timezone.utc)` (Python 3.12+ deprecation)
- **Config cleanup**: Removed dead `bcrypt_rounds` and `database_url` settings
- **Dark mode color softening**: Replaced 100% saturation neon colors with Tailwind palette equivalents; structural colors (borders/shadows) separated from content colors; all 5 seasonal themes updated; WCAG AA/AAA compliance verified
- **Version**: Bumped to 0.5.2

### Fixed
- Google OAuth redirect URI now includes `:8443` port for Traefik routing
- Dark mode `--text-muted` contrast improved (4.08:1 → 4.8:1, WCAG AA compliance)

## [0.5.0] - 2026-01-09

### Added
- Password reset functionality with email-based recovery flow

## [0.4.1] - 2026-01-05

### Fixed
- Resolved iframe blank space using relative height
- Fixed Home Assistant iframe blank space using 100dvh viewport units

## [0.4.0] - 2026-01-04

### Added
- **Allowance System**: Convert points to dollars with configurable rates per kid
- **History Tracking**: View all transactions (chores, rewards, payouts) with filtering
- **Chore Categories**: Organize chores by room/type with custom icons and colors
- **Theme System**: Light/dark mode with seasonal themes (Halloween, Christmas, Easter, Summer)
- **Per-Kid Colors**: Customize accent colors for each child
- **Help Section**: Parent FAQ guide with accordion format
- **Notification Settings**: Configure push notification preferences
- **E2E Testing**: Playwright test framework with smoke tests
- **Chorbie Mascot**: Animated character with mood variations

### Changed
- Navigation updated with Allowance and History tabs
- Admin page header includes Help button
- Enhanced animations with reduced motion support

## [0.3.0] - 2026-01-03

### Added
- **Authentication System** (Backend Phase 1)
  - User model with email/password authentication
  - JWT access/refresh token authentication
  - Google OAuth 2.0 support (optional, requires configuration)
  - API tokens for external integrations (e.g., Home Assistant)
  - `/api/auth/register` - Create new account
  - `/api/auth/login` - Email/password login
  - `/api/auth/refresh` - Refresh access token
  - `/api/auth/google` - Google OAuth exchange
  - `/api/auth/me` - Get current user profile
  - `/api/auth/verify-pin` - Verify parent PIN
  - `/api/tokens` - API token CRUD operations

- **Frontend Authentication** (Phase 2)
  - AuthContext with JWT token management
  - ProtectedRoute wrapper for authenticated pages
  - Login page with email/password form
  - Register page with password validation
  - Kid selector page (Netflix-style profile selection)
  - User indicator in header with logout button
  - Automatic token refresh on 401 responses

### Changed
- Parent model now links to User account via `user_id`
- PIN storage migrated to hashed format (`pin_hash`)
- App now requires authentication to access main pages
- Header shows current user/kid profile with quick switch

### Security
- JWT tokens with configurable expiry (24h access, 30d refresh for home use)
- SHA256 password/PIN hashing with salt (home network appropriate)
- API tokens stored as hashes (shown only once at creation)
- Tokens stored in localStorage with automatic cleanup on logout

## [0.2.1] - 2026-01-02

### Fixed
- Theme selector dropdown now has visible background (Tailwind v4 CSS variable fix)
- Selected button text visibility in theme toggle (light/dark/system modes)
- Halloween theme light mode now distinct from dark mode (warm cream vs dark purple)
- Admin tab selected state now visible (inline style fix for CSS variables)
- Default chore icon changed from "mdi:broom" text to 🧹 emoji
- Season button selected state visibility in theme selector

### Changed
- Applied inline style pattern for CSS variable backgrounds throughout theme components
- Updated Halloween light theme with harvest cream (#FFF8F0) background
- Updated Halloween dark theme with spooky purple (#1A0F2E) background

## [0.2.0] - 2026-01-01

### Added
- Edit/Delete UI for Kids, Chores, Rewards, and Parents
- Chore scheduling fields: recurring frequency, due date, applicable days
- Delete confirmation modal for safe deletion
- Edit forms with pre-filled values for all entity types

### Changed
- Updated ChoreUpdate schema to include all scheduling fields
- Enhanced chore cards to show recurring frequency and assigned kids
- Improved API client with update/delete methods for all entities

## [0.1.0] - 2026-01-01

### Added
- Standalone FastAPI backend with SQLAlchemy ORM and SQLite database
- React + Vite + Tailwind CSS v4 frontend
- Docker deployment via Portainer (multi-container stack)
- Traefik HTTPS reverse proxy routing
- Kids management with points, multipliers, and streak tracking
- Parent management with optional PIN verification
- Chore creation with assignment and shared chore support
- Chore claiming and parent approval workflow
- Reward system with point costs and approval workflow
- Admin panel for managing kids, parents, chores, and rewards
- Points adjustment feature for parents
- nginx static server with API proxy for frontend

### Changed
- Converted from Home Assistant integration to standalone web application
- Replaced Home Assistant data store with SQLite database
- Redesigned UI from Home Assistant cards to React SPA

### Attribution
This project is a fork of [KidsChores-HA](https://github.com/ad-ha/kidschores-ha)
by [ad-ha](https://github.com/ad-ha), originally a Home Assistant integration
for family chore management. Licensed under GPL-3.0.
