<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="frontend/src/assets/logo/kc-logo-horizontal-dark.svg">
    <img src="frontend/src/assets/logo/kc-logo-horizontal.svg" width="400" alt="KidsChores">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/misterberns/kidschores/releases"><img src="https://img.shields.io/badge/Version-v0.13.0-green?style=flat-square" alt="Version"></a>
  <a href="https://github.com/misterberns/kidschores/actions/workflows/ci.yml"><img src="https://github.com/misterberns/kidschores/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/License-GPL%203.0-blue?style=flat-square" alt="License">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker">
</p>

<p align="center">A standalone family chore management web application with points, rewards, and approval workflows.</p>

<p align="center">
  <img src="screenshots/home-light.png" alt="KidsChores Dashboard" width="800">
</p>

## Features

- **Kids Management** - Track points, streaks, and chore completions
- **Chore System** - Create, assign, and track chores with claiming workflow
- **Rewards** - Define rewards with point costs for kids to redeem
- **Parent Approval** - Parents approve chore completions and reward redemptions
- **Points System** - Flexible points with multipliers and adjustments
- **Badges & Achievements** - Automatic awards (streaks, milestones, early bird, first reward) with full-screen unlock celebrations, push notifications, and rarity-ringed badge art; parents can create custom badges
- **Challenges** - Time-boxed goals (chore count or points earned) with live progress bars, bonus-point and badge rewards
- **Kid Avatars** - Per-kid emoji + color picker
- **Google SSO** - Parents and kids sign in with Google (optional)
- **Email Notifications** - Parents notified on chore claims and reward redemptions
- **Midnight + Electric design** - Dark-first, sleek theme system with a light variant; per-kid accent colors, ring progress, metal-tier badge art
- **Installable App (PWA)** - Add KidsChores to your phone's home screen (Android install prompt / iOS Add-to-Home-Screen) — full-screen, own icon
- **Mobile-Responsive** - Works on phones, tablets, and desktops
- **Security** - JWT auth (PyJWT) on all endpoints, rate limiting, bcrypt hashing, CORS restriction, unprivileged nginx, locked-down proxy trust
- **Error Handling** - React error boundaries, global error handler, auto-toast notifications
- **CI-Gated Testing** - 34 backend pytest tests + ~220 Playwright e2e tests (API, UI, accessibility, workflows) run on every push; Dependabot keeps dependencies fresh

## Screenshots

<details>
<summary>App Pages (light + dark)</summary>

| Light Mode | Dark Mode |
|:---:|:---:|
| ![Home](screenshots/home-light.png) | ![Home Dark](screenshots/home-dark.png) |
| ![Chores](screenshots/chores-light.png) | ![Chores Dark](screenshots/chores-dark.png) |
| ![Rewards](screenshots/rewards-light.png) | ![Rewards Dark](screenshots/rewards-dark.png) |
| ![Allowance](screenshots/allowance-light.png) | ![Allowance Dark](screenshots/allowance-dark.png) |
| ![Admin](screenshots/admin-light.png) | ![Admin Dark](screenshots/admin-dark.png) |
| ![History](screenshots/history-light.png) | ![History Dark](screenshots/history-dark.png) |

</details>

<details>
<summary>Onboarding Wizard (light + dark)</summary>

| Light Mode | Dark Mode |
|:---:|:---:|
| ![Welcome](screenshots/onboarding-welcome-light.png) | ![Welcome Dark](screenshots/onboarding-welcome-dark.png) |
| ![Add Kids](screenshots/onboarding-kids-light.png) | ![Add Kids Dark](screenshots/onboarding-kids-dark.png) |
| ![Categories](screenshots/onboarding-categories-light.png) | ![Categories Dark](screenshots/onboarding-categories-dark.png) |
| ![Chores](screenshots/onboarding-chores-light.png) | ![Chores Dark](screenshots/onboarding-chores-dark.png) |
| ![Rewards](screenshots/onboarding-rewards-light.png) | ![Rewards Dark](screenshots/onboarding-rewards-dark.png) |
| ![Done](screenshots/onboarding-done-light.png) | ![Done Dark](screenshots/onboarding-done-dark.png) |

</details>

<details>
<summary>Login (light + dark)</summary>

| Light Mode | Dark Mode |
|:---:|:---:|
| ![Login](screenshots/login-light.png) | ![Login Dark](screenshots/login-dark.png) |

