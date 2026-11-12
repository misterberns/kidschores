# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.18.x  | Yes       |
| 0.17.x  | No        |
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
- **Kiosk pairing codes** (0.18.2): 8 characters from a 31-symbol alphabet, stored only as a SHA-256 hash, single use (an atomic update), valid 10 minutes, and wrong guesses are rate-limited per client. A redeemed code yields a kiosk-scoped token, never a user session.
- **Framing**: CSP `frame-ancestors` is the only framing control (0.18.1; `X-Frame-Options` was removed because it cannot allow a named site). It defaults to `'self'`; an operator can list sites allowed to embed the app with `KC_FRAME_ANCESTORS`, which is validated at container start and falls back to `'self'` when empty or malformed.
- **API tokens**: hashed at rest, prefix-narrowed lookup, and **expiry is enforced** at authentication time. **Scopes are enforced** (0.18.0): a scoped token (today only `kiosk`) is refused by every route except its own, and the general token endpoint refuses scopes it cannot honor. Before 0.18.0 the `scopes` column was stored but never read.
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

Dependencies are scanned continuously by **Dependabot** and **Aikido Security**, with per-PR
`npm audit` / `pip-audit` reports in CI. CI additionally runs **Safe Chain**
(`@aikidosec/safe-chain`) ahead of every dependency install, which intercepts known-malicious
packages at install time rather than after the fact.

Aikido gates pull requests through its **PR Checks app** (configured in the Aikido dashboard, not
in this repo's workflow), covering dependencies, IaC, secrets, SAST, malware and license risk on
the feature branch before it merges.

### Known non-applicable advisories

An advisory is listed here only when the vulnerable code path provably does not exist in this
application. Each entry is re-checked whenever the dependency is upgraded.

| Advisory | Package | Status | Why it does not apply |
|---|---|---|---|
| [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) — RSC-mode CSRF bypass | `react-router` | **Resolved in 0.17.1** | Patched, so this row is history. The advisory now lists `7.18.2` as the first patched 7.x release (it named only `8.3.0` when this row was written), and 0.17.1 ships `7.18.5`. It never applied anyway: the flaw needs React Server Components mode, and this frontend is a client-only SPA with declarative `<BrowserRouter>` routes, no data router, and no route `action`s or `loader`s. Re-checked 2026-11-12. |

## Scope

This policy covers the KidsChores application code. Third-party dependencies are managed via `requirements.txt` (Python) and `package.json` (Node.js) — please report upstream vulnerabilities to their respective maintainers.
