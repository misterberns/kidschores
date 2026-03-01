**KidsChores LinkedIn Launch Post**

GitHub Project Announcement

February 2026

I took an open-source Home Assistant integration and turned it into a
standalone full-stack web app in about two weeks of active development.
My co-developer? Claude Code.

KidsChores started as KidsChores-HA by ad-ha --- a great HA integration
for family chore management. I wanted it as a standalone app my family
could use on any device, without Home Assistant.

Using Claude Code (Anthropic's AI-powered CLI), I rebuilt it from the
ground up:

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4

- **Backend:** FastAPI + SQLAlchemy + SQLite

- **Auth:** Google SSO + JWT + bcrypt + rate limiting

- **Testing:** 100+ Playwright E2E tests (API, UI, accessibility)

- **Deployment:** Docker multi-stage builds, non-root containers

**15 releases. From fork to production.**

This wasn't "vibe coding." Claude Code helped me architect the security
model (OWASP Top 10), eliminate N+1 queries, implement WCAG-compliant
theming across 5 seasonal themes, and build a complete onboarding
wizard. Every commit was reviewed, every test was passing.

What surprised me most: the AI didn't just write code --- it caught edge
cases I would have missed. Timezone bugs in analytics. Race conditions
in token caching. Missing ARIA labels on modals.

The human part still matters: product vision, UX decisions, real-world
deployment, and knowing when the AI suggestion isn't quite right.

Open source (GPL-3.0): <https://github.com/misterberns/kidschores>

If you're a developer who hasn't tried AI-assisted development yet ---
the gap between "AI can write hello world" and "AI can ship production
apps" has closed faster than most people realize.

#OpenSource #AI #ClaudeCode #React #FastAPI #FullStack
#SoftwareDevelopment

**Posting Notes**

- **Image:** Attach **linkedin-post.png** (1200×627) as the post image

- **Timing:** Best posting times on LinkedIn: Tuesday--Thursday, 8--10
  AM your timezone

- **Visibility:** Consider tagging \@Anthropic in the post

- **Social preview:** Already uploaded to GitHub --- will auto-render
  when repo link is shared

- **Assets location:** kidschores-app/social-preview.png (1280×640),
  kidschores-app/linkedin-post.png (1200×627)
