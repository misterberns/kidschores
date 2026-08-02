# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.17.x  | Yes       |
| 0.16.x  | No        |
| 0.15.x  | No        |
| < 0.15  | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Use [GitHub Security Advisories](https://github.com/misterberns/kidschores/security/advisories/new) to report privately
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix release**: Depends on severity (critical: ASAP, high: 1-2 weeks, medium/low: next release)

## Security Measures

KidsChores implements the following security practices:

- **Authentication**: JWT tokens (PyJWT) with configurable expiry, bcrypt password hashing (12 rounds). The app **refuses to start** with a missing/placeholder/too-short `JWT_SECRET_KEY`. Google sign-in requires a verified email and a validated token audience.
- **Authorization**: parent/kid role model — management actions require a parent account; kid accounts can only act on and read their own data (object-level ownership checks).
- **API tokens**: hashed at rest, prefix-narrowed lookup, and **expiry is enforced** at authentication time.
- **Rate limiting**: login attempts rate-limited **per account (email) and per IP**.
- **CORS**: configurable allowed origins (no wildcard in production).
- **Test endpoints**: the destructive `/api/test/*` reset endpoints are **fail-closed** — mounted only in explicit `development`/`test` environments and additionally require an authenticated admin.
- **Non-root containers**: backend runs as an unprivileged user; frontend uses the unprivileged nginx image (listens on 8080).
- **Proxy trust**: uvicorn only honors `X-Forwarded-*` headers from `FORWARDED_ALLOW_IPS` (fail-closed to `127.0.0.1`).
- **Security headers + CSP**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and a Content-Security-Policy.
- **Push-notification ownership**: subscriptions are bound server-side to the caller (a kid cannot register as a parent subscription).
- **Input validation**: Pydantic schemas for all API inputs; HTML-escaped email templates.
- **SQL injection prevention**: SQLAlchemy ORM with parameterized queries.
- **No secrets in code**: all credentials loaded from environment variables.

## Dependency scanning

Dependencies are scanned continuously by **Dependabot**, **Aikido Security**, and per-PR
`npm audit` / `pip-audit` reports in CI. CI additionally runs **Safe Chain**
(`@aikidosec/safe-chain`) ahead of every dependency install, which intercepts known-malicious
packages at install time rather than after the fact. The CI security job fails the build on new
**high** or **critical** findings; medium and low are reported without blocking.

### Known non-applicable advisories

An advisory is listed here only when the vulnerable code path provably does not exist in this
application. Each entry is re-checked whenever the dependency is upgraded.

| Advisory | Package | Status | Why it does not apply |
|---|---|---|---|
| [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) — RSC-mode CSRF bypass | `react-router` | Not applicable | The flaw is reachable only in **React Server Components mode**. This frontend is a client-only SPA: it uses declarative `<BrowserRouter>` + `<Routes>`/`<Route>` (`frontend/src/App.tsx`), has no data router (`createBrowserRouter`), defines **no route `action`s or `loader`s**, and has no RSC plugin in `frontend/vite.config.ts`. The only patched release is `8.3.0`, a major version in which `react-router-dom` is discontinued; migrating would rewrite routing across the app to remove a code path this build does not contain. Tracked for the next routing overhaul. |

## Scope

This policy covers the KidsChores application code. Third-party dependencies are managed via `requirements.txt` (Python) and `package.json` (Node.js) — please report upstream vulnerabilities to their respective maintainers.
