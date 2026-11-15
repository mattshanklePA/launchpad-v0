// Read-only governance checklist for a decided record (#271). Shows each
// item's final state in plain words — no Confirm, Override, determination or
// field-edit controls. Rendered for all four tenants.

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck } from "lucide-react"
import { RMF_OVERALL_LABELS, rmfBadgeClass } from "@/lib/nistRmf"
import type { ResolvedRmfProfile } from "@/lib/rmfProfileReview"
import { formatKeystoneDate } from "@/lib/dateFormat"
import { cn } from "@/lib/utils"
import { tenantCopy } from "@/lib/tenant/copy"
import { RankedTable, SectionTitle } from "@/components/cockpit"

const HIGH_IMPACT_LABELS: Record<string, string> = {
  high_impact: "High-impact",
  presumed_not_high_impact: "Presumed, but not high-impact",
  not_high_impact: "Not high-impact",
}

export function LockedGovernanceChecklist({
  decision,
  highImpact,
  fieldsSentence,
  examples = [],
  assistantName,
  resolvedRmf,
  notConfirmedLabel,
  cockpit = false,
}: {
  decision: "approved" | "rejected"
  highImpact?: string
  fieldsSentence: string
  /** Read-only "assistant proposes" examples, already formatted for display. */
  examples?: { key: string; label: string; value: string; rationale: string }[]
  assistantName?: string
  resolvedRmf?: ResolvedRmfProfile
  /** Tenant copy: shown when the risk framework was never confirmed. */
  notConfirmedLabel: string
  /** NL-7 (#288): ES2 (`features.cockpitLook`) shows the same record as a K5 table. */
  cockpit?: boolean
}) {
  const review = resolvedRmf?.review
  if (cockpit) {
    return (
      <CockpitRecord
        decision={decision}
        highImpact={highImpact}
        fieldsSentence={fieldsSentence}
        examples={examples}
        assistantName={assistantName}
        resolvedRmf={resolvedRmf}
        notConfirmedLabel={notConfirmedLabel}
      />
    )
  }
  return (
    <div className="space-y-3 rounded-lg border border-border-subtle bg-card p-5" data-testid="locked-governance">
      <div className="font-heading text-[18px] font-bold text-foreground">Decision checklist</div>
      <p className="text-[13px] text-muted-foreground">
        This record was {decision}. The checklist below is its final state and can no longer be changed.
      </p>

      <div className="flex flex-col gap-1.5">
        <span className="ks-microlabel">1 · High-impact determination</span>
        <div className="text-sm text-foreground">
          {highImpact && HIGH_IMPACT_LABELS[highImpact] ? HIGH_IMPACT_LABELS[highImpact] : "No determination was recorded."}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border-default pt-4">
        <span className="ks-microlabel">2 · Complete the use case</span>
        <p className="text-sm text-foreground">{fieldsSentence}{examples.length > 0 ? " Two examples:" : ""}</p>
        {examples.map((e) => (
          <div key={e.key} className="flex flex-col gap-1 border-t border-border-subtle py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-semibold text-foreground">{e.label}</span>
              <span className="ks-microlabel text-foreground-faint">{assistantName} proposes</span>
            </div>
            <div className="text-[14px] text-foreground">{e.value}</div>
            <div className="text-[12.5px] text-muted-foreground">{e.rationale}</div>
          </div>
        ))}
      </div>

      {resolvedRmf && (
        <div className="flex flex-col gap-1.5 border-t border-border-default pt-4">
          <span className="ks-microlabel">3 · NIST AI RMF</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", rmfBadgeClass(resolvedRmf.effectiveOverall))}>
              {RMF_OVERALL_LABELS[resolvedRmf.effectiveOverall]}
            </Badge>
            {review && (
              <span className="text-xs font-medium text-healthy-foreground">
                {review.decision === "overridden" ? "Overridden" : "Confirmed"}
              </span>
            )}
          </div>
          {review ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {review.decision === "overridden"
                ? `Overridden to "${RMF_OVERALL_LABELS[review.overriddenOverall || review.proposedOverall]}" (proposed "${RMF_OVERALL_LABELS[review.proposedOverall]}")`
                : "Confirmed as proposed"}
              {" "}by {review.byName}, {formatKeystoneDate(review.at)}
              {review.notes ? ` — "${review.notes}"` : ""}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground" data-testid="rmf-not-confirmed">{notConfirmedLabel}</p>
          )}
        </div>
      )}
    </div>
  )
}

