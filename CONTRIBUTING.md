# Contributing to KidsChores

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- Node.js 22+
- Python 3.14+
- Docker and Docker Compose
- Git

## Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000/api/docs` (Swagger UI).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api` to port 8000.

### Docker (Full Stack)

```bash
cp .env.example .env
# Edit .env with your JWT_SECRET_KEY
docker compose up -d --build
```

Access at `http://localhost:3103`.

## Running Tests

### E2E Tests (Playwright)

```bash
cd e2e
npm install
npx playwright install

# Run against a running instance
API_URL=http://localhost:3103 npx playwright test

# Run with UI
API_URL=http://localhost:3103 npx playwright test --ui
```

### Frontend Component Tests

```bash
cd frontend
npx playwright test
```

## Code Style

- **Python**: Follow PEP 8. Use type hints for function signatures.
- **TypeScript**: ESLint config is included. Run `npm run lint` to check.
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat: add new feature`
  - `fix: resolve bug`
  - `docs: update documentation`
  - `refactor: restructure code`
  - `test: add or update tests`

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run tests to ensure nothing is broken
5. Commit with a descriptive message following Conventional Commits
6. Push to your fork and open a Pull Request
7. Describe your changes in the PR description

## Project Structure

```
backend/app/
  routers/     # API endpoint handlers
  models.py    # SQLAlchemy database models
  schemas.py   # Pydantic request/response schemas
  config.py    # Environment variable configuration
  services/    # Business logic (email, etc.)

frontend/src/
  api/         # Axios API client
  auth/        # Authentication context and components
  pages/       # Page-level components
  components/  # Shared/reusable components
  theme/       # Theme system (colors, seasonal themes)
```

## Reporting Bugs

Open a [GitHub Issue](https://github.com/misterberns/kidschores/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Screenshots if applicable

## Feature Requests

Open a [GitHub Issue](https://github.com/misterberns/kidschores/issues) with the `enhancement` label describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered
