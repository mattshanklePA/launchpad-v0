import { describe, it, expect, vi, afterEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { es2 } from "@/lib/tenant/es2"
import { tenantCopy } from "@/lib/tenant/copy"
import { buildPortfolioReport } from "@/lib/portfolioReport"
import { similarity } from "@/lib/similarity"
import { isCrossBureauDuplicatePair, ROLLUP_DUPLICATE_THRESHOLD } from "@/lib/crossBureauDuplicates"
import { clusterDuplicates } from "@/lib/rationalization"
import { determineConsolidation, CONSOLIDATION_CATEGORIES } from "@/lib/ombConsolidation"
import { computeRmfProfile, RMF_FUNCTION_ORDER } from "@/lib/nistRmf"
import { STATUS_ORDER, getBusinessUnit } from "@/lib/reviewWorkflow"
import type { Submission } from "@/lib/submissions"
import { officeRollupRows } from "@/lib/officeRollup"
import { decisionCenterCandidates } from "@/lib/decisionCenter"
import { computeRiskProfile } from "@/lib/riskProfile"
import { getDecidedAt, medianTimeToDecision } from "@/lib/timeToDecision"
import { getBureauSignoff } from "@/lib/bureauSignoff"
import { applicableGovernanceFields, getGovernanceCaptureReview, governanceFieldCounts } from "@/lib/governanceCapture"
import { getRmfProfileReview, resolveRmfProfile } from "@/lib/rmfProfileReview"

// Golden-state test for the ES2 one-click demo reset (app/api/seed/route.ts and
// the admin "Reset Demo Data" tool). The seed is a demo script, not sample
// data: two mechanisms have to fire and they are mutually exclusive, so most of
// what follows pins those rather than the prose, which is free to evolve.

const S: Submission[] = es2SeedSubmissions
const byId = (id: string) => {
  const found = S.find((s) => s.id === id)
  if (!found) throw new Error(`No seed submission with id "${id}"`)
  return found
}

const DUPLICATE_GROUP = [
  "es2-digitalmarket-vendor-past-performance",
  "es2-logfin-supplier-past-performance",
  "es2-bts-supplier-risk-scoring",
]
const CONSOLIDATION_GROUP = ["es2-hrfm-meeting-transcription", "es2-logfin-meeting-transcription"]

const unitValues = new Set(es2.unit.options.map((o) => o.value))
const officeValuesByUnit = new Map(
  es2.unit.options.map((o) => [o.value, new Set((o.offices || []).map((x) => x.value))]),
)

describe("es2SeedSubmissions golden state", () => {
  // F4-3 (#304): was exactly 16; the CPE-wide set is 40 to 44 (item 1 below).
  it("has 40 to 44 deterministic, uniquely-identified submissions", () => {
    expect(S.length).toBeGreaterThanOrEqual(40)
    expect(S.length).toBeLessThanOrEqual(44)
    const ids = S.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^es2-/)
  })

  // F4-3 (#304): was exactly two rejected; the CPE-wide set has 4 to 6.
  it("spreads across every pipeline status, with exactly one draft and four to six rejected", () => {
    const statuses = S.map((s) => s.formData.reviewStatus)
    for (const st of STATUS_ORDER) expect(new Set(statuses).has(st), st).toBe(true)
    expect(statuses.filter((s) => s === "draft")).toHaveLength(1)
    const rejected = statuses.filter((s) => s === "rejected").length
    expect(rejected).toBeGreaterThanOrEqual(4)
    expect(rejected).toBeLessThanOrEqual(6)
  })

  it("gives every submission an owner email on the demo domain", () => {
    for (const s of S) {
      expect(s.formData.submitterEmail, s.id).toMatch(/^[a-z.]+@es2\.demo$/)
    }
  })
})

