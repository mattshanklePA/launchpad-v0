import { describe, it, expect } from "vitest"
import { authorizeWrite, viewerFromSession, visibleToSession } from "@/lib/serverAccess"
import type { Submission } from "@/lib/submissions"
import type { SessionClaims } from "@/lib/session/token"

const NOW = "2026-11-10T12:00:00.000Z"

function sub(id: string, p: Partial<Submission> & { fd?: Record<string, unknown> }): Submission {
  return {
    id,
    submittedAt: "2026-01-01T00:00:00.000Z",
    formData: (p.fd ?? {}) as any,
    status: p.status,
    ownerEmail: p.ownerEmail,
    businessUnit: p.businessUnit,
    office: p.office,
  }
}

function sess(p: Partial<SessionClaims> & { role: SessionClaims["role"] }): SessionClaims {
  return { userId: "u", email: "me@x.gov", name: "Me", iat: 0, exp: 9e9, ...p }
}

const all = [
  sub("a", { ownerEmail: "alice@x.gov", businessUnit: "noaa", office: "nws" }),
  sub("b", { ownerEmail: "bob@x.gov", businessUnit: "noaa", office: "nos" }),
  sub("c", { ownerEmail: "cat@x.gov", businessUnit: "census" }),
]
const ids = (r: Submission[]) => r.map((s) => s.id).sort()

describe("visibleToSession (reuses visibleSubmissions with the verified session)", () => {
  it("submitter: only own records", () => {
    expect(ids(visibleToSession(all, sess({ role: "submitter", email: "Alice@x.gov" })))).toEqual(["a"])
  })
  it("office-scoped reviewer: only their office", () => {
    expect(ids(visibleToSession(all, sess({ role: "reviewer", businessUnit: "noaa", office: "nws" })))).toEqual(["a"])
  })
  it("bureau-scoped reviewer: their bureau", () => {
    expect(ids(visibleToSession(all, sess({ role: "reviewer", businessUnit: "noaa" })))).toEqual(["a", "b"])
  })
  it("department admin (no unit) and os admin: everything", () => {
    expect(visibleToSession(all, sess({ role: "admin" }))).toHaveLength(3)
    expect(visibleToSession(all, sess({ role: "admin", businessUnit: "os" }))).toHaveLength(3)
  })
  it("null unit/office claims map to undefined", () => {
    expect(viewerFromSession(sess({ role: "reviewer", businessUnit: null, office: null }))).toMatchObject({
      businessUnit: undefined,
      office: undefined,
    })
  })
})

