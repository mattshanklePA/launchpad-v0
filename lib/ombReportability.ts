// OMB reportability determination — decides whether a use case must be reported
// to the OMB federal AI use case inventory (June 27, 2025 "Guidance on 2025
// Agency AI Reporting" + the OMB AI Inventory Reporting Cheat Sheet), instead of
// just capturing the fields. Pure, no I/O — mirrors lib/ombExport.ts's pattern
// of keeping OMB logic testable without a live Supabase connection.
//
// Rules (from the cheat sheet):
//   - Any stage of development counts (pre-deployment, pilot, deployed, retired).
//   - Include if the AI supports mission/service delivery, enhances internal
//     decisions, or benefits the public — standalone or embedded both count.
//   - Exclude National Security System / Intelligence Community use.
//   - Exclude research-ONLY use — UNLESS that research AI controls or
//     significantly influences a decision or outcome about individuals, in
//     which case it's reportable despite being "research."
//   - Ambiguous (a required input hasn't been answered yet) -> "review",
//     erring on the side of inclusion per OMB guidance.

import type { FormData } from "@/lib/steps"

export type ReportabilityStatus = "reportable" | "excluded" | "review"

export type ReportabilityResult = {
  status: ReportabilityStatus
  reason: string
}

const REVIEW_REASON = "err on the side of inclusion (OMB guidance)"

type ReportabilityInputs = Pick<
  FormData,
  "stageOfDevelopment" | "nationalSecuritySystem" | "researchOnly" | "aiDecisionalImpact"
>

/** Determines OMB inventory reportability for one submission's fields. Pure — no I/O. */
export function determineReportability(fd: ReportabilityInputs): ReportabilityResult {
  if (fd.nationalSecuritySystem === "yes") {
    return {
      status: "excluded",
      reason: "National Security System / Intelligence Community use is excluded from the OMB inventory.",
    }
  }

  if (fd.researchOnly === "yes") {
    if (fd.aiDecisionalImpact === "yes") {
      return {
        status: "reportable",
        reason:
          "Research AI that controls or significantly influences a decision or outcome about individuals is reportable despite being research-only.",
      }
    }
    return {
      status: "excluded",
      reason: "Research-only use (no operational mission, service, or decision support) is excluded from the OMB inventory.",
    }
  }

  if (!fd.stageOfDevelopment || fd.nationalSecuritySystem === "" || fd.researchOnly === "") {
    return { status: "review", reason: REVIEW_REASON }
  }

  return {
    status: "reportable",
    reason: "Supports mission/service delivery, internal decisions, or public benefit — included at any stage of development.",
  }
}