// ─── The first mechanism: cross-program duplicate detection ────────────────
describe("cross-program duplicate group (items 10-12)", () => {
  it("makes every pair a cross-program duplicate pair, spanning three program offices", () => {
    const group = DUPLICATE_GROUP.map(byId)
    expect(new Set(group.map(getBusinessUnit)).size).toBe(3)
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const label = `${group[i].id} <-> ${group[j].id}`
        expect(isCrossBureauDuplicatePair(group[i], group[j]), label).toBe(true)
      }
    }
  })

  it("clears the roll-up threshold with real headroom, not by a hair", () => {
    // `similarity()` is lexical Jaccard, so a copy edit that drops shared
    // vocabulary can silently break the demo. Pinned well above 0.25.
    const group = DUPLICATE_GROUP.map(byId)
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const score = similarity(group[i], group[j])
        expect(score, `${group[i].id} <-> ${group[j].id} = ${score.toFixed(3)}`).toBeGreaterThan(
          ROLLUP_DUPLICATE_THRESHOLD * 1.3,
        )
      }
    }
  })

  it("still reads as three independent submissions, not three copies", () => {
    const group = DUPLICATE_GROUP.map(byId)
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        expect(similarity(group[i], group[j])).toBeLessThan(0.6)
      }
    }
    expect(new Set(group.map((s) => s.formData.useCaseTitle)).size).toBe(3)
    expect(new Set(group.map((s) => s.formData.proposedSolution)).size).toBe(3)
    expect(new Set(group.map((s) => s.formData.submitterEmail)).size).toBe(3)
  })

  // F4-3 (#304): was "exactly one cluster". Now one of exactly three (item 7).
  it("is one of the clusters, exactly as written", () => {
    const clusters = clusterDuplicates(S, es2)
    const mine = clusters.find((c) => c.memberIds.includes(DUPLICATE_GROUP[0]))
    expect(mine).toBeDefined()
    expect([...mine!.memberIds].sort()).toEqual([...DUPLICATE_GROUP].sort())
    expect(mine!.bureaus.length).toBe(3)
  })

  // THE ASSERTION THAT CATCHES THE DESIGN ERROR: a submission matching a
  // consolidation category is excluded from duplicate detection, so the
  // duplicate group has to match none of them.
  it("matches no OMB consolidation category — the two mechanisms are mutually exclusive", () => {
    for (const s of DUPLICATE_GROUP.map(byId)) {
      const result = determineConsolidation(s.formData)
      expect(result.category, `${s.id} matched "${result.categoryLabel}"`).toBeUndefined()
      expect(result.status, s.id).toBe("Individual")

      // Belt and braces: check the raw patterns against the same free text
      // `determineConsolidation` scans, so a future category addition that
      // starts covering this topic fails here with the category named.
      const fd = s.formData as unknown as Record<string, string>
      const text = [
        fd.useCaseTitle,
        fd.useCaseDescription,
        fd.coreProblem,
        fd.problemDefinition,
        fd.proposedSolution,
        fd.solutionSummary,
        fd.businessValue,
      ]
        .filter(Boolean)
        .join(" ")
      const hits = CONSOLIDATION_CATEGORIES.filter((c) => c.pattern.test(text)).map((c) => c.id)
      expect(hits, `${s.id} hits ${hits.join(", ")}`).toEqual([])
    }
  })
})

// ─── The second mechanism: consolidation ───────────────────────────────────
describe("consolidation group (items 13-14)", () => {
  it("matches the same category and collapses into one inventory row", () => {
    const group = CONSOLIDATION_GROUP.map(byId)
    const results = group.map((s) => determineConsolidation(s.formData))
    for (const [i, r] of results.entries()) {
      expect(r.status, group[i].id).toBe("Consolidated")
    }
    expect(new Set(results.map((r) => r.category)).size).toBe(1)
    expect(results[0].category).toBe("meeting_transcription")
    // Two program offices, so the collapse is actually cross-program.
    expect(new Set(group.map(getBusinessUnit)).size).toBe(2)
  })

  it("is excluded from duplicate detection precisely because it shares a category", () => {
    const [a, b] = CONSOLIDATION_GROUP.map(byId)
    expect(similarity(a, b)).toBeGreaterThan(ROLLUP_DUPLICATE_THRESHOLD)
    expect(isCrossBureauDuplicatePair(a, b)).toBe(false)
  })
})

// ─── Lifecycle-stage completeness (issue #164's two-stage model) ───────────
describe("lifecycle completeness", () => {
  const GOVERNANCE_FIELDS = ["stageOfDevelopment", "highImpact", "hasATO", "systemSource"] as const

  it("leaves governance fields empty on drafts and unvetted ideas", () => {
    for (const s of S.filter((x) => ["draft", "submitted"].includes(String(x.formData.reviewStatus)))) {
      for (const f of GOVERNANCE_FIELDS) {
        expect(s.formData[f], `${s.id}.${f}`).toBe("")
      }
    }
  })

  it("records a sign-off on everything approved or rejected", () => {
    const decided = S.filter((s) => ["approved", "rejected"].includes(String(s.formData.reviewStatus)))
    expect(decided.length).toBeGreaterThanOrEqual(5)
    for (const s of decided) {
      const signoff = (s.formData as unknown as Record<string, { bureau?: string; decision?: string }>).bureauSignoff
      expect(signoff, `${s.id}.bureauSignoff`).toBeTruthy()
      expect(signoff.bureau, s.id).toBe(getBusinessUnit(s))
      expect(signoff.decision, s.id).toBe(s.formData.reviewStatus)
    }
  })

  it("leaves visible remaining work on in_review / needs_info items", () => {
    const mid = S.filter((s) => ["in_review", "needs_info"].includes(String(s.formData.reviewStatus)))
    expect(mid.length).toBeGreaterThanOrEqual(2)
    for (const s of mid) {
      // Some governance is in…
      expect(s.formData.stageOfDevelopment, `${s.id}.stageOfDevelopment`).not.toBe("")
      // …and some is deliberately still open.
      expect(s.formData.hasATO === "" || s.formData.scalable === "" || s.formData.impactLevel === "", s.id).toBe(true)
    }
  })

  // F4-2 (#303): this used to demand a high-impact record that is *deployed*.
  // In ES2 every approved record is a Decision Center funding candidate, so an
  // approved + deployed record sat waiting for a funding decision. The example
  // is now in pilot, and no approved record may be deployed.
  it("includes a high-impact approved example in pilot, and no approved record is deployed", () => {
    const highImpactPilot = S.filter(
      (s) =>
        s.formData.reviewStatus === "approved" &&
        s.formData.highImpact === "high_impact" &&
        s.formData.stageOfDevelopment === "pilot",
    )
    expect(highImpactPilot.length).toBeGreaterThanOrEqual(1)
    for (const s of highImpactPilot) {
      expect(s.formData.highImpactFactors.length, `${s.id}.highImpactFactors`).toBeGreaterThan(0)
      expect(s.formData.preDeploymentTesting, s.id).toBe("yes")
      expect(s.formData.ongoingMonitoringPlan, s.id).toBe("yes")
    }
    expect(S.filter((s) => s.formData.reviewStatus === "approved" && s.formData.stageOfDevelopment === "deployed")).toEqual([])
  })

  // F4-3 (#304): scoped to the two original rejected ids; the CPE-wide set adds
  // rejected records with other reasons (checked by the F4-2 rules).
  it("gives the two original rejected items the decisional-AI + no-human-review shape and a recorded reason", () => {
    const rejected = ["es2-acws-source-selection-scoring", "es2-atis-promotion-screening"].map(byId)
    for (const s of rejected) expect(s.formData.reviewStatus, s.id).toBe("rejected")
    for (const s of rejected) {
      expect(s.formData.aiDecisionalImpact, s.id).toBe("yes")
      expect(s.formData.aiHumanReview, s.id).toBe("no")
      const comments = (s.formData as unknown as Record<string, { body?: string }[]>).comments
      expect(comments?.length, `${s.id}.comments`).toBeGreaterThan(0)
      expect(comments[0].body!.length, s.id).toBeGreaterThan(80)
    }
  })
})

