// F8-2 (#354): "Could they share one solution?" on the overlap group, ES2 only.

import { describe, it, expect } from "vitest"
import { ClusterProfiles } from "./cluster-profiles"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { es2 } from "@/lib/tenant/es2"
import { uspto } from "@/lib/tenant/uspto"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { render } from "@/components/cockpit/test-utils"

const byId = (id: string) => es2SeedSubmissions.find((s) => s.id === id)!
const SUPPLIER = [
  "es2-bts-supplier-risk-scoring",
  "es2-digitalmarket-vendor-past-performance",
  "es2-logfin-supplier-past-performance",
].map(byId)
const SUPPORT = ["es2-bts-support-request-routing", "es2-cerp-support-request-routing"].map(byId)

describe("ClusterProfiles (ES2)", () => {
  it("supplier group: three columns, four rows, two Same as and one Different per compared row", () => {
    const el = render(<ClusterProfiles members={SUPPLIER} tenant={es2} />)
    expect(el.querySelector("h2")?.textContent).toBe("Could they share one solution?")
    expect(el.textContent).toContain("from each program profile")
    expect(el.querySelectorAll("thead th[scope=col]")).toHaveLength(3)
    const rows = Array.from(el.querySelectorAll("tbody tr"))
    expect(rows.map((r) => r.querySelector("th[scope=row]")?.textContent)).toEqual([
      "Where it runs",
      "Built on",
      "Data it would use",
      "Who owns it",
    ])
    const text = el.textContent!
    expect(text).toContain("Same as BTS")
    expect(text).toContain("Different")
    const runs = rows[0].querySelectorAll("td")
    expect(runs[1].textContent).toContain("Same as BTS")
    expect(runs[2].textContent).toContain("Different")
    expect(el.textContent).toContain("Digital Market")
  })

  it("support request group: the column with no profile reads No profile yet. then dashes, with no Add one", () => {
    const el = render(<ClusterProfiles members={SUPPORT} tenant={es2} />)
    const rows = Array.from(el.querySelectorAll("tbody tr"))
    expect(rows[0].querySelectorAll("td")[1].textContent).toBe("No profile yet.")
    for (const r of rows.slice(1)) expect(r.querySelectorAll("td")[1].textContent).toBe("–")
    expect(el.querySelector("a")).toBeNull()
    expect(el.textContent).not.toMatch(/add one/i)
  })

  it("marks the first column this one only when opened from that idea", () => {
    const opened = render(<ClusterProfiles members={SUPPLIER} tenant={es2} currentSubmissionId={SUPPLIER[0].id} />)
    expect(opened.textContent!.match(/this one/g)).toHaveLength(1)
    expect(opened.querySelectorAll("thead th")[0].textContent).toContain("this one")
    const none = render(<ClusterProfiles members={SUPPLIER} tenant={es2} />)
    expect(none.textContent).not.toContain("this one")
  })

  it("puts the opened idea first when it is not first in member order", () => {
    const el = render(<ClusterProfiles members={SUPPLIER} tenant={es2} currentSubmissionId={SUPPLIER[2].id} />)
    expect(el.querySelectorAll("thead th")[0].textContent).toContain("this one")
    expect(el.querySelectorAll("thead th")[0].textContent).toContain("LOG-FIN")
  })

  it("scrolls inside its own box, keyboard reachable", () => {
    const el = render(<ClusterProfiles members={SUPPLIER} tenant={es2} />)
    const box = el.querySelector("[data-profile-scroll]")!
    expect(box.className).toContain("overflow-x-auto")
    expect(box.getAttribute("tabindex")).toBe("0")
    expect(box.getAttribute("role")).toBe("region")
    expect(box.getAttribute("aria-label")).toBeTruthy()
  })

  it("shows no record code or vendor name", () => {
    const el = render(<ClusterProfiles members={SUPPLIER} tenant={es2} currentSubmissionId={SUPPLIER[0].id} />)
    expect(el.textContent).not.toMatch(/es2-|KS-\d|anthropic|claude|openai|gpt|gemini/i)
  })

  it.each([
    ["uspto", uspto],
    ["doc", doc],
    ["dow", dow],
  ])("%s: renders nothing", (_n, tenant) => {
    const el = render(<ClusterProfiles members={SUPPLIER} tenant={tenant} />)
    expect(el.innerHTML).toBe("")
  })
})