describe("authorizeWrite", () => {
  const owned = sub("a", {
    ownerEmail: "me@x.gov",
    businessUnit: "noaa",
    fd: { submitterEmail: "me@x.gov", reviewStatus: "needs_info", comments: [{ id: "c1", body: "q", authorRole: "reviewer", authorName: "R", createdAt: "t" }] },
  })

  it("submitter can create their own record, owner forced to the session email", () => {
    const r = authorizeWrite({ session: sess({ role: "submitter" }), existing: null, formData: { submitterEmail: "other@x.gov" }, now: NOW })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.formData.submitterEmail).toBe("me@x.gov")
  })
  it("submitter cannot create a pre-approved record or carry a sign-off", () => {
    const s = sess({ role: "submitter" })
    expect(authorizeWrite({ session: s, existing: null, formData: { reviewStatus: "approved" }, now: NOW })).toMatchObject({ ok: false, status: 403 })
    expect(authorizeWrite({ session: s, existing: null, formData: { bureauSignoff: { decision: "approved" } }, now: NOW })).toMatchObject({ ok: false, status: 403 })
  })
  it("submitter cannot touch another person's record", () => {
    const other = sub("z", { ownerEmail: "bob@x.gov", fd: { submitterEmail: "bob@x.gov" } })
    expect(authorizeWrite({ session: sess({ role: "submitter" }), existing: other, formData: { submitterEmail: "bob@x.gov", x: 1 }, now: NOW })).toMatchObject({ ok: false, status: 403 })
  })
  it("submitter cannot change status on their own record", () => {
    const r = authorizeWrite({ session: sess({ role: "submitter" }), existing: owned, formData: { ...(owned.formData as any), reviewStatus: "approved" }, now: NOW })
    expect(r).toMatchObject({ ok: false, status: 403 })
  })
  it("submitter can reply (needs_info -> submitted); comment is stamped server-side as a submitter", () => {
    const fd = {
      ...(owned.formData as any),
      reviewStatus: "submitted",
      comments: [...(owned.formData as any).comments, { id: "c2", body: "a", authorRole: "admin", authorName: "Forged", createdAt: "1999" }],
    }
    const r = authorizeWrite({ session: sess({ role: "submitter" }), existing: owned, formData: fd, now: NOW })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const c = (r.formData.comments as any[])[1]
      expect(c).toMatchObject({ authorRole: "submitter", authorName: "Me", createdAt: NOW })
    }
  })
  it("submitter cannot rewrite existing comments", () => {
    const fd = { ...(owned.formData as any), comments: [{ id: "c1", body: "edited" }] }
    expect(authorizeWrite({ session: sess({ role: "submitter" }), existing: owned, formData: fd, now: NOW })).toMatchObject({ ok: false, status: 403 })
  })

  it("reviewer in scope stamps signedOffAt from the server, ignoring the browser value", () => {
    const rec = sub("a", { businessUnit: "noaa", office: "nws", fd: { reviewStatus: "in_review" } })
    const fd = {
      reviewStatus: "approved",
      bureauSignoff: { bureau: "noaa", decision: "approved", signedOffByName: "Spoof", signedOffByEmail: "spoof@x", signedOffAt: "1999-01-01T00:00:00.000Z" },
    }
    const r = authorizeWrite({ session: sess({ role: "reviewer", businessUnit: "noaa", office: "nws" }), existing: rec, formData: fd, now: NOW })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.formData.bureauSignoff).toMatchObject({ signedOffAt: NOW, signedOffByEmail: "me@x.gov", signedOffByName: "Me" })
  })
  it("an unchanged existing sign-off keeps its original timestamp", () => {
    const so = { bureau: "noaa", decision: "approved", signedOffByName: "R", signedOffByEmail: "r@x", signedOffAt: "2026-01-02T00:00:00.000Z" }
    const rec = sub("a", { businessUnit: "noaa", fd: { reviewStatus: "approved", bureauSignoff: so } })
    const r = authorizeWrite({ session: sess({ role: "admin" }), existing: rec, formData: { reviewStatus: "approved", bureauSignoff: so }, now: NOW })
    expect(r.ok && (r.formData.bureauSignoff as any).signedOffAt).toBe(so.signedOffAt)
  })
  it("department approval and rationalization decisions are stamped by the server", () => {
    const rec = sub("a", { businessUnit: "noaa", fd: {} })
    const r = authorizeWrite({
      session: sess({ role: "admin" }),
      existing: rec,
      formData: { departmentApproval: { decision: "approved", byName: "x", byEmail: "x", at: "1999" }, rationalization: { decision: "consolidated", decidedBy: "x", decidedAt: "1999" } },
      now: NOW,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.formData.departmentApproval).toMatchObject({ at: NOW, byEmail: "me@x.gov" })
      expect(r.formData.rationalization).toMatchObject({ decidedAt: NOW, decidedBy: "Me" })
    }
  })
  it("bureau-scoped reviewer cannot write outside their bureau/office", () => {
    const s = sess({ role: "reviewer", businessUnit: "noaa", office: "nws" })
    const nos = sub("b", { businessUnit: "noaa", office: "nos" })
    const census = sub("c", { businessUnit: "census" })
    expect(authorizeWrite({ session: s, existing: nos, formData: { reviewStatus: "approved" }, now: NOW })).toMatchObject({ ok: false, status: 403 })
    expect(authorizeWrite({ session: s, existing: census, formData: { reviewStatus: "approved" }, now: NOW })).toMatchObject({ ok: false, status: 403 })
  })
  it("department admin and os admin can write anywhere", () => {
    const census = sub("c", { businessUnit: "census" })
    expect(authorizeWrite({ session: sess({ role: "admin" }), existing: census, formData: { reviewStatus: "approved" }, now: NOW }).ok).toBe(true)
    expect(authorizeWrite({ session: sess({ role: "admin", businessUnit: "os" }), existing: census, formData: { reviewStatus: "approved" }, now: NOW }).ok).toBe(true)
  })
})