// ─── RMF coverage ──────────────────────────────────────────────────────────
describe("NIST AI RMF coverage", () => {
  it("produces at least one partial function status and at least one on_track profile", () => {
    const profiles = S.map((s) => ({ id: s.id, profile: computeRmfProfile(s.formData, es2) }))

    const partial = profiles.filter((p) => RMF_FUNCTION_ORDER.some((k) => p.profile.functions[k].status === "partial"))
    expect(partial.length, "expected an RMF partial").toBeGreaterThanOrEqual(1)
    // Partial, not gap — the distinction the demo depends on.
    for (const p of partial) {
      expect(RMF_FUNCTION_ORDER.some((k) => p.profile.functions[k].status === "gap"), p.id).toBe(false)
    }

    expect(profiles.filter((p) => p.profile.overall === "on_track").length, "expected an on_track").toBeGreaterThanOrEqual(1)
  })
})

// ─── Tenant-config integrity — a raw enum on screen is the ugliest failure ──
describe("every stored value resolves to a label in es2.ts", () => {
  it("uses only real program-office and program codes", () => {
    for (const s of S) {
      const unit = String(s.formData.submitterOffice)
      expect(unitValues.has(unit), `${s.id}.submitterOffice="${unit}"`).toBe(true)
      const sub = String(s.formData.submitterSubOffice || "")
      if (sub) {
        expect(officeValuesByUnit.get(unit)?.has(sub), `${s.id}.submitterSubOffice="${sub}" under "${unit}"`).toBe(true)
      }
    }
  })

  it("uses only dropdown values the tenant declares", () => {
    const roles = new Set(es2.submitterRoles.map((o) => o.value))
    const audiences = new Set(es2.targetAudiences.map((o) => o.value))
    const systems = new Set(es2.affectedSystems.map((o) => o.value))
    const classifications = new Set(es2.dataClassifications.map((o) => o.value))
    for (const s of S) {
      expect(roles.has(String(s.formData.submitterRole)), `${s.id}.submitterRole`).toBe(true)
      const audience = String(s.formData.targetAudience || "")
      if (audience) expect(audiences.has(audience), `${s.id}.targetAudience="${audience}"`).toBe(true)
      for (const v of s.formData.affectedBusinessUnits || []) {
        expect(systems.has(v), `${s.id}.affectedBusinessUnits="${v}"`).toBe(true)
      }
      const level = String(s.formData.impactLevel || "")
      if (level) expect(classifications.has(level), `${s.id}.impactLevel="${level}"`).toBe(true)
    }
  })

  it("uses only focus-area ids the tenant declares, at enterprise or program-office level", () => {
    const ids = new Set([
      ...es2.focusAreas.map((f) => f.id),
      ...es2.unit.options.flatMap((o) => (o.focusAreas || []).map((f) => f.id)),
    ])
    for (const s of S) {
      for (const id of s.formData.usptoFocusArea || []) {
        expect(ids.has(id), `${s.id}.usptoFocusArea="${id}"`).toBe(true)
      }
    }
  })
})

