# KidsChores CLAUDE.md

## Git Push Safety

- **Never push directly to `github/main`** — always create a PR via `gh pr create`
- **Never merge upstream (`origin/main`) directly into `main`** — use a feature branch, review the diff, then merge via PR
- Before any push, verify file count hasn't decreased: `git diff --stat <remote_ref>..HEAD`
- The `screenshots/` directory must always contain 26 files — verify before pushing

## Remotes

| Remote | Purpose | URL |
|--------|---------|-----|
| `forgejo` | Private (primary) | `forgejo.wakanda.lan:8443/wakanda/kidschores-app.git` |
| `github` | Public mirror | `github.com/misterberns/kidschores.git` |
| `origin` | Upstream fork (read-only) | `github.com/ad-ha/kidschores-ha.git` |

## Branch Protection

GitHub `main` has branch protection enabled:
- Force-pushes blocked
- Deletions blocked
- PRs required (0 reviewers = self-merge OK)

## Deployment

- Build via Docker Desktop, `docker save`, Portainer image load API
- Google OAuth requires `https://kidschores.mrberns.tech:8443`
- Non-root UID 999: NAS volume must be `chown -R 999:999`
- Frontend Docker has NO source volume mount — must `docker compose build frontend` after code changes

## Incident Reference

- **Feb 28, 2026**: Agent pushed commit `ad25f88` to GitHub that deleted 203 files (screenshots, docs, docker-compose, scripts). Fixed by force-push of intact local main. Branch protection added to prevent recurrence.
