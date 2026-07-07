# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.8.x   | Yes       |
| < 0.8   | No        |

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

- **Authentication**: JWT tokens with configurable expiry, bcrypt password hashing (12 rounds). The app **refuses to start** with a missing/placeholder/too-short `JWT_SECRET_KEY`.
- **Authorization**: parent/kid role model — management actions require a parent account; kid accounts can only act on and read their own data (object-level ownership checks).
- **API tokens**: hashed at rest, prefix-narrowed lookup, and **expiry is enforced** at authentication time.
- **Rate limiting**: login attempts rate-limited **per account (email) and per IP**.
- **CORS**: configurable allowed origins (no wildcard in production).
- **Test endpoints**: the destructive `/api/test/*` reset endpoints are **fail-closed** — mounted only in explicit `development`/`test` environments and additionally require an authenticated admin.
- **Non-root containers**: backend runs as an unprivileged user.
- **Security headers + CSP**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and a Content-Security-Policy.
- **Push-notification ownership**: subscriptions are bound server-side to the caller (a kid cannot register as a parent subscription).
- **Input validation**: Pydantic schemas for all API inputs; HTML-escaped email templates.
- **SQL injection prevention**: SQLAlchemy ORM with parameterized queries.
- **No secrets in code**: all credentials loaded from environment variables.

## Scope

This policy covers the KidsChores application code. Third-party dependencies are managed via `requirements.txt` (Python) and `package.json` (Node.js) — please report upstream vulnerabilities to their respective maintainers.
