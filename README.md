# KidsChores

[![Release](https://github.com/misterberns/kidschores/badges/release.svg)](https://github.com/misterberns/kidschores/releases)
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

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: React + Vite + Tailwind CSS v4
- **Deployment**: Docker (Portainer) + Traefik reverse proxy

## Quick Start

### Docker Deployment (Recommended)

1. Deploy via Portainer using the stack configuration
2. Access at `https://localhost:3103` (or your configured domain)

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## API Documentation

Once running, access the interactive API docs at:
- Swagger UI: `/docs`
- ReDoc: `/redoc`

## Architecture

```
kidschores-app/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── main.py       # FastAPI app entry point
│   │   ├── database.py   # SQLAlchemy setup
│   │   ├── models.py     # Database models
│   │   ├── schemas.py    # Pydantic schemas
│   │   └── routers/      # API endpoints
│   └── requirements.txt
├── frontend/             # React application
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── pages/        # Page components
│   │   └── components/   # Shared components
│   └── package.json
├── CHANGELOG.md          # Version history
├── VERSION               # Current version
└── LICENSE               # GPL-3.0 License
```

## Configuration

### Environment Variables

**Backend:**
- `DATABASE_URL` - SQLite database path (default: `sqlite:///./kidschores.db`)

**Frontend:**
- `VITE_API_URL` - Backend API URL (default: `/api`)

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

Current version: **0.5.1** (see [CHANGELOG.md](CHANGELOG.md) for history)
