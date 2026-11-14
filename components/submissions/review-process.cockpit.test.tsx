// NL-12 (#313): the record page does not move while Plumb reads, on ES2 only.

import { describe, it, expect } from "vitest"
import { ReviewProcess, type ReviewProcessProps } from "./review-process"
import { es2 } from "@/lib/tenant/es2"
import { doc } from "@/lib/tenant/doc"
import { render } from "@/components/cockpit/test-utils"
import { initialFormData } from "@/lib/steps"
import type { ReviewStep } from "@/lib/reviewSteps"
import type { TenantConfig } from "@/lib/tenant"

const steps: ReviewStep[] = [
  { key: "high_impact", index: 1, settled: false },
  { key: "governance", index: 2, settled: false },
  { key: "disposition", index: 3, settled: false },
] as unknown as ReviewStep[]

function props(tenant: TenantConfig, extra: Partial<ReviewProcessProps> = {}): ReviewProcessProps {
  return {
    submission: { id: "es2-acws-thing", submittedAt: "2026-08-18T00:00:00.000Z", status: "in_review", formData: initialFormData },
    tenant,
    status: "in_review",
    reviewerName: "Avery",
    busy: false,
    setBusy: () => {},
    assistantName: "Plumb",
    steps,
    currentStepKey: "disposition",
    onNavigateStep: () => {},
    clusterAllMembers: [],
    onClusterDecided: () => {},
    fd: initialFormData,
    highImpactRec: {} as never,
    onSetHighImpact: () => {},
    resolvedRmf: null,
    rmfOverriding: false,
    setRmfOverriding: () => {},
    rmfOverrideNote: "",
    setRmfOverrideNote: () => {},
    onConfirmRmf: () => {},
    onOverrideRmf: () => {},
    governanceApplicableCount: 0,
    draftedByPlumb: 0,
    confirmedByReviewer: 0,
    byName: "",
    byEmail: "",
    onGovernanceSaved: async () => {},
    onApprove: () => {},
    onRequestInfo: () => {},
    onReject: () => {},
    comment: "",
    onCommentChange: () => {},
    onSend: () => {},
    sendDisabled: true,
    onDraftWithPlumb: () => {},
    draftDisabled: true,
    ...extra,
  }
}

describe("ReviewProcess while Plumb reads (ES2)", () => {
  it("keeps the same step title and count while reading and after the read lands", () => {
    const reading = render(<ReviewProcess {...props(es2, { reading: true, onSkipToSteps: () => {} })} />)
    const landed = render(<ReviewProcess {...props(es2, { reading: false })} />)
    const title = (el: Element) => el.querySelector('[data-cockpit="section-title"]')!.textContent
    expect(title(reading)).toBe(title(landed))
    expect(title(reading)).toContain("Step 3 of 3")
  })

  it("shows Plumb's progress in the box while reading, then the step fills it", () => {
    const reading = render(<ReviewProcess {...props(es2, { reading: true, onSkipToSteps: () => {} })} />)
    expect(reading.textContent).toContain("reading this submission")
    expect(reading.textContent).not.toContain("Every answer is reversible")
    const landed = render(<ReviewProcess {...props(es2, { reading: false })} />)
    expect(landed.textContent).not.toContain("reading this submission")
    expect(landed.textContent).toContain("Every answer is reversible")
  })

  it("the box does not change its own element or classes when the read lands", () => {
    const box = (el: Element) => el.querySelector('[class*="border-[var(--ks-limestone-dark)]"][class*="p-6"]')!.className
    const reading = render(<ReviewProcess {...props(es2, { reading: true })} />)
    const landed = render(<ReviewProcess {...props(es2, { reading: false })} />)
    expect(box(reading)).toBe(box(landed))
  })

  it("doc ignores the reading prop: the step content shows, as today", () => {
    const el = render(<ReviewProcess {...props(doc, { reading: true })} />)
    expect(el.textContent).not.toContain("reading this submission")
    expect(el.textContent).toContain("Every answer is reversible")
    expect(el.querySelector("[data-cockpit]")).toBeNull()
  })
})
