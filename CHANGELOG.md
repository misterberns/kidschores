# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
