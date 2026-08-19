"use client"

// Reviewer detail right rail (issue #206, mock `07 Reviewer Detail -
// Decided.dc.html`): the submission summary + the activity timeline,
// visible on every tab regardless of which one is open.

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { Submission } from "@/lib/submissions"
import type { TenantConfig } from "@/lib/tenant"
import type { ActivityEvent } from "@/lib/activity"
import { formatKeystoneDate } from "@/components/dashboard/command-center-data"
import { cn } from "@/lib/utils"

function RailField({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div>
      <div className="ks-microlabel mb-[3px] text-foreground-faint">{eyebrow}</div>
      <div className="text-[14px] leading-[1.55]">{value}</div>
    </div>
  )
}

export function ReviewerRail({
  submission,
  tenant,
  activity,
}: {
  submission: Submission
  tenant: TenantConfig
  activity: ActivityEvent[]
}) {
  const [expanded, setExpanded] = useState(false)
  const fd = submission.formData

  const problem = fd.problemDefinition || fd.coreProblem || "Not yet set"
  const solution = fd.solutionSummary || fd.proposedSolution || "Not yet set"
  const outcomeMetric = fd.metricsSummary || fd.successMetrics || "Not yet set"
  const affectedAreaLabels = (fd.affectedBusinessUnits || [])
    .map((v) => tenant.affectedSystems.find((o) => o.value === v)?.label || v)
    .join(", ")
  const hasTrainingData = !!fd.trainingDataDescription?.trim()
  const dataEyebrow = hasTrainingData ? "Data" : "Affected areas"
  const dataValue = hasTrainingData ? fd.trainingDataDescription : affectedAreaLabels || "Not yet set"

  // Same field/value pairs the pre-tab "Submission" card rendered
  // (components/submissions/submission-detail.tsx), reused verbatim as the
  // "Read the full submission" expansion so nothing from today's recap is
  // lost.
  const fullFields: [string, string][] = (
    [
      [`Affected ${tenant.tierLabels.unitPlural}`, affectedAreaLabels],
      ["Client sponsor", fd.sponsorName ? `${fd.sponsorName}${fd.sponsorRole ? ` (${fd.sponsorRole})` : ""}` : ""],
      ["Internal or external", fd.deliveryAudience === "internal" ? "Internal" : fd.deliveryAudience === "external" ? "External" : ""],
      ["Problem", fd.problemDefinition || fd.coreProblem || ""],
      ["Proposed solution", fd.solutionSummary || fd.proposedSolution || ""],
      ["Business value", fd.businessValueSummary || fd.businessValue || ""],
      ["Strategic alignment", fd.alignmentSummary || fd.relevantOkrs || ""],
      ["Success metrics", fd.metricsSummary || fd.successMetrics || ""],
      ["Executive summary", fd.executiveSummary || ""],
    ] as [string, string][]
  ).filter(([, v]) => v && v.trim())

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-3">
        <span className="ks-microlabel">The submission</span>
        <div className="flex flex-col gap-3">
          <RailField eyebrow="Problem" value={problem} />
          <RailField eyebrow="Solution" value={solution} />
          <RailField eyebrow="Outcome metric" value={outcomeMetric} />
          <RailField eyebrow={dataEyebrow} value={dataValue} />
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-left text-[13px] font-semibold text-primary hover:underline"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide the full submission" : "Read the full submission"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </button>
        {expanded && (
          <div className="flex flex-col gap-3 border-t border-border-subtle pt-3">
            {fullFields.map(([label, value]) => (
              <div key={label}>
                <div className="text-[13px] font-medium">{label}</div>
                <p className="whitespace-pre-wrap text-[13px] text-muted-foreground">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border-subtle pt-[18px]">
        <span className="ks-microlabel">Activity</span>
        <div className="flex flex-col gap-2 text-[12.5px] leading-[1.5] text-muted-foreground">
          {activity.map((e, i) => (
            <div key={i}>{e.label} · {formatKeystoneDate(e.at)}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
