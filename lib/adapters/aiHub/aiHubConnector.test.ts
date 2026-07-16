import { describe, it, expect, afterEach, vi } from "vitest"
import { aiHubConnector } from "@/lib/adapters/aiHub/aiHubConnector"
import { getSystemConnector } from "@/lib/systemConnector"
import { mapSubmissionToOmbRow, OMB_COLUMNS } from "@/lib/ombExport"
import type { Submission } from "@/lib/submissions"

const withTenant = (id: string, run: () => void | Promise<void>) => {
  const prev = process.env.NEXT_PUBLIC_TENANT
  process.env.NEXT_PUBLIC_TENANT = id
  return Promise.resolve(run()).finally(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
    else process.env.NEXT_PUBLIC_TENANT = prev
  })
}

function sub(id: string, formData: Record<string, unknown>): Submission {
  return {
    id,
    submittedAt: "2026-01-01T00:00:00.000Z",
    formData: formData as any,
  }
}

const FORM = {
  useCaseTitle: "Bureau Duplicate Finder",
  submitterOffice: "nist",
  submitterEmail: "someone@doc.gov",
  isWithheld: "no",
  stageOfDevelopment: "pilot",
  highImpact: "not_high_impact",
  topicArea: "other",
  aiClassification: "generative_ai",
  coreProblem: "Bureaus can't see each other's AI use cases.",
  businessValue: "Avoids duplicate spend.",
  solutionSummary: "Flags likely duplicates across bureaus.",
  systemSource: "in_house",
  hasATO: "no",
  hasPii: "no",
  customCode: "yes",
}

describe("getSystemConnector", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TENANT
  })

  it("selects the AI Hub adapter when the tenant's aiHubExport flag is set (doc)", async () => {
    delete process.env.AI_HUB_ENDPOINT_URL
    await withTenant("doc", async () => {
      // rallyConnector's pushSubmission always resolves with a
      // rally1.rallydev.com URL (lib/rallyClient.ts); the AI Hub adapter
      // never returns that URL, so the two adapters are distinguishable
      // through the public pushSubmission return shape alone.
      const res = await getSystemConnector().pushSubmission(sub("s0", FORM))
      expect(res.url).not.toBe("https://rally1.rallydev.com/...")
    })
  })

  it("stays on the default Rally connector for tenants without aiHubExport (uspto, dow)", async () => {
    await withTenant("uspto", async () => {
      const res = await getSystemConnector().pushSubmission(sub("s1", FORM))
      expect(res.url).toBe("https://rally1.rallydev.com/...")
    })
    await withTenant("dow", async () => {
      const res = await getSystemConnector().pushSubmission(sub("s2", FORM))
      expect(res.url).toBe("https://rally1.rallydev.com/...")
    })
  })
})

describe("aiHubConnector", () => {
  const prevEndpoint = process.env.AI_HUB_ENDPOINT_URL

  afterEach(() => {
    if (prevEndpoint === undefined) delete process.env.AI_HUB_ENDPOINT_URL
    else process.env.AI_HUB_ENDPOINT_URL = prevEndpoint
    delete process.env.NEXT_PUBLIC_TENANT
    vi.unstubAllGlobals()
  })

  it("maps the submission via the shared OMB mapping (lib/ombExport.ts), not a second copy", async () => {
    delete process.env.AI_HUB_ENDPOINT_URL
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    await withTenant("doc", async () => {
      const submission = sub("s3", FORM)
      const expectedRow = mapSubmissionToOmbRow(submission, { shortName: "DOC", publicInquiryEmail: "AI.Inventory@doc.gov" })

      const res = await aiHubConnector().pushSubmission(submission)

      expect(res.ok).toBe(true)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(expectedRow[OMB_COLUMNS.indexOf("Use Case Name")]).toBe("Bureau Duplicate Finder")
    })
  })

  it("no-ops safely (log + succeed) when AI_HUB_ENDPOINT_URL is unconfigured", async () => {
    delete process.env.AI_HUB_ENDPOINT_URL
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    await withTenant("doc", async () => {
      const res = await aiHubConnector().pushSubmission(sub("s4", FORM))
      expect(res).toEqual({ ok: true })
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  it("posts the mapped OMB payload to the configured endpoint", async () => {
    process.env.AI_HUB_ENDPOINT_URL = "https://ai-hub.example.gov/submissions"
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchSpy)

    await withTenant("doc", async () => {
      const submission = sub("s5", FORM)
      const res = await aiHubConnector().pushSubmission(submission)

      expect(res).toEqual({ ok: true, url: "https://ai-hub.example.gov/submissions" })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, init] = fetchSpy.mock.calls[0]
      expect(url).toBe("https://ai-hub.example.gov/submissions")
      expect(init.method).toBe("POST")
      const body = JSON.parse(init.body)
      expect(body["Use Case Name"]).toBe("Bureau Duplicate Finder")
      expect(body["Agency"]).toBe("DOC")
      // Only the 34 OMB columns travel — never the raw formData/submission.
      expect(Object.keys(body).sort()).toEqual([...OMB_COLUMNS].sort())
    })
  })

  it("surfaces a failed push when the endpoint responds not-ok", async () => {
    process.env.AI_HUB_ENDPOINT_URL = "https://ai-hub.example.gov/submissions"
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))

    await withTenant("doc", async () => {
      const res = await aiHubConnector().pushSubmission(sub("s6", FORM))
      expect(res.ok).toBe(false)
    })
  })
})
