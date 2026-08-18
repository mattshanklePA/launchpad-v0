import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { es2 } from "@/lib/tenant/es2"
import { similarity } from "@/lib/similarity"
import { isCrossBureauDuplicatePair, ROLLUP_DUPLICATE_THRESHOLD } from "@/lib/crossBureauDuplicates"
import { clusterDuplicates } from "@/lib/rationalization"
import { determineConsolidation, CONSOLIDATION_CATEGORIES } from "@/lib/ombConsolidation"
import { computeRmfProfile, RMF_FUNCTION_ORDER } from "@/lib/nistRmf"
import { STATUS_ORDER, getBusinessUnit } from "@/lib/reviewWorkflow"
import type { Submission } from "@/lib/submissions"

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
  it("has 15 deterministic, uniquely-identified submissions", () => {
    expect(S).toHaveLength(15)
    const ids = S.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^es2-/)
  })

  it("spreads across every pipeline status, with exactly one draft and two rejected", () => {
    const statuses = S.map((s) => s.formData.reviewStatus)
    for (const st of STATUS_ORDER) expect(new Set(statuses).has(st), st).toBe(true)
    expect(statuses.filter((s) => s === "draft")).toHaveLength(1)
    expect(statuses.filter((s) => s === "rejected")).toHaveLength(2)
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

  it("forms exactly one cluster, and it is this group", () => {
    const clusters = clusterDuplicates(S, es2)
    expect(clusters).toHaveLength(1)
    expect([...clusters[0].memberIds].sort()).toEqual([...DUPLICATE_GROUP].sort())
    expect(clusters[0].bureaus.length).toBe(3)
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

  it("includes a high-impact, deployed example so the nine high-impact fields render", () => {
    const highImpactDeployed = S.filter(
      (s) => s.formData.highImpact === "high_impact" && s.formData.stageOfDevelopment === "deployed",
    )
    expect(highImpactDeployed.length).toBeGreaterThanOrEqual(1)
    for (const s of highImpactDeployed) {
      expect(s.formData.highImpactFactors.length, `${s.id}.highImpactFactors`).toBeGreaterThan(0)
      expect(s.formData.preDeploymentTesting, s.id).toBe("yes")
      expect(s.formData.ongoingMonitoringPlan, s.id).toBe("yes")
    }
  })

  it("gives the two rejected items the decisional-AI + no-human-review shape and a recorded reason", () => {
    const rejected = S.filter((s) => s.formData.reviewStatus === "rejected")
    expect(rejected).toHaveLength(2)
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