// ─── The SQL user seed has to agree with the submissions ───────────────────
describe("db/migrations/es2/0001_es2_users_seed.sql", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "db/migrations/es2/0001_es2_users_seed.sql"), "utf8")
  const emails = new Set(sql.match(/'([a-z.]+@es2\.demo)'/g)?.map((m) => m.replace(/'/g, "")) ?? [])

  it("exists and is idempotent", () => {
    const inserts = sql.match(/insert into users/g) ?? []
    const guards = sql.match(/where not exists \(select 1 from users where email =/g) ?? []
    expect(inserts.length).toBeGreaterThanOrEqual(15)
    expect(guards.length).toBe(inserts.length)
  })

  it("carries an account for every email a submission is filed under", () => {
    for (const s of S) {
      expect(emails.has(String(s.formData.submitterEmail)), `${s.id} owner not in the user seed`).toBe(true)
    }
  })

  // The job_role column between the password and business_unit was null for
  // every row until ES2-13 populated it; these tests are about the scoping
  // columns after it, so they match either. Job roles have their own block
  // below.
  const JOB = "(?:null|'\\w+')"

  it("carries one enterprise admin, one reviewer per program office, and a program-level reviewer", () => {
    expect(sql).toMatch(new RegExp(`'admin', 'launchpad', ${JOB}, null, null`))
    for (const unit of es2.unit.options.map((o) => o.value)) {
      expect(sql, `no reviewer for ${unit}`).toMatch(
        new RegExp(`'reviewer', 'launchpad', ${JOB}, '${unit}', null`),
      )
    }
    // AT&R program-level reviewer, scoped to one program under AT&R.
    expect(sql).toMatch(new RegExp(`'reviewer', 'launchpad', ${JOB}, 'atr', 'acws'`))
  })

  it("uses only program-office and program codes the tenant declares", () => {
    const units = sql.match(new RegExp(`'(?:admin|reviewer|submitter)', 'launchpad', ${JOB}, '(\\w+)'`, "g")) ?? []
    for (const m of units) {
      const unit = m.match(/'(\w+)'$/)![1]
      expect(unitValues.has(unit), `user seed references unknown program office "${unit}"`).toBe(true)
    }
  })
})

// ─── Vocabulary guardrail ──────────────────────────────────────────────────
describe("no other org's vocabulary in the seed", () => {
  it("never says Commerce, USPTO, or DoD", () => {
    // String VALUES only — `usptoFocusArea` is a legacy FormData key
    // (lib/steps.ts) shared by every tenant, not seed content.
    const values: string[] = []
    const walk = (v: unknown) => {
      if (typeof v === "string") values.push(v)
      else if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === "object") Object.values(v).forEach(walk)
    }
    walk(S)
    expect(values.length).toBeGreaterThan(200)

    const text = values.join(" | ")
    for (const word of ["Commerce", "USPTO", "Patents", "Trademarks", "Census"]) {
      expect(text, word).not.toMatch(new RegExp(word, "i"))
    }
    // Department of War, never DoD.
    expect(text).not.toMatch(/\bDoD\b/)
  })
})

// ─── ES2-13: the seed's job_role column ────────────────────────────────────
//
// It was null for every row, because the job-role dropdown was USPTO-shaped
// and had no Army values to offer. Now that User Management reads the tenant's
// own `submitterRoles`, the seed carries a real role for every account and
// step 1 of intake can pre-fill it.
describe("db/migrations/es2/0001_es2_users_seed.sql job roles (ES2-13)", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "db/migrations/es2/0001_es2_users_seed.sql"), "utf8")
  const roleValues = new Set(es2.submitterRoles.map((o) => o.value))

  type SeedUser = { email: string; role: string; jobRole: string | null; unit: string | null; office: string | null }
  const unquote = (v: string) => (v === "null" ? null : v.slice(1, -1))
  const users: SeedUser[] = [
    ...sql.matchAll(
      /select '[^']+', '([^']+)', '[^']+', '(admin|reviewer|submitter)', 'launchpad', (null|'[^']*'), (null|'[^']*'), (null|'[^']*'), now\(\)/g,
    ),
  ].map((m) => ({
    email: m[1],
    role: m[2],
    jobRole: unquote(m[3]),
    unit: unquote(m[4]),
    office: unquote(m[5]),
  }))

  it("parses all 15 seeded accounts", () => {
    expect(users).toHaveLength(15)
  })

  it("gives every account a job_role from es2.ts's submitterRoles", () => {
    for (const u of users) {
      expect(u.jobRole, `${u.email} has no job_role`).not.toBeNull()
      expect(roleValues.has(String(u.jobRole)), `${u.email}: job_role="${u.jobRole}"`).toBe(true)
    }
  })

  it("submits Avery Lang as a contracting officer, which is what beat 3 shows", () => {
    const avery = users.find((u) => u.email === "avery.lang@es2.demo")
    expect(avery?.jobRole).toBe("contracting_officer")
  })

  // The guardrail: job_role is the only column ES2-13 touches. Avery's null
  // business_unit is what puts her on the enterprise roll-up
  // (lib/dashboard/scope.ts), and seeding a program office there would break
  // the demo's first screen.
  it("leaves every business_unit and office exactly as it was", () => {
    const scoping = users.map((u) => `${u.email}:${u.unit}/${u.office}`).sort()
    expect(scoping).toEqual(
      [
        "alan.brooks@es2.demo:atr/null",
        "andre.duval@es2.demo:bts/null",
        "avery.lang@es2.demo:null/null",
        "dana.whitfield@es2.demo:atr/acws",
        "derek.hsu@es2.demo:bts/null",
        "jordan.pierce@es2.demo:hrfm/null",
        "karen.udall@es2.demo:logfin/null",
        "lena.okafor@es2.demo:atr/fmsaces",
        "marcus.bell@es2.demo:atr/acws",
        "maria.santos@es2.demo:cerp/null",
        "nora.quist@es2.demo:atr/acws",
        "priya.nair@es2.demo:atr/atis",
        "renee.calder@es2.demo:hrfm/null",
        "sofia.marquez@es2.demo:logfin/null",
        "victor.hale@es2.demo:atr/digitalmarket",
      ].sort(),
    )
  })

  it("gives every program-office reviewer the same reviewing role", () => {
    for (const u of users.filter((x) => x.role === "reviewer")) {
      expect(u.jobRole, u.email).toBe("program_manager")
    }
  })

  // The catch-up migration for the already-deployed instance. It has to be
  // idempotent (`and job_role is null`) and agree with the base seed, or a
  // hand-run in Supabase silently disagrees with a fresh deploy.
  describe("0002_es2_job_roles.sql", () => {
    const catchUp = fs.readFileSync(
      path.join(process.cwd(), "db/migrations/es2/0002_es2_job_roles.sql"),
      "utf8",
    )
    const updates = new Map(
      [...catchUp.matchAll(/update users set job_role = '([^']+)' where email = '([^']+)' and job_role is null;/g)].map(
        (m) => [m[2], m[1]],
      ),
    )

    it("sets the same role the base seed does, for every seeded account", () => {
      expect(updates.size).toBe(users.length)
      for (const u of users) {
        expect(updates.get(u.email), `${u.email} missing from the catch-up migration`).toBe(u.jobRole)
      }
    })

    it("guards every update on job_role being null, so re-running is a no-op", () => {
      const all = catchUp.match(/update users set job_role/g) ?? []
      const guarded = catchUp.match(/and job_role is null;/g) ?? []
      expect(all.length).toBe(guarded.length)
    })
  })
})