describe("authorizeWrite: decided records are locked", () => {
  const signoff = { bureau: "noaa", decision: "approved", signedOffByName: "R", signedOffByEmail: "r@x.gov", signedOffAt: "t" }
  const rec = (status: string, extra: Record<string, unknown> = {}) =>
    sub("d", {
      ownerEmail: "alice@x.gov",
      businessUnit: "noaa",
      fd: { reviewStatus: status, submitterEmail: "alice@x.gov", highImpact: "not_high_impact", comments: [], ...extra },
    })
  const reviewer = sess({ role: "reviewer", email: "r@x.gov", name: "R", businessUnit: "noaa" })
  const admin = sess({ role: "admin", email: "a@x.gov", name: "A" })
  const edit = (existing: Submission, patch: Record<string, unknown>, session = reviewer) =>
    authorizeWrite({ session, existing, formData: { ...(existing.formData as object), ...patch }, now: NOW, bureauTier: true })

  for (const status of ["approved", "rejected"]) {
    const locked = rec(status, { bureauSignoff: signoff })
    it(`refuses a governance edit on a ${status} record with a clear error`, () => {
      const r = edit(locked, { highImpact: "high_impact" })
      expect(r).toMatchObject({ ok: false, status: 409 })
      expect((r as { error: string }).error).toMatch(/decided|locked|signed off/i)
    })
    it(`refuses an RMF confirm on a ${status} record`, () => {
      expect(edit(locked, { rmfProfileReview: { decision: "confirmed" } }).ok).toBe(false)
    })
    it(`refuses moving a ${status} record back to needs_info (Send & request info)`, () => {
      expect(edit(locked, { reviewStatus: "needs_info" }).ok).toBe(false)
    })
    it(`admin may reopen a ${status} record on purpose (status change away from decided)`, () => {
      expect(edit(locked, { reviewStatus: "in_review" }, admin).ok).toBe(true)
    })
    it(`admin may not edit governance while a ${status} record stays decided`, () => {
      expect(edit(locked, { highImpact: "high_impact" }, admin).ok).toBe(false)
    })
    it(`still lets a comment be added to a ${status} record`, () => {
      const c = { id: "c1", body: "hi", authorRole: "reviewer", authorName: "x", createdAt: "t" }
      expect(edit(locked, { comments: [c] }).ok).toBe(true)
    })
  }

  it("allows the same governance edit on an in-review record", () => {
    expect(edit(rec("in_review"), { highImpact: "high_impact" }).ok).toBe(true)
  })
  it("allows the approving write itself (in review -> approved)", () => {
    expect(edit(rec("in_review"), { reviewStatus: "approved", bureauSignoff: signoff }).ok).toBe(true)
  })
  it("a decision not yet signed off on a bureau-tier tenant is still reversible", () => {
    expect(edit(rec("approved"), { reviewStatus: "in_review" }).ok).toBe(true)
  })
})

