# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.7.x   | Yes       |
| < 0.7   | No        |

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

- **Authentication**: JWT tokens with configurable expiry, bcrypt password hashing (12 rounds)
- **Rate limiting**: Login attempts rate-limited per IP
- **CORS**: Configurable allowed origins (no wildcard in production)
- **Non-root containers**: Backend runs as unprivileged user
- **Security headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Input validation**: Pydantic schemas for all API inputs
- **SQL injection prevention**: SQLAlchemy ORM with parameterized queries
- **No secrets in code**: All credentials loaded from environment variables

## Scope

This policy covers the KidsChores application code. Third-party dependencies are managed via `requirements.txt` (Python) and `package.json` (Node.js) — please report upstream vulnerabilities to their respective maintainers.
