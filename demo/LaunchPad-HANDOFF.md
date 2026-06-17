# LaunchPad — Hand-off (for tomorrow's session)

**Written:** 2026-06-17 (end of day) · **Owner:** Matt Shankle (Packaged Agile)

**Two goals for tomorrow:**
1. **Record & submit the Tradewinds (TSM) pitch video** for LaunchPad.
2. **Get a Dept of Commerce (DoC) demo ready** — based on the **USPTO** version — for a meeting **Wed 2026-06-24**.

Read this top to bottom; everything you need (files, branch state, gotchas, open decisions) is here.

---

## Status snapshot

| Thing | State |
|---|---|
| Tradewinds video **package** (script, storyboard, frames, form values) | ✅ Done, CIO-reviewed, de-risked. In `demo/CDAO Submission/Launchpad Submission/`. |
| Tradewinds video **recording** | ⬜ Not started — this is tomorrow's main job. |
| `dow` instance rebranded to **Packaged Agile** | ✅ Applied on the `dow` branch (verify it committed + deployed). |
| DoC demo | ⬜ Not started — needs a plan (see Goal 2). |
| Multi-tenant refactor | ✅ Committed/pushed on branch **`multi-tenant`**; not yet merged to USPTO. |
| ClickUp roadmap | ✅ Updated — 4 new subtasks under task `868f2t9vk`. |

---

## Goal 1 — Record & submit the Tradewinds video

**The whole package is built and approved.** It lives in `demo/CDAO Submission/Launchpad Submission/`:
- `1 - LaunchPad TSM - Strategy and Plan.docx`
- `2 - LaunchPad TSM - Video Script and Shot List.docx` ← the timed script (≈4:44, under the 5:00 cap)
- `3 - LaunchPad TSM - Submission Form Field Values.docx` ← ready-to-paste form fields
- `4 - LaunchPad TSM - Storyboard for Editor.docx` + `Storyboard frames/` (8 branded 1920×1080 PNG/SVG title cards)
- Script also lives as a ClickUp doc: https://app.clickup.com/59530/docs/1u4a-85571

**What's left:** record it. Narrate the script over a live screen recording of the **PA-branded `dow` instance**, splice in the 8 title-card frames per the storyboard, keep it **≤ 5:00**, export 1080p .mp4 < 1 GB, then complete the submission form at tradewindai.com.

**Non-negotiable guardrails baked into the script (do not regress):**
- **No USPTO / no agency-adoption claims** — the demo runs on *seeded sample data only*; narrate the mechanics, not the sample's subject matter.
- **No named AI vendor** — say "an American-built commercial AI model" on Amazon Bedrock, never "Claude."
- **Security stated honestly** — FedRAMP High / DoD IL4-5 is a *Bedrock* fact (verified current); LaunchPad's in-boundary deploy / SSO-PIV-CAC / row-level security are "built to," i.e. deployment design, **not** an existing authorization.
- **Proof = Packaged Agile's real past performance only** (Army / VA / USDA), never claimed as LaunchPad's own results.
- TRL **7**; predominant focus area **"Streamlining business processes."**
- **Confirm the SAM.gov UEI** before submitting (the profile only lists CAGE 3R6F0 / legacy DUNS).

**Known cosmetic gap on camera:** the `dow` demo's login (`admin@dow.mil`) and pipeline command names (FORSCOM, AMC, …) still read DoW — they're **database seed**, not config. Either avoid those screens, or do the reseed (ClickUp subtask `868k1yefe`) first.

ClickUp subtask: **868k1yeb9** (high, due 6/30 — June collection cutoff is last day of month, 12:00 noon EST).

---

## Goal 2 — Dept of Commerce demo (Wed 2026-06-24)

**Context:** USPTO is a bureau *of* the Department of Commerce, so the DoC demo is sensibly built on the **USPTO** version of LaunchPad.