describe("authorizeWrite: decisions allowed after sign-off (FIX-1)", () => {
  const signoff = { bureau: "noaa", decision: "approved", signedOffByName: "R", signedOffByEmail: "r@x.gov", signedOffAt: "t" }
  const rec = (extra: Record<string, unknown> = {}) =>
    sub("d", {
      ownerEmail: "alice@x.gov",
      businessUnit: "noaa",
      fd: { reviewStatus: "approved", submitterEmail: "alice@x.gov", comments: [], bureauSignoff: signoff, ...extra },
    })
  const reviewer = sess({ role: "reviewer", email: "r@x.gov", name: "R", businessUnit: "noaa" })
  const otherReviewer = sess({ role: "reviewer", email: "o@x.gov", name: "O", businessUnit: "census" })
  const deptAdmin = sess({ role: "admin", email: "dept@x.gov", name: "Dept Admin" })
  const osAdmin = sess({ role: "admin", email: "os@x.gov", name: "OS Admin", businessUnit: "os" })
  const bureauAdmin = sess({ role: "admin", email: "ba@x.gov", name: "Bureau Admin", businessUnit: "noaa" })
  const submitter = sess({ role: "submitter", email: "alice@x.gov", name: "Alice" })
  const DA = { decision: "approved", byName: "browser", byEmail: "browser@x.gov", at: "browser-time" }
  const RA = { decision: "consolidate", decidedBy: "browser", decidedAt: "browser-time" }
  const write = (
    existing: Submission,
    patch: Record<string, unknown>,
    session: SessionClaims,
    opts: { bureauTier?: boolean; departmentFinalApproval?: boolean } = {},
  ) =>
    authorizeWrite({
      session,
      existing,
      formData: { ...(existing.formData as object), ...patch },
      now: NOW,
      bureauTier: opts.bureauTier ?? true,
      departmentFinalApproval: opts.departmentFinalApproval ?? true,
    })

  it("lets the department-level admin set departmentApproval, stamped by the server", () => {
    const r = write(rec(), { departmentApproval: DA }, deptAdmin)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.formData.departmentApproval).toMatchObject({ byName: "Dept Admin", byEmail: "dept@x.gov", at: NOW })
  })
  it("lets an OS admin set departmentApproval", () => {
    expect(write(rec(), { departmentApproval: DA }, osAdmin).ok).toBe(true)
  })
  it("refuses departmentApproval when the tenant has department approval off (ES2)", () => {
    expect(write(rec(), { departmentApproval: DA }, deptAdmin, { departmentFinalApproval: false })).toMatchObject({ ok: false, status: 409 })
  })
  it("refuses departmentApproval from a person who may not give it", () => {
    expect(write(rec(), { departmentApproval: DA }, reviewer).ok).toBe(false)
  })
  it("refuses departmentApproval from an admin who belongs to one bureau", () => {
    expect(write(rec(), { departmentApproval: DA }, bureauAdmin).ok).toBe(false)
  })
  it("lets a reviewer in scope set rationalization, stamped by the server", () => {
    const r = write(rec(), { rationalization: RA }, reviewer)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.formData.rationalization).toMatchObject({ decidedBy: "R", decidedAt: NOW })
  })
  it("refuses rationalization from a reviewer outside the office with 403", () => {
    expect(write(rec(), { rationalization: RA }, otherReviewer)).toMatchObject({ ok: false, status: 403 })
  })
  it("refuses rationalization plus any other changed key with 409", () => {
    expect(write(rec(), { rationalization: RA, highImpact: "high_impact" }, reviewer)).toMatchObject({ ok: false, status: 409 })
  })
  it("refuses departmentApproval plus any other changed key with 409", () => {
    expect(write(rec(), { departmentApproval: DA, highImpact: "high_impact" }, deptAdmin)).toMatchObject({ ok: false, status: 409 })
  })
  it("refuses a submitter changing either key", () => {
    expect(write(rec(), { rationalization: RA }, submitter).ok).toBe(false)
    expect(write(rec(), { departmentApproval: DA }, submitter).ok).toBe(false)
  })
  it("an admin reopening still works with other changes carried along", () => {
    expect(write(rec(), { reviewStatus: "in_review", highImpact: "high_impact" }, deptAdmin).ok).toBe(true)
  })
  it("no bureau tier (USPTO, DoW): a reviewer in scope may set rationalization on an approved record", () => {
    const existing = sub("u", { ownerEmail: "alice@x.gov", fd: { reviewStatus: "approved", submitterEmail: "alice@x.gov", comments: [] } })
    expect(write(existing, { rationalization: RA }, sess({ role: "reviewer", email: "r@x.gov", name: "R" }), { bureauTier: false, departmentFinalApproval: false }).ok).toBe(true)
  })

  describe("flows under the real tenant setting", () => {
    const withTenant = (id: string, fn: () => void) => {
      const prev = process.env.NEXT_PUBLIC_TENANT
      process.env.NEXT_PUBLIC_TENANT = id
      try {
        fn()
      } finally {
        if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
        else process.env.NEXT_PUBLIC_TENANT = prev
      }
    }
    const raw = (existing: Submission, patch: Record<string, unknown>, session: SessionClaims) =>
      authorizeWrite({ session, existing, formData: { ...(existing.formData as object), ...patch }, now: NOW })

    it("Commerce (doc): approve, bureau sign-off, then department approval is stored", () => {
      withTenant("doc", () => {
        const open = sub("f", { ownerEmail: "alice@x.gov", businessUnit: "noaa", fd: { reviewStatus: "in_review", submitterEmail: "alice@x.gov", comments: [] } })
        const step1 = raw(open, { reviewStatus: "approved", bureauSignoff: { bureau: "noaa", decision: "approved" } }, reviewer)
        expect(step1.ok).toBe(true)
        if (!step1.ok) return
        const signed = sub("f", { ownerEmail: "alice@x.gov", businessUnit: "noaa", fd: step1.formData })
        const step2 = raw(signed, { departmentApproval: DA }, deptAdmin)
        expect(step2.ok).toBe(true)
        if (step2.ok) expect(step2.formData.departmentApproval).toMatchObject({ byEmail: "dept@x.gov", at: NOW })
      })
    })

    it("ES2: a group decision is saved on a decided, signed-off member and an undecided one", () => {
      withTenant("es2", () => {
        const decided = rec()
        const undecided = sub("g", { ownerEmail: "bob@x.gov", businessUnit: "noaa", fd: { reviewStatus: "in_review", submitterEmail: "bob@x.gov", comments: [] } })
        for (const m of [decided, undecided]) {
          const r = raw(m, { rationalization: RA }, reviewer)
          expect(r.ok).toBe(true)
          if (r.ok) expect(r.formData.rationalization).toMatchObject({ decidedBy: "R", decidedAt: NOW })
        }
      })
    })
  })
})