type RecordRow = {
  id: string
  no: string
  step: string
  answer: ReactNode
  who: string
  when: string
  details: { label: string; value: ReactNode }[]
}

/** The same read-only record, as the K5 table: step, answer, who, when. No controls besides the table's own open/close. */
function CockpitRecord({
  decision,
  highImpact,
  fieldsSentence,
  examples,
  assistantName,
  resolvedRmf,
  notConfirmedLabel,
}: {
  decision: "approved" | "rejected"
  highImpact?: string
  fieldsSentence: string
  examples: { key: string; label: string; value: string; rationale: string }[]
  assistantName?: string
  resolvedRmf?: ResolvedRmfProfile
  notConfirmedLabel: string
}) {
  const copy = tenantCopy()
  const review = resolvedRmf?.review
  const rows: RecordRow[] = [
    {
      id: "high-impact",
      no: "1",
      step: "High-impact determination",
      answer: highImpact && HIGH_IMPACT_LABELS[highImpact] ? HIGH_IMPACT_LABELS[highImpact] : "No determination was recorded.",
      who: "—",
      when: "—",
      details: [],
    },
    {
      id: "use-case",
      no: "2",
      step: "Complete the use case",
      answer: `${fieldsSentence}${examples.length > 0 ? " Two examples:" : ""}`,
      who: "—",
      when: "—",
      details: examples.map((e) => ({
        label: `${e.label} · ${assistantName} proposes`,
        value: (
          <>
            <span className="block">{e.value}</span>
            <span className="block text-xs text-[var(--ks-ink-700)]">{e.rationale}</span>
          </>
        ),
      })),
    },
    ...(resolvedRmf
      ? [
          {
            id: "rmf",
            no: "3",
            step: "NIST AI RMF",
            answer: review ? (
              <span>
                {RMF_OVERALL_LABELS[resolvedRmf.effectiveOverall]} · {review.decision === "overridden" ? "Overridden" : "Confirmed"}
              </span>
            ) : (
              <span data-testid="rmf-not-confirmed">{notConfirmedLabel}</span>
            ),
            who: review ? review.byName : "—",
            when: review ? formatKeystoneDate(review.at) : "—",
            details: review
              ? [
                  {
                    label: "NIST AI RMF",
                    value:
                      (review.decision === "overridden"
                        ? `Overridden to "${RMF_OVERALL_LABELS[review.overriddenOverall || review.proposedOverall]}" (proposed "${RMF_OVERALL_LABELS[review.proposedOverall]}")`
                        : "Confirmed as proposed") + (review.notes ? ` — "${review.notes}"` : ""),
                  },
                ]
              : [],
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-3" data-testid="locked-governance">
      <SectionTitle title="Decision checklist" />
      <p className="text-[13px] text-[var(--ks-ink-700)]">
        This record was {decision}. The checklist below is its final state and can no longer be changed.
      </p>
      <RankedTable
        groups={[{ id: "record", rows }]}
        columns={[
          { key: "answer", header: copy.recordColAnswer, render: (r: RecordRow) => r.answer },
          { key: "who", header: copy.recordColWho, width: 160, render: (r: RecordRow) => r.who },
          { key: "when", header: copy.recordColWhen, width: 130, render: (r: RecordRow) => r.when },
        ]}
        getRowId={(r) => r.id}
        getRank={(r) => r.no}
        getName={(r) => r.step}
        getDetails={(r) => r.details}
        rankHeader={copy.listColNo}
        nameHeader={copy.recordColStep}
        expandAllLabel={copy.homeExpandAll}
        collapseAllLabel={copy.homeCollapseAll}
      />
    </div>
  )
}