**Open decision (settle first):**
- **(A)** Create a new `doc` tenant config (clone `lib/tenant/uspto.ts`, give it DoC branding + governance framing), or
- **(B)** Reuse the USPTO instance and reframe the talk track for a DoC audience.

**Prerequisite for (A):** the USPTO branch needs the **multi-tenant refactor** that currently only lives on the `multi-tenant` branch → merge it into `USPTO-launchpad` first (ClickUp subtask `868k1yeeh`, due 6/23).

**Still needed from Matt:** who the DoC stakeholders are, what use case to show, and where it deploys. Then: seed logins, verify deploy, write a short DoC runbook, and dry-run before 6/24.

ClickUp subtask: **868k1yecx** (high, due 6/24).

---

## Repo / branch state — READ THIS before any git work

- **`dow`** — the PA-rebranded demo instance for the Tradewinds video. Rebrand = `demo/dow-to-packaged-agile-rebrand.patch` (also copied to `C:\Dev\`). Selected by `NEXT_PUBLIC_TENANT=dow`; deploys via the `launchpad-v0-dow` Vercel project + `launchpad-dow` Supabase.
- **`multi-tenant`** — Matt's big tenant-config + model-provider refactor (the 117-file change), pushed. Pending decision to merge into `USPTO-launchpad`. ⚠️ This branch also accidentally carries the TSM demo docs under `demo/`.
- **`USPTO-launchpad`** — production USPTO; **untouched**, behind `multi-tenant`.

### ⚠️ Git gotcha (caused real pain today — don't repeat)
The repo's `.git` is on a permission-restricted mount; **the sandbox cannot reliably run git *write* operations** (worktree/commit/reset) against it, and sandbox `git diff`/`status` returned **false "no changes"** results. An attempted worktree corrupted the local index/HEAD; we recovered with `del .git\index.lock` + `git worktree prune` + `git reset` in PowerShell.
**Rule for future sessions:** make code changes and hand Matt a **patch** (`git apply`) or have him commit via **GitHub Desktop / PowerShell**. Do **not** create worktrees, commit, or reset from the sandbox on this repo. Trust **GitHub Desktop**, not sandbox git, for repo state.

---

## ClickUp roadmap (task `868f2t9vk` "Launchpad")

New subtasks added today (sprint-style, with acceptance criteria):
- `868k1yeb9` — Record & submit the Tradewinds (TSM) pitch video (high, due 6/30)
- `868k1yecx` — Stand up the Dept of Commerce demo, based on USPTO (high, due 6/24)
- `868k1yeeh` — Merge multi-tenant refactor into USPTO-launchpad (high, due 6/23)
- `868k1yefe` — Per-tenant seed data: neutral demo login + business units (normal)

Existing roadmap = 9 platform subtasks (ports-and-adapters, pluggable auth, model-agnostic adapter, storage adapter, system-of-record connectors, notifications, tenant config, containerized deploy, core/adapter repo split). Architecture guide: `docs/ARCHITECTURE.md` and ClickUp doc `1u4a-85371`.

---

## Standing guardrails (apply to all LaunchPad work)
- Run any deck/marketing prose through the **humanization guide** (`demo/05-ai-content-humanization-guide.md`) — avoid AI tells and em dashes.
- After **any** LaunchPad change, update `docs/ARCHITECTURE.md` **and** the ClickUp task (evergreen acceptance criteria).
- Keep total control of LaunchPad IP; commercial-item license + thin adapter layer.

## Open questions for Matt tomorrow
1. DoC demo: new `doc` tenant (A) or reframed USPTO (B)? Who's the audience / use case / deploy target?
2. Merge `multi-tenant` into `USPTO-launchpad` now (needed for a USPTO-based DoC tenant)?
3. Reseed the `dow` demo (neutral login + business units) before recording, or just avoid those screens?
4. Which TSM monthly collection are we targeting — June (cutoff 6/30 noon EST) or July?
