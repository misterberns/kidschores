# Release Checklist

The canonical checklist for cutting a KidsChores release. This exists because the
0.8.0 → 0.9.0 arc bumped `VERSION`/`CHANGELOG` on every release while README,
SECURITY.md, `.env.example`, and the screenshots silently froze at 0.8.0 —
nothing enumerated them. Now something does.

Version-surface consistency (items 1–5 below) is **CI-enforced** by
`scripts/check-version-consistency.sh` (runs in the backend CI job) — a release
PR that forgets one of them fails CI.

## 1. Version surfaces (all must match — CI-enforced)

- [ ] `VERSION` — the source of truth
- [ ] `frontend/package.json` `"version"` (use `npm version <x.y.z> --no-git-tag-version`)
- [ ] `backend/app/main.py` — `version="x.y.z"` in the `FastAPI(...)` init
- [ ] `README.md` — version badge (`Version-vX.Y.Z-green`) **and** the bottom
      "Current version: **X.Y.Z**" line
- [ ] `SECURITY.md` — supported-versions table covers the current minor (on minor bumps)

## 2. Content surfaces (judgment — update what the release changed)

- [ ] `CHANGELOG.md` — new `[x.y.z] - YYYY-MM-DD` entry (every release)
- [ ] `README.md` feature list / tech stack / env-var table / architecture tree —
      if the release added features, env vars, routers, or changed Docker bases/ports
- [ ] `.env.example` — if env vars were added/changed
- [ ] `CONTRIBUTING.md` — if test/dev workflow or project structure changed
- [ ] `ROADMAP.md` — strike shipped items, note deferrals
- [ ] **Screenshots** — if the UI changed visibly, recapture the key pages:
      ```bash
      cd e2e && API_URL=http://192.168.87.35:3104 FRONTEND_URL=http://192.168.87.35:3104 \
        npx playwright test -g "capture all screenshots" --project=screenshots
      ```
      (Run against the freshly-bumped test instance. The onboarding/login sets have
      their own test: `-g "capture onboarding screenshots"`. `screenshots/` must
      keep exactly 26 files — see CLAUDE.md.)
      **Then EYEBALL EVERY recaptured image, both themes — never a sample.**
      The v0.10.0 invisible-Allowance-card bug was IN allowance-light.png and
      shipped because only 5 of 26 captures were reviewed. The axe
      `ui/contrast.spec.ts` gate catches text-contrast programmatically, but
      layout/visual regressions still need human eyes on all of them.

## 3. Ship

- [ ] Release PR (`release/vX.Y.Z` from `github/main`) → CI green → merge
- [ ] Sync remotes: `git fetch github main && git merge --ff-only github/main && git push forgejo main`
- [ ] Tag: `git tag -a vX.Y.Z -m "..." && git push github vX.Y.Z && git push forgejo vX.Y.Z`
- [ ] GitHub release (`gh release create vX.Y.Z ...`)
- [ ] Forgejo release (`POST /api/v1/repos/wakanda/kidschores-app/releases`)

## 4. Deploy

- [ ] Build images (`scripts/kc-build.sh`), `docker save` → `scp -O` → `docker load`
      on the GT (registry pull is blocked by step-ca trust)
- [ ] **Prod** (`/volume1/gt-stacks/kidschores/`): DB backup first
      (in-container `VACUUM INTO`), compose `.bak`, bump image tags,
      `docker compose -p kidschores-ui --env-file stack.env config --quiet` gate,
      `up -d --force-recreate`; verify both hostnames 200 through Traefik +
      running `app.version`
- [ ] **Test instance** (`/volume1/gt-stacks/kidschores-test/`, `:3104`): same bump
      (project `kidschores-test`) — it is the default local e2e target, don't let it drift
- [ ] Homelab repo: sync `nas-bringup/stacks/kidschores*/` mirrors +
      `portainer-stacks/kidschores-stack.yml`, write the CHANGE record

## Backlog / known gaps

- Onboarding + login screenshots last captured for v0.7.9 — recapture at the next
  UI-heavy release (`-g "capture onboarding screenshots"`)
- No PR template / no e2e README (low priority)
