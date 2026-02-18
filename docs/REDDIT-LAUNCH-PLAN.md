# Reddit Launch Plan — KidsChores v0.7.5

## Subreddit Strategy

| Priority | Subreddit | Timing | Angle |
|----------|-----------|--------|-------|
| **1** | r/selfhosted | Day 1 (Tue-Thu, 8-10am EST) | Privacy, Docker deploy, SQLite, no cloud |
| **2** | r/homelab | Day 2-3 | Synology NAS deployment story, architecture |
| **3** | r/opensource | Day 4-5 | Fork journey, GPL-3.0, contribution welcome |
| **4** | r/webdev | Week 2 | Tech stack deep-dive, lessons learned |
| Bonus | r/coolgithubprojects, awesome-selfhosted PR, selfh.st submission | Ongoing | |

**Do NOT post to r/parenting** (different culture, will be flagged as spam).

---

## Post 1: r/selfhosted (Primary)

**Title:**

> KidsChores — a self-hosted chore and reward tracker for families (React + FastAPI, Docker)

**Body:**

Hey r/selfhosted! I've been building a chore management app for my family and just open-sourced it. Thought this community might find it useful.

**The problem:** Every family chore app I found was either cloud-only, subscription-based, or way too simple. I wanted something that runs on my own hardware, tracks points and rewards, and lets me approve things before kids cash out.

**What it does:**
- Kids claim chores → earn points → redeem rewards (parents approve each step)
- Allowance system — convert points to dollars with per-kid rates
- Google SSO for parents and kids (optional)
- Email notifications when kids claim chores or redeem rewards
- Seasonal themes (Halloween, Christmas, Easter, Summer) with light/dark mode
- Mobile-responsive — works great on phones

**Self-hosting highlights:**
- Single `docker compose up -d` to deploy (no external database — just SQLite)
- Non-root containers, security headers, rate limiting, JWT auth on all endpoints
- ~50MB total (frontend: nginx-alpine, backend: python-slim)
- Data stays in a local `./data/` directory

**Tech stack:** React 19, TypeScript, Tailwind CSS v4, FastAPI, SQLAlchemy, SQLite, Docker

**Screenshots:** [Light mode](https://raw.githubusercontent.com/misterberns/kidschores/main/screenshots/home-light.png) | [Dark mode](https://raw.githubusercontent.com/misterberns/kidschores/main/screenshots/home-dark.png)

**Quick start:**
```
git clone https://github.com/misterberns/kidschores.git
cd kidschores
cp .env.example .env   # set JWT_SECRET_KEY
docker compose up -d   # access at localhost:3103
```

**Background:** This started as a fork of [KidsChores-HA](https://github.com/ad-ha/kidschores-ha) by [ad-ha](https://github.com/ad-ha), an excellent Home Assistant chore management integration. I rebuilt it as a standalone React + FastAPI web app over the past 2 months, and it's been running in production for my family the whole time. Just hit v0.7.5 with a full security audit, 34 E2E tests, and error boundaries. Full credit to ad-ha for the original concept and gamification design.

**GitHub:** https://github.com/misterberns/kidschores

GPL-3.0 licensed. Contributions and feedback welcome!

---

## Post 2: r/homelab (Secondary)

**Title:**

> Built a family chore tracker that runs on my Synology NAS — now open source

**Body:**

My kids needed a chore system, and I didn't want to hand our family data to another cloud service. So I built one that runs on my homelab.

**The setup:**
- Synology DS420+ running Docker via Portainer
- Traefik reverse proxy with step-ca certificates (HTTPS on LAN)
- Two containers: React frontend (nginx-alpine) + FastAPI backend (python-slim)
- SQLite database — no Postgres/MySQL to manage
- Total footprint: ~50MB, minimal CPU

**What it does:** Kids claim chores, earn points, and redeem rewards. Parents approve everything. There's an allowance system that converts points to dollars. Seasonal themes keep the kids engaged (they love switching to the Halloween theme).

**Screenshots:** [Light](https://raw.githubusercontent.com/misterberns/kidschores/main/screenshots/home-light.png) | [Dark](https://raw.githubusercontent.com/misterberns/kidschores/main/screenshots/home-dark.png) | [Admin](https://raw.githubusercontent.com/misterberns/kidschores/main/screenshots/admin-light.png)

**Deploy:**
```
git clone https://github.com/misterberns/kidschores.git && cd kidschores
cp .env.example .env && docker compose up -d
```

Started as a fork of [KidsChores-HA](https://github.com/ad-ha/kidschores-ha) by [ad-ha](https://github.com/ad-ha) — originally a Home Assistant chore management integration. I rebuilt it as a standalone web app. v0.7.5 with JWT auth, rate limiting, bcrypt, and 34 E2E tests.

**GitHub:** https://github.com/misterberns/kidschores

Happy to answer questions about the architecture or deployment!

---

## Pre-Post Checklist

- [ ] Test fresh `git clone && docker compose up -d` on clean machine
- [ ] Verify all screenshot URLs render on GitHub
- [ ] Verify `.env.example` has clear comments
- [ ] Upload 1-2 screenshots natively to Reddit post (not just links)
- [ ] Be online for 2-3 hours after posting to respond to comments
- [ ] Post between Tue-Thu, 8-10am EST

## Bonus Submissions

- [ ] Submit to [awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted) (PR under "Task Management & To-Do Lists")
- [ ] Submit to [selfh.st/apps](https://selfh.st/apps-about/) directory
- [ ] Consider Show HN post: `Show HN: KidsChores – Self-hosted chore and reward tracker for families`

---

## AI Disclosure Guidance

Reddit (especially r/selfhosted, r/homelab) has strong anti-"vibe coding" sentiment in 2025-2026. Projects perceived as AI slop get downvoted hard; authentic dev stories with real usage get upvotes.

### Recommendation: Don't Lead With It, Don't Hide It

**In the post itself:** Don't mention AI tools. The posts focus on the product, the real-world usage story, the security audit, and the deployment experience. These are what r/selfhosted cares about.

**If asked in comments** ("Did you use AI to build this?"):

> "Yeah, I used Claude Code as an AI coding assistant throughout development — mostly for scaffolding, refactoring, and catching security issues. But I architected the system, made all the design decisions, debugged the deployment on my Synology NAS, and have been running it in production for my family. Every line went through my review. It's AI-assisted, not AI-generated."

**Why this framing works:**
1. KidsChores is NOT a vibe-coded throwaway — you understand the full stack, run it in production, did a security audit, wrote 34 E2E tests
2. Leading with "built with AI" shifts the conversation from product to tools, inviting skepticism
3. The commit trailers already have `Co-Authored-By: Claude` — anyone who checks the repo can see it. Transparent without being self-sabotaging.
4. r/selfhosted rewards authentic stories about solving real problems — that's what the posts deliver

### What NOT to Do

- Don't say "vibe coded" — ever
- Don't add a disclaimer like "built with AI assistance" to the post
- Don't lie if directly asked
- Don't get defensive if someone finds the Co-Authored-By trailers