// F4-1 (#224): ADAMS, the fifth AT&R program, has a seeded idea so it is not an
// empty row on the AT&R roll-up, and it stays out of the duplicate group.
describe("ADAMS (fifth AT&R program)", () => {
  const adams = S.filter((s) => s.formData.submitterOffice === "atr" && s.formData.submitterSubOffice === "adams")

  it("has at least one seeded submission", () => {
    expect(adams.length).toBeGreaterThanOrEqual(1)
  })

  it("shows as its own row on the AT&R roll-up", () => {
    const row = officeRollupRows(S, "atr", es2).find((r) => r.value === "adams")
    expect(row).toBeDefined()
    expect(row!.total).toBeGreaterThanOrEqual(1)
  })

  it("is not part of the cross-program duplicate group", () => {
    for (const a of adams) expect(DUPLICATE_GROUP).not.toContain(a.id)
  })
})

// F4-2 (#303): demo data rules. On 10 Dec a quality lead and a CTO read these
// records closely, so the set must not contradict itself on screen.
describe("ES2 demo data rules (F4-2)", () => {
  const admin = { role: "admin" }
  const decided = S.filter((s) => ["approved", "rejected"].includes(String(s.formData.reviewStatus)))
  const approved = S.filter((s) => s.formData.reviewStatus === "approved")
  const candidates = decisionCenterCandidates(S, admin)

  const strings: { id: string; text: string }[] = []
  const collect = (id: string, v: unknown) => {
    if (typeof v === "string") strings.push({ id, text: v })
    else if (Array.isArray(v)) v.forEach((x) => collect(id, x))
    else if (v && typeof v === "object") Object.values(v).forEach((x) => collect(id, x))
  }
  for (const s of S) collect(s.id, s.formData)

  it("1. every approved or rejected record has a decision time, a decider, a reason, and was submitted before it was decided", () => {
    expect(decided.length).toBeGreaterThanOrEqual(5)
    for (const s of decided) {
      const decidedAt = getDecidedAt(s)
      expect(decidedAt, `${s.id} decision time`).toBeTruthy()
      expect(getBureauSignoff(s)?.signedOffByName, `${s.id} decider`).toBeTruthy()
      const comments = s.formData.comments as { body?: string }[] | undefined
      expect(comments?.[0]?.body?.trim(), `${s.id} reason`).toBeTruthy()
      expect(new Date(s.submittedAt).getTime(), `${s.id} submitted before decided`).toBeLessThan(
        new Date(String(decidedAt)).getTime(),
      )
    }
  })

  it("2. every approved record has a confirmed risk profile and a confirmed high-impact answer", () => {
    for (const s of approved) {
      expect(computeRiskProfile(s.formData).level, `${s.id} risk profile`).not.toBe("unknown")
      expect(["high_impact", "not_high_impact"], `${s.id}.highImpact="${s.formData.highImpact}"`).toContain(
        s.formData.highImpact,
      )
    }
  })

  it("3. no approved, deployed record is a Decision Center candidate", () => {
    for (const s of candidates) {
      expect(s.formData.stageOfDevelopment, `${s.id} is deployed and still a funding candidate`).not.toBe("deployed")
    }
  })

  it("4. the Decision Center candidates are not near-copies", () => {
    expect(candidates.length).toBeGreaterThanOrEqual(2)
    expect(new Set(candidates.map(getBusinessUnit)).size, "program offices").toBeGreaterThanOrEqual(2)
    const shape = (s: Submission) =>
      [computeRiskProfile(s.formData).level, s.formData.costSavings, s.formData.implementationComplexity].join("|")
    expect(new Set(candidates.map(shape)).size, "risk / savings / complexity combinations").toBeGreaterThanOrEqual(2)
  })

  it("5. every record has a real title, a program office, and a program that exist in es2.ts", () => {
    for (const s of S) {
      expect(String(s.formData.useCaseTitle || "").trim().length, `${s.id} title`).toBeGreaterThan(5)
      const unit = String(s.formData.submitterOffice)
      expect(unitValues.has(unit), `${s.id} office "${unit}"`).toBe(true)
      const programs = officeValuesByUnit.get(unit)
      if (programs && programs.size > 0) {
        expect(programs.has(String(s.formData.submitterSubOffice || "")), `${s.id} program`).toBe(true)
      }
    }
  })

  it("6. no text has a bracketed blank, 'Untitled idea', 'TEST', or an em dash", () => {
    expect(strings.length).toBeGreaterThan(200)
    for (const { id, text } of strings) {
      expect(text, `${id}: bracketed blank`).not.toMatch(/\[[A-Z _]+\]/)
      expect(text, `${id}: Untitled idea`).not.toMatch(/untitled idea/i)
      expect(text, `${id}: TEST`).not.toMatch(/\bTEST\b/)
      expect(text, `${id}: em dash`).not.toContain("—")
    }
  })

  it("7. no text names an AI model vendor or model", () => {
    const FORBIDDEN =
      /\bAnthropic\b|\bClaude\b|\bSonnet\b|\bOpus\b|\bHaiku\b|\bOpenAI\b|\bChatGPT\b|\bGPT-?\d\w*\b|\bGemini\b|\bLlama\b|\bMistral\b|\bCohere\b/i
    for (const { id, text } of strings) expect(text, id).not.toMatch(FORBIDDEN)
  })
})

