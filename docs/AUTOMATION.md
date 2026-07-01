# LaunchPad — Automation & CI/CD

**Goal:** get to a hands-off loop where changes are built, type-checked, linted, tested, and deployed automatically, and an AI agent can implement roadmap tasks, commit, and react to failures — with a human looped in only for decisions and walkthroughs.

There are two layers. Layer 1 (CI/CD + tests) needs **no AI** and is set up in this repo. Layer 2 (the autonomous agent loop) uses **Claude Code**.

---

## Layer 1 — CI/CD, build checks, and tests (no AI)

### What's in the repo now
- **`.github/workflows/ci.yml`** — on every push and PR: `pnpm install` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`. This is the automated version of the "did it build?" gate we were doing by hand.
- **`vitest.config.ts`** + **unit tests** (`lib/**/*.test.ts`) — first tests cover the review-workflow status/roll-down logic and the tenant configs. Run locally with `pnpm test`.
- **Scripts** in `package.json`: `typecheck`, `test`, `test:watch`.

### One-time setup (needed once, then hands-off)
1. **Update the lockfile:** run `pnpm install` locally once so `pnpm-lock.yaml` picks up `vitest` + `jsdom`, and commit it. After that you can tighten CI to `pnpm install --frozen-lockfile`.
2. **Enable GitHub Actions** on the repo (Settings → Actions → allow).
3. **Vercel** already auto-deploys on push. Confirm each tenant is its own Vercel project with its own env vars and `NEXT_PUBLIC_TENANT` (`uspto`, `dow`, `doc`), pointed at its own Supabase instance.

### Deployment (already automatic)
- Push a branch → Vercel builds a **preview** deployment. Merge to the default branch → **production**. No manual step.

### Next: end-to-end / smoke tests (Playwright) — not yet in repo
Add Playwright to drive the real UI against a preview deployment: log in, run the wizard, submit a use case, and assert the pipeline, bureau roll-up, and Decision Center render. Running that suite on every PR **is** the regression test. Notes when we add it:
- Test the deterministic scaffolding and the **fallback paths** (e.g., the Decision Center heuristic briefing), and **mock the model** in CI — LLM output varies, so don't assert on exact Scout/briefing text.
- Needs a seeded test tenant DB and the preview URL as a CI secret.

---

## Layer 2 — The autonomous agent loop (Claude Code)

This Cowork environment intentionally **cannot write to `.git` or run your build**, which is why changes are handed to you to commit. To close the loop (implement → commit → push → react to CI failures → open a PR), use **Claude Code**:

- **Locally:** run `claude` in the repo. It has full git + terminal access — it can implement a task, run `pnpm build`/`pnpm test`, fix failures, and commit/push.
- **In CI (the hands-off part):** install the **Claude GitHub app** so Claude can respond to `@claude` in issues/PRs, implement changes on a branch, and open PRs that CI then verifies. The correct, always-current way to set this up is to run Claude Code locally and use **`/install-github-app`** — it generates the workflow and walks you through adding the `ANTHROPIC_API_KEY` secret. (Hand-writing the workflow risks drifting from the current action schema, so use the installer.)

### One-time setup
1. Install Claude Code (`npm i -g @anthropic-ai/claude-code`) and run `claude` in the repo.
2. Run **`/install-github-app`** and follow the prompts; add **`ANTHROPIC_API_KEY`** as a repo secret.
3. From then on: file a task (issue) or comment `@claude ...` on a PR, and the agent implements it against CI.

---

## Who does what (the hands-off model)

- **Cowork (this):** roadmap management, planning, BD/demo artifacts, authoring code + tests into the working tree, and driving the build sequence. Loops you in for **decisions** and **walkthroughs**.
- **CI (GitHub Actions):** the automatic safety net — typecheck, lint, test, build on every change.
- **Vercel:** automatic preview + production deploys.
- **Claude Code:** the autonomous commit/push/fix loop in the repo and in CI.

### You (the human) are needed for
- The **one-time setup** above (lockfile, Actions, secrets, Vercel projects, `/install-github-app`).
- **Decisions** (branch strategy, pricing/licensing, scope calls, confirming facts like the bureau list).
- **Live walkthroughs** (e.g., the July 20 Doug session).

Everything else runs on its own.
