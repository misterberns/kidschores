# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