// F4-3 (#304): the CPE-wide picture. The people on 10 Dec run the whole
// portfolio, so every office has ideas, decisions are already made, and the
// time-to-decision number is real.
describe("CPE-wide ES2 demo data (F4-3)", () => {
  const OFFICES = ["atr", "hrfm", "logfin", "bts", "cerp"]
  const byOffice = (unit: string) => S.filter((s) => getBusinessUnit(s) === unit)
  const decided = S.filter((s) => ["approved", "rejected"].includes(String(s.formData.reviewStatus)))
  const high = S.filter((s) => computeRiskProfile(s.formData).level === "high")
  const DAY = 86_400_000

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  it("1. has 40 to 44 ideas", () => {
    expect(S.length).toBeGreaterThanOrEqual(40)
    expect(S.length).toBeLessThanOrEqual(44)
  })

  it("2. every program office has at least 3 ideas, and every AT&R program has at least one", () => {
    for (const unit of OFFICES) expect(byOffice(unit).length, unit).toBeGreaterThanOrEqual(3)
    const atrPrograms = (es2.unit.options.find((o) => o.value === "atr")!.offices || []).map((o) => o.value)
    expect(atrPrograms).toContain("adams")
    for (const p of atrPrograms) {
      expect(S.filter((s) => s.formData.submitterSubOffice === p).length, p).toBeGreaterThanOrEqual(1)
    }
  })

  it("3. dates are worked out from 'now': 8 or more different weeks, newest within 7 days, for two different 'now' values", async () => {
    for (const now of [Date.UTC(2026, 11, 1, 15), Date.UTC(2027, 2, 9, 3)]) {
      vi.useFakeTimers()
      vi.setSystemTime(now)
      vi.resetModules()
      const { es2SeedSubmissions: fresh } = await import("@/lib/seedSubmissionsEs2")
      const ages = fresh.map((s) => now - new Date(s.submittedAt).getTime())
      for (const a of ages) expect(a).toBeGreaterThanOrEqual(0)
      expect(Math.min(...ages)).toBeLessThan(7 * DAY)
      expect(new Set(ages.map((a) => Math.floor(a / (7 * DAY)))).size).toBeGreaterThanOrEqual(8)
      vi.useRealTimers()
    }
  })

  it("4. 13 to 15 decided across at least four offices, 8 to 10 approved, 4 to 6 not approved, median 9 to 13 days", () => {
    expect(decided.length).toBeGreaterThanOrEqual(13)
    expect(decided.length).toBeLessThanOrEqual(15)
    expect(new Set(decided.map(getBusinessUnit)).size).toBeGreaterThanOrEqual(4)
    const approved = decided.filter((s) => s.formData.reviewStatus === "approved").length
    expect(approved).toBeGreaterThanOrEqual(8)
    expect(approved).toBeLessThanOrEqual(10)
    const rejected = decided.length - approved
    expect(rejected).toBeGreaterThanOrEqual(4)
    expect(rejected).toBeLessThanOrEqual(6)
    for (const s of decided) {
      expect(getBureauSignoff(s)?.signedOffByName, `${s.id} decider`).toBeTruthy()
      const comments = s.formData.comments as { body?: string }[] | undefined
      expect(comments?.[0]?.body?.trim(), `${s.id} reason`).toBeTruthy()
    }
    const median = medianTimeToDecision(S)
    expect(median).toBeGreaterThanOrEqual(9)
    expect(median).toBeLessThanOrEqual(13)
  })

  it("5. 5 to 7 high risk, in at least three offices, at least two of them not approved", () => {
    expect(high.length).toBeGreaterThanOrEqual(5)
    expect(high.length).toBeLessThanOrEqual(7)
    expect(new Set(high.map(getBusinessUnit)).size).toBeGreaterThanOrEqual(3)
    expect(high.filter((s) => s.formData.reviewStatus === "rejected").length).toBeGreaterThanOrEqual(2)
  })

  it("6. every record has a one-line plain reason for its risk level", () => {
    for (const s of S) {
      const reason = (s.formData as unknown as Record<string, unknown>).riskPlainReason
      expect(typeof reason, `${s.id} riskPlainReason`).toBe("string")
      const text = String(reason)
      expect(text.trim().length, s.id).toBeGreaterThan(10)
      expect(text.length, s.id).toBeLessThanOrEqual(90)
      expect(text, s.id).not.toMatch(/\n/)
    }
  })

  it("7. exactly 3 duplicate clusters, 7 to 9 ideas, each across at least two offices, the supplier past-performance cluster kept", () => {
    const clusters = clusterDuplicates(S, es2)
    expect(clusters).toHaveLength(3)
    const members = clusters.flatMap((c) => c.memberIds)
    expect(members.length).toBeGreaterThanOrEqual(7)
    expect(members.length).toBeLessThanOrEqual(9)
    for (const c of clusters) expect(c.bureaus.length, c.memberIds.join(",")).toBeGreaterThanOrEqual(2)
    expect(clusters.some((c) => [...c.memberIds].sort().join() === [...DUPLICATE_GROUP].sort().join())).toBe(true)
  })

  it("8. a status mix, with at least 3 Decision Center candidates from at least two offices", () => {
    const statuses = new Set(S.map((s) => String(s.formData.reviewStatus)))
    for (const st of ["submitted", "in_review", "needs_info", "approved", "rejected"]) expect(statuses.has(st), st).toBe(true)
    const candidates = decisionCenterCandidates(S, { role: "admin" })
    expect(candidates.length).toBeGreaterThanOrEqual(3)
    expect(new Set(candidates.map(getBusinessUnit)).size).toBeGreaterThanOrEqual(2)
  })

  it("keeps the target split from the approved mock, within a small margin", () => {
    const target: Record<string, [number, number, number]> = {
      atr: [15, 2, 5], hrfm: [9, 3, 3], logfin: [8, 1, 3], bts: [7, 0, 2], cerp: [3, 0, 1],
    }
    for (const [unit, [ideas, hi, dec]] of Object.entries(target)) {
      const rows = byOffice(unit)
      expect(Math.abs(rows.length - ideas), `${unit} ideas`).toBeLessThanOrEqual(2)
      expect(Math.abs(rows.filter((s) => high.includes(s)).length - hi), `${unit} high`).toBeLessThanOrEqual(1)
      expect(Math.abs(rows.filter((s) => decided.includes(s)).length - dec), `${unit} decided`).toBeLessThanOrEqual(1)
    }
  })
})