</details>

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Deployment**: Docker multi-stage builds (backend: `python:3.13-slim`, frontend: `nginxinc/nginx-unprivileged:1.31-alpine` — both containers run as non-root)

## Quick Start

### Docker Deployment (Recommended)

1. Clone and configure:
   ```bash
   git clone https://github.com/misterberns/kidschores.git
   cd kidschores
   cp .env.example .env
   # Edit .env — at minimum set JWT_SECRET_KEY
   ```

2. Start the stack:
   ```bash
   docker compose up -d
   ```

3. Access at `http://localhost:3103`

The frontend (unprivileged nginx, listening on container port 8080) automatically proxies `/api` requests to the backend. Both containers run as non-root users. Data is persisted in `./data/` (SQLite database).

```bash
docker compose down          # Stop (data persists in ./data/)
docker compose up -d --build # Rebuild after code changes
docker compose logs -f       # View logs
```

**`docker-compose.yml`** (minimal — just what's needed to run):

```yaml
services:
  frontend:
    build: ./frontend
    container_name: kidschores-ui
    ports:
      - "3103:8080"   # unprivileged nginx listens on 8080 inside the container
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: kidschores
    volumes:
      - ./data:/app/data
    environment:
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}        # Required — set in .env
      - CORS_ORIGINS=http://localhost:3103
      - TZ=America/Chicago
      # Optional: Google SSO (see "Google SSO Setup" below)
      # Optional: Email notifications (see .env.example for SMTP vars)
    restart: unless-stopped
```

> See [`docker-compose.yml`](docker-compose.yml) for the full configuration with healthchecks, Google SSO settings, and email notification settings.

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development setup instructions.

## Configuration

### Environment Variables

**Backend (runtime):**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET_KEY` | **Yes** | _none_ | JWT signing key. The app **refuses to start** without a stable, ≥16-char, non-placeholder value. Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `ENVIRONMENT` | No | `production` | Keep `production` (the default) for real deployments. Only `development`/`test` mount the destructive `/api/test/*` reset endpoints — never use them in production. |
| `DATABASE_PATH` | No | `./data/kidschores.db` | SQLite database file path |
| `CORS_ORIGINS` | No | `http://localhost:3103` | Comma-separated allowed origins |
| `APP_BASE_URL` | No | `http://localhost:3103` | Base URL for email links (password reset, invitations) |
| `TZ` | No | `America/Chicago` | Timezone |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | JWT access token TTL (24h) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `14` | JWT refresh token TTL |
| `FORWARDED_ALLOW_IPS` | No | `127.0.0.1` | IPs/CIDRs uvicorn trusts for `X-Forwarded-*` headers (set to your Docker network ranges when behind a proxy; fail-closed by default) |
| `SENTRY_DSN` | No | — | Enables Sentry error reporting (dormant when unset) |
| `LOG_FORMAT` | No | — | Set to `json` for structured log lines |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | `http://localhost:3103/auth/google/callback` | OAuth redirect URI |
| `SMTP_HOST` | No | — | SMTP server for email notifications |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASSWORD` | No | — | SMTP password |
| `SMTP_FROM_EMAIL` | No | — | Sender email address |
| `SMTP_FROM_NAME` | No | `KidsChores` | Sender display name |
| `SMTP_USE_TLS` | No | `true` | Use TLS for SMTP |

**Frontend (build-time — set in `frontend/.env.production`, NOT in `.env`):**

| Variable | Required | File | Description |
|----------|----------|------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | No | `frontend/.env.production` | Google OAuth client ID (must match backend `GOOGLE_CLIENT_ID`) |
| `VITE_GOOGLE_REDIRECT_ORIGIN` | No | `frontend/.env.production` | Base URL for OAuth redirect (e.g., `http://localhost:3103`) |
| `VITE_SENTRY_DSN` | No | `frontend/.env.production` | Enables frontend Sentry error reporting (the SDK is only loaded when set) |

> **Important:** Frontend vars are baked into the image at build time by Vite. They must be set in `frontend/.env.production` before building — they are NOT read from the root `.env` file.

### Google SSO Setup (Optional)

KidsChores supports Google Sign-In for both parents and kids. Parents sign in or register with Google; kids can be linked to a Gmail account from the Admin > Kids tab.

**Setup:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Application type: **Web application**
6. Add **Authorized JavaScript origins**: your app URL (e.g., `http://localhost:3103`)
7. Add **Authorized redirect URIs**: `<your-app-url>/auth/google/callback`
   (e.g., `http://localhost:3103/auth/google/callback`)
8. Copy the **Client ID** and **Client Secret**

**Configure backend vars in `.env`:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3103/auth/google/callback
```

**Configure frontend vars in `frontend/.env.production`:**
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_ORIGIN=http://localhost:3103
```

**Rebuild frontend after changing `frontend/.env.production`** (values are baked in at build time):
```bash
docker compose up -d --build
```

**Note:** Google requires a public TLD for production OAuth (`.lan` domains are rejected). For LAN-only deployments, use `localhost` or set up a public domain that resolves to your server's IP.

## API Documentation

Interactive API docs are served by the backend directly (they are not proxied
through the Docker frontend). With the backend running locally
(`uvicorn app.main:app --reload --port 8000`):
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Architecture

```
kidschores/
├── backend/                 # FastAPI application
│   ├── Dockerfile           # Multi-stage: python:3.13-slim (non-root)
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── requirements-dev.txt # pytest + dev tooling
│   ├── tests/               # Backend pytest suite (authz, tokens, points, gamification)
│   └── app/
│       ├── main.py          # FastAPI entry point
│       ├── config.py        # Settings (env vars via pydantic-settings)
│       ├── database.py      # SQLAlchemy setup
│       ├── models.py        # Database models
│       ├── schemas.py       # Pydantic schemas
│       ├── observability.py # Request-ID middleware, JSON logging, optional Sentry
│       ├── routers/         # API endpoints (auth, kids, chores, rewards, badges, challenges, ...)
│       └── services/        # Business logic (email, gamification, push, etc.)
├── frontend/                # React application
│   ├── Dockerfile           # Multi-stage: node:26-alpine → nginx-unprivileged:1.31-alpine (:8080)
│   ├── .dockerignore
│   ├── nginx.conf           # Nginx config (serves static + proxies /api)
│   ├── package.json
│   └── src/
│       ├── api/             # API client (axios)
│       ├── auth/            # Auth context + Google callback
│       ├── pages/           # Page components
│       ├── components/      # Shared components (ui/ primitives, gamification/, celebrations/)
│       └── theme/           # Colors, seasonal themes
├── e2e/                     # Playwright end-to-end tests
│   ├── api/                 # API tests (CRUD, security)
│   ├── ui/                  # UI tests (accessibility, error handling)
│   ├── fixtures/            # Shared test fixtures and auth helpers
│   └── pages/               # Page Object Models
├── scripts/
│   ├── kc-build.sh          # Build + push to container registry
│   └── check-version-consistency.sh  # CI gate: all version surfaces must match
├── .github/
│   ├── workflows/ci.yml     # CI: frontend checks, backend pytest, full e2e stack
│   └── dependabot.yml       # Weekly dependency updates (npm, pip, actions, docker)
├── docker-compose.yml       # Standalone deployment (builds locally)
├── .env.example             # Environment variable template
├── CHANGELOG.md             # Version history
├── CONTRIBUTING.md           # Development guide
├── SECURITY.md              # Security policy
├── VERSION                  # Current version number
└── LICENSE                  # GPL-3.0
```

## Credits & Attribution

This project is a fork of [KidsChores-HA](https://github.com/ad-ha/kidschores-ha)
by [ad-ha](https://github.com/ad-ha).

**Original Project**: Home Assistant integration for family chore management
**This Fork**: Standalone web application (FastAPI + React)

The original KidsChores-HA is an excellent Home Assistant integration with:
- Gamification features (badges, achievements, challenges)
- Smart notifications and workflow approvals
- Calendar integration and custom scheduling
- Built-in user access control

This standalone fork reimplements the core chore/reward functionality — and,
as of v0.9.0, its own badges & challenges engine — as a self-contained web app
that runs independently of Home Assistant.

**Emoji artwork**: chore/reward/category icons use [Twemoji](https://github.com/jdecked/twemoji)
graphics, © Twitter, Inc and other contributors, licensed under
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). The SVGs are vendored
in `frontend/src/data/twemoji-icons.tsx` (regenerate with
`node frontend/scripts/fetch-twemoji.mjs`).

## License

This project is licensed under the GNU General Public License v3.0 -
see the [LICENSE](LICENSE) file for details.

The original KidsChores-HA project is also GPL-3.0 licensed.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Version

Current version: **0.13.0** (see [CHANGELOG.md](CHANGELOG.md) for history)
