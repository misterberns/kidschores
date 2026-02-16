# KidsChores

[![Version](https://img.shields.io/badge/Version-v0.6.0-green?style=flat-square)](https://github.com/misterberns/kidschores/releases)
![Status](https://img.shields.io/badge/Status-Deployed-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-GPL%203.0-blue?style=flat-square)

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat-square&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

A standalone family chore management web application with points, rewards, and approval workflows.

## Features

- **Kids Management** - Track points, streaks, and chore completions
- **Chore System** - Create, assign, and track chores with claiming workflow
- **Rewards** - Define rewards with point costs for kids to redeem
- **Parent Approval** - Parents approve chore completions and reward redemptions
- **Points System** - Flexible points with multipliers and adjustments
- **Google SSO** - Parents and kids sign in with Google (optional)
- **Email Notifications** - Parents notified on chore claims and reward redemptions
- **Seasonal Themes** - Halloween, Christmas, Easter, Summer, and default themes
- **Mobile-Responsive** - Works on phones, tablets, and desktops

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Deployment**: Docker multi-stage builds (backend: python:3.14-slim, frontend: nginx:1.27-alpine)

## Quick Start

### Docker Deployment (Recommended)

1. Clone and configure:
   ```bash
   git clone https://github.com/misterberns/kidschores.git
   cd kidschores-app
   cp .env.example .env
   # Edit .env — at minimum set JWT_SECRET_KEY
   ```

2. Start the stack:
   ```bash
   docker compose up -d
   ```

3. Access at `http://localhost:3103`

The frontend (nginx) automatically proxies `/api` requests to the backend. The backend runs as a non-root `kidschores` user. Data is persisted in `./data/` (SQLite database).

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
      - "3103:80"
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

> See [`docker-compose.yml`](docker-compose.yml) for the full configuration with healthchecks, Google SSO build args, and email notification settings.

#### Homelab Deployment

For Portainer/Traefik deployments with HTTPS and pre-built registry images, use the stack file in the homelab repo: `portainer-stacks/kidschores-stack.yml` (Portainer Stack ID 137).

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

## Configuration

### Environment Variables

**Backend (runtime):**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET_KEY` | Yes | auto-generated | JWT signing key (set a stable value for production) |
| `DATABASE_PATH` | No | `./data/kidschores.db` | SQLite database file path |
| `CORS_ORIGINS` | No | `https://localhost:3103` | Comma-separated allowed origins |
| `TZ` | No | `America/Chicago` | Timezone |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | JWT access token TTL (24h) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `30` | JWT refresh token TTL |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | `https://localhost:3103/auth/google/callback` | OAuth redirect URI |
| `SMTP_HOST` | No | — | SMTP server for email notifications |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASSWORD` | No | — | SMTP password |
| `SMTP_FROM_EMAIL` | No | — | Sender email address |
| `SMTP_FROM_NAME` | No | `KidsChores` | Sender display name |
| `SMTP_USE_TLS` | No | `true` | Use TLS for SMTP |

**Frontend (build-time — baked into image by Vite):**

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth client ID (must match backend `GOOGLE_CLIENT_ID`) |
| `VITE_GOOGLE_REDIRECT_ORIGIN` | No | Base URL for OAuth redirect (e.g., `http://localhost:3103`) |

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

**Configure in `.env`:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3103/auth/google/callback

# Frontend needs client ID at build time
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_ORIGIN=http://localhost:3103
```

**Rebuild frontend after setting Google vars** (they're baked in at build time):
```bash
docker compose up -d --build
```

**Note:** Google requires a public TLD for production OAuth (`.lan` domains are rejected). For LAN-only deployments, use `localhost` or set up a public domain that resolves to your server's IP.

## API Documentation

Once running, access the interactive API docs at:
- Swagger UI: `http://localhost:3103/api/docs`
- ReDoc: `http://localhost:3103/api/redoc`

## Architecture

```
kidschores-app/
├── backend/                 # FastAPI application
│   ├── Dockerfile           # Multi-stage: python:3.14-slim
│   ├── .dockerignore
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI entry point
│       ├── config.py        # Settings (env vars via pydantic-settings)
│       ├── database.py      # SQLAlchemy setup
│       ├── models.py        # Database models
│       ├── schemas.py       # Pydantic schemas
│       ├── routers/         # API endpoints (auth, kids, chores, rewards)
│       └── services/        # Business logic (email, etc.)
├── frontend/                # React application
│   ├── Dockerfile           # Multi-stage: node:22-alpine → nginx:1.27-alpine
│   ├── .dockerignore
│   ├── nginx.conf           # Nginx config (serves static + proxies /api)
│   ├── package.json
│   └── src/
│       ├── api/             # API client (axios)
│       ├── auth/            # Auth context + Google callback
│       ├── pages/           # Page components
│       ├── components/      # Shared components
│       └── theme/           # Colors, seasonal themes
├── scripts/
│   └── kc-build.sh          # Build + push to registry
├── docker-compose.yml       # Standalone deployment (builds locally)
├── .env.example             # Environment variable template
├── CHANGELOG.md             # Version history
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

This standalone fork extracts the core chore/reward functionality into a
self-contained web app that runs independently of Home Assistant.

## License

This project is licensed under the GNU General Public License v3.0 -
see the [LICENSE](LICENSE) file for details.

The original KidsChores-HA project is also GPL-3.0 licensed.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Version

Current version: **0.6.0** (see [CHANGELOG.md](CHANGELOG.md) for history)