// ─── F4-5 (#310): fixes from the CPO preview walk ─────────────────────────
describe("F4-5: approved records read as pilots, confirmed by the decider", () => {
  const approved = S.filter((s) => s.formData.reviewStatus === "approved")
  const rejected = S.filter((s) => s.formData.reviewStatus === "rejected")

  // Every string the record page can show, comments included.
  function texts(v: unknown): string[] {
    if (typeof v === "string") return [v]
    if (Array.isArray(v)) return v.flatMap(texts)
    if (v && typeof v === "object") return Object.values(v).flatMap(texts)
    return []
  }

  it("1. no approved record's text says deployed, or accredited without an ATO", () => {
    expect(approved.length).toBeGreaterThan(0)
    for (const s of approved) {
      const fd = s.formData as unknown as Record<string, unknown>
      expect(fd.stageOfDevelopment, s.id).not.toBe("deployed")
      const all = texts(fd)
      expect(all.filter((t) => /\bdeployed\b/i.test(t)), `${s.id} says "deployed"`).toEqual([])
      if (fd.hasATO !== "yes") {
        expect(all.filter((t) => /\baccredited\b/i.test(t)), `${s.id} says "accredited" with no ATO`).toEqual([])
      }
    }
  })

  it("1b. the clause recommender says pilot, and no accredited pilot claim beyond its ATO", () => {
    const fd = byId("es2-acws-clause-recommendation").formData
    expect(fd.hasATO).toBe("yes")
    expect(`${fd.feasibilitySummary} ${fd.executiveSummary} ${fd.readinessSummary}`).toMatch(/pilot/i)
  })

  it("2. every approved record carries the decider's confirmations, at or before the decision", () => {
    for (const s of approved) {
      const signoff = getBureauSignoff(s)!
      const decidedAt = new Date(getDecidedAt(s)!).getTime()
      const resolved = resolveRmfProfile(s, es2)

      const rmf = getRmfProfileReview(s)
      expect(rmf, `${s.id} rmf review`).toBeDefined()
      expect(rmf!.decision, s.id).toBe("confirmed")
      expect(resolved.isProposal, `${s.id} still a proposal`).toBe(false)
      expect(rmf!.byName, s.id).toBe(signoff.signedOffByName)
      expect(rmf!.byEmail, s.id).toBe(signoff.signedOffByEmail)
      expect(new Date(rmf!.at).getTime(), `${s.id} rmf at`).toBeLessThanOrEqual(decidedAt)
      expect(new Date(rmf!.at).getTime(), `${s.id} rmf after submit`).toBeGreaterThanOrEqual(new Date(s.submittedAt).getTime())

      const gov = getGovernanceCaptureReview(s)
      expect(gov, `${s.id} governance review`).toBeDefined()
      expect(gov!.byName, s.id).toBe(signoff.signedOffByName)
      expect(gov!.byEmail, s.id).toBe(signoff.signedOffByEmail)
      expect(new Date(gov!.at).getTime(), `${s.id} governance at`).toBeLessThanOrEqual(decidedAt)
      expect(new Date(gov!.at).getTime(), `${s.id} governance after submit`).toBeGreaterThanOrEqual(new Date(s.submittedAt).getTime())

      const applicable = applicableGovernanceFields(s.formData)
      const reviewed = new Set(gov!.entries.map((e) => e.field))
      expect(applicable.filter((f) => !reviewed.has(f as string)), `${s.id} unconfirmed fields`).toEqual([])
      expect(reviewed.has("highImpact"), `${s.id} high-impact`).toBe(true)
      for (const e of gov!.entries) {
        expect(e.decision, `${s.id} ${e.field}`).toBe("confirmed")
        expect(e.finalValue, `${s.id} ${e.field}`).toEqual((s.formData as unknown as Record<string, unknown>)[e.field])
      }

      const counts = governanceFieldCounts(applicable, null, gov)
      expect(counts.confirmedByReviewer, s.id).toBe(counts.applicableCount)
    }
  })

  it("3. rejected records still show who decided and when", () => {
    expect(rejected.length).toBeGreaterThan(0)
    for (const s of rejected) {
      const signoff = getBureauSignoff(s)
      expect(signoff?.signedOffByName, s.id).toBeTruthy()
      expect(Number.isNaN(new Date(signoff?.signedOffAt || "").getTime()), s.id).toBe(false)
      expect(getDecidedAt(s), s.id).toBe(signoff!.signedOffAt)
    }
  })
})

