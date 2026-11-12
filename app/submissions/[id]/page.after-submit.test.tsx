// Issue #268: the screen a submitter lands on right after submitting must show
// the new record, not "Submission not found". Uses the real store and cache
// (only the network and session are faked) so it fails if saveSubmission stops
// putting the record where the detail page reads from.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { initialFormData } from "@/lib/steps"
import { setCachedSubmissions } from "@/lib/dataCache"
import { saveSubmission } from "@/lib/submissions"

let paramsId = ""
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: paramsId }),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => "/submissions/x",
}))

const session = {
  userId: "u1",
  email: "jane@example.gov",
  name: "Jane Doe",
  role: "submitter" as const,
  businessUnit: "census",
  loggedInAt: new Date(0).toISOString(),
}
vi.mock("@/lib/auth", () => ({
  ensureSeeded: () => {},
  getSession: () => session,
  hasAdminAccess: () => false,
}))
vi.mock("@/components/data-provider", () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useDataProvider: () => ({ loaded: true, refetchSubmissions: () => Promise.resolve() }),
}))
vi.mock("@/components/dashboard/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock("@/app/actions", () => ({
  assistReviewer: () => Promise.resolve({}),
  draftGovernanceFields: () => Promise.resolve({}),
}))
vi.mock("@/app/systemConnector-actions", () => ({ pushApprovedSubmission: () => Promise.resolve() }))

import SubmissionDetailPage from "./page"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  process.env.NEXT_PUBLIC_TENANT = "doc"
  setCachedSubmissions([])
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  container?.remove()
  container = null
  root = null
  vi.unstubAllGlobals()
  delete process.env.NEXT_PUBLIC_TENANT
})

describe("/submissions/[id] straight after a submit", () => {
  for (const tenant of ["uspto", "doc", "dow", "es2"]) {
    it(`${tenant}: shows the new record's title, not "Submission not found"`, async () => {
      process.env.NEXT_PUBLIC_TENANT = tenant
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))

      const saved = await saveSubmission({
        ...initialFormData,
        submitterName: "Jane Doe",
        submitterEmail: "jane@example.gov",
        submitterOffice: "census",
        useCaseTitle: "Closeout file checker",
      })

      paramsId = saved.id
      container = document.createElement("div")
      document.body.appendChild(container)
      root = createRoot(container)
      act(() => root!.render(<SubmissionDetailPage />))
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(container.textContent).not.toContain("Submission not found")
      expect(container.textContent).toContain("Closeout file checker")
    })
  }
})
