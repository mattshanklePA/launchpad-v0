// F8-2 (#354): the decision toast says "hold" and "ideas" on ES2 only.

import { describe, it, expect, afterEach, vi } from "vitest"
import { act } from "react"
import { render } from "@/components/cockpit/test-utils"

const toast = vi.fn()
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast }) }))
vi.mock("@/lib/rationalizationActions", () => ({
  applyRationalizationDecision: async () => {},
  undoRationalizationDecision: async () => {},
}))
vi.mock("@/lib/auth", () => ({ getSession: () => null }))

import { ClusterDecision } from "./cluster-decision"

const prev = process.env.NEXT_PUBLIC_TENANT
afterEach(() => {
  toast.mockClear()
  if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = prev
})

async function decide(tenant: string) {
  process.env.NEXT_PUBLIC_TENANT = tenant
  const cluster = { id: "a", memberIds: ["a", "b", "c"], maxSimilarity: 0.5 } as never
  const el = render(<ClusterDecision cluster={cluster} members={[]} decision={undefined} leadId="a" onDecided={() => {}} />)
  const button = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Keep separate and link")!
  await act(async () => button.click())
  return toast.mock.calls[0][0].description as string
}

describe("decision toast", () => {
  it("ES2: Clears the hold on all N ideas.", async () => {
    expect(await decide("es2")).toBe("Clears the hold on all 3 ideas.")
  })
  it.each(["uspto", "doc", "dow"])("%s: today's text", async (t) => {
    expect(await decide(t)).toBe("Clears the rationalization block on all 3 submissions.")
  })
})
