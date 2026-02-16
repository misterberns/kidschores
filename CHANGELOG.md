# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Tailwind v4 theme system completely broken**: Added missing `@config` directive — ALL custom theme utility classes (`bg-primary-500`, `text-text-primary`, `bg-bg-surface`, etc.) were silently not generating CSS. Selected buttons, backgrounds, and text colors across entire app now work correctly.
- **Kid selector invisible**: Selected kid button had transparent background (no `bg-primary-500` CSS) with dark text, invisible on dark themes. Now properly themed with ARIA `role="tab"` + `aria-selected` accessibility attributes.
- **View toggle invisible**: Stats/Calendar/List and Today/All selected state had same invisible styling; replaced inline `style` with Tailwind `text-text-inverse` class
- **Zero points not displayed**: `0` points treated as falsy, hiding the points badge; fixed with null check
- **Calendar empty beyond 60 days**: Analytics query now dynamically extends range based on calendar navigation
- **Export error silent**: Added toast notifications for export success/failure
- **Stats/Calendar loading states**: Added skeleton loaders while analytics data loads
- **Christmas dark mode border contrast**: Brightened `--border-color` from `#993344` to `#AD3F52` (2.74:1 → 3.41:1, WCAG 1.4.11 compliance)

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
