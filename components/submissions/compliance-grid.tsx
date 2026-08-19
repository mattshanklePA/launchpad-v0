"use client"

// The Governance record tab's "Compliance" card (issue #206, mock `07
// Reviewer Detail - Decided.dc.html`, 07b): the same four facts today's
// Compliance details collapsible leads with, as a plain 2x2 instead of a
// badge row — presentational only, every value is computed by the caller
// from the same lib/* logic the collapsible already used.

export type ComplianceGridItem = {
  eyebrow: string
  value: string
  onClick?: () => void
}

export function ComplianceGrid({ items }: { items: ComplianceGridItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.eyebrow}>
          <div className="ks-microlabel mb-[3px]">{item.eyebrow}</div>
          {item.onClick ? (
            <button type="button" className="text-left text-[14px] font-semibold text-primary hover:underline" onClick={item.onClick}>
              {item.value}
            </button>
          ) : (
            <div className="text-[14px] text-foreground">{item.value}</div>
          )}
        </div>
      ))}
    </div>
  )
}
