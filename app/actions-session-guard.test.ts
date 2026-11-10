// @vitest-environment node
//
// Every server action must reject a call without a valid session, and the
// reviewer-or-admin ones must reject a submitter. Calls are made with a cookie
// jar we control (next/headers mocked); a rejected call never reaches the model.

import { describe, it, expect, beforeEach, vi } from "vitest"
import { signSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/session/token"

let jar: string | undefined
vi.mock("next/headers", () => ({
  cookies: () => ({ get: (n: string) => (n === SESSION_COOKIE_NAME && jar ? { value: jar } : undefined) }),
}))

import * as actions from "@/app/actions"
import { assessCluster } from "@/app/cluster-actions"
import { compareSubmissions } from "@/app/admin/compare-actions"
import { sendDashboardActionNotification } from "@/app/dashboard-actions"
import { pushApprovedSubmission } from "@/app/systemConnector-actions"

const base = { userId: "u1", email: "u@x.gov", name: "U", jobRole: "", businessUnit: "patents", office: "" }
const as = (role: "submitter" | "reviewer" | "admin") => signSession({ ...base, role })

const fd: any = {}
const sub: any = { id: "s1", submittedAt: "2026-01-01T00:00:00Z", formData: {} }

// [name, call, minimum role]
const ACTIONS: Array<[string, () => Promise<unknown>, "any" | "reviewer"]> = [
  ["assessReadiness", () => actions.assessReadiness(fd), "any"],
  ["suggestStrategicAlignment", () => actions.suggestStrategicAlignment(fd), "any"],
  ["validateAndRefineInput", () => actions.validateAndRefineInput(fd, 1, []), "any"],
  ["suggestIdeaOverview", () => actions.suggestIdeaOverview(fd), "any"],
  ["assistReviewer", () => actions.assistReviewer(fd), "any"],
  ["draftGovernanceFields", () => actions.draftGovernanceFields(fd), "any"],
  ["assessCluster", () => assessCluster([sub, sub]), "reviewer"],
  ["compareSubmissions", () => compareSubmissions([sub, sub]), "reviewer"],
  ["sendDashboardActionNotification", () => sendDashboardActionNotification([]), "reviewer"],
  ["pushApprovedSubmission", () => pushApprovedSubmission(sub), "reviewer"],
]

beforeEach(() => {
  process.env.KEYSTONE_SESSION_SECRET = "actions-secret-actions-secret"
  jar = undefined
})

describe("server actions require a session", () => {
  it.each(ACTIONS)("%s rejects with no cookie", async (_n, call) => {
    jar = undefined
    await expect(call()).rejects.toMatchObject({ name: "SessionError", status: 401 })
  })

  it.each(ACTIONS)("%s rejects a tampered cookie", async (_n, call) => {
    const [p, s] = as("submitter").split(".")
    const forged = JSON.parse(Buffer.from(p, "base64url").toString())
    forged.role = "admin"
    jar = `${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${s}`
    await expect(call()).rejects.toMatchObject({ status: 401 })
  })

  it.each(ACTIONS)("%s rejects an expired cookie", async (_n, call) => {
    jar = signSession({ ...base, role: "admin" }, Date.now() - (SESSION_TTL_SECONDS + 60) * 1000)
    await expect(call()).rejects.toMatchObject({ status: 401 })
  })

  it.each(ACTIONS.filter(([, , min]) => min === "reviewer"))(
    "%s rejects a submitter with 403",
    async (_n, call) => {
      jar = as("submitter")
      await expect(call()).rejects.toMatchObject({ name: "SessionError", status: 403 })
    },
  )
})