// ─── NL-15 (#335): success measures and risk reasons that match the level ───
describe("NL-15 seed polish (#335)", () => {
  const es2Copy = tenantCopy(es2)
  const hasMeasure = (s: Submission) => {
    const fd = s.formData as unknown as Record<string, unknown>
    return String(fd.successMetrics ?? "").trim().length > 0 || (Array.isArray(fd.keyMetrics) && fd.keyMetrics.length > 0)
  }

  it("3. all but at most 3 ideas carry a way to measure success, and the data check agrees", () => {
    const blank = S.filter((s) => !hasMeasure(s))
    expect(blank.length).toBeGreaterThanOrEqual(1) // the data check keeps something to show
    expect(blank.length).toBeLessThanOrEqual(3)
    const report = buildPortfolioReport(S, es2, Date.now())
    expect(report.summary.dataCheck.noMeasure).toBe(blank.length)
    for (const s of S.filter(hasMeasure)) {
      const m = String((s.formData as unknown as Record<string, unknown>).successMetrics ?? "").trim()
      if (m) expect(m.length, s.id).toBeGreaterThan(15)
    }
  })

  it("3. adding measures leaves the headline counts as they were", () => {
    const report = buildPortfolioReport(S, es2, Date.now())
    expect(S).toHaveLength(42)
    expect(report.summary.risk.high).toBe(6)
    expect(report.summary.decisions.approved + report.summary.decisions.notApproved).toBe(14)
    expect(clusterDuplicates(S, es2)).toHaveLength(3)
  })

  it("4. no Low-risk record carries a reason that reads as high risk", () => {
    const HIGH_READING = /meaningfully affect|high.impact|high risk|would (decide|issue|hold|start)|no person|no one|with no .* (check|review|confirm)/i
    const report = buildPortfolioReport(S, es2, Date.now())
    const low = report.ideas.filter((i) => i.riskLevel === "low")
    expect(low.length).toBeGreaterThan(5)
    for (const i of low) {
      expect(i.reason, i.id).not.toMatch(HIGH_READING)
      expect(i.reason, i.id).not.toBe(es2Copy.portfolioReasonHigh)
    }
  })
})

// FIX-4 item 3: an idea that has risk answers must never print the fallback
// "Not assessed yet" reason beside it on the portfolio report.
describe("ES2 demo data: risk reason", () => {
  it("no idea with risk answers shows the 'Not assessed yet' reason", () => {
    const fallback = tenantCopy(es2).portfolioReasonUnassessed
    const report = buildPortfolioReport(es2SeedSubmissions, es2, Date.parse("2026-11-15T12:00:00Z"))
    const assessed = new Set(es2SeedSubmissions.filter((s) => computeRiskProfile(s.formData).level !== "unknown").map((s) => s.id))
    expect(assessed.size).toBeGreaterThan(0)
    const offenders = report.ideas.filter((i) => assessed.has(i.id) && i.reason === fallback).map((i) => i.id)
    expect(offenders).toEqual([])
  })
})
