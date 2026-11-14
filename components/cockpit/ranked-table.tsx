"use client"

// K5 RankedTable. Dense ranked rows that open in place into a three-column
// label and value grid. Presentation only: sorting and filtering live with the
// caller, which passes sort buttons in column headers and any filters in
// `toolbar`; the table renders only the controls it is given.

import { useId, useState, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface RankedColumn<T> {
  key: string
  header: ReactNode
  width?: number | string
  render: (row: T) => ReactNode
}

export interface RankedGroup<T> {
  id: string
  /** Omit for a single ungrouped table. */
  title?: string
  summary?: string
  rows: T[]
}

export interface RankedDetail {
  label: string
  value: ReactNode
}

const TH =
  "border-b border-[var(--ks-limestone-dark)] bg-white px-3 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]"

export function RankedTable<T>({
  groups,
  columns,
  getRowId,
  getRank,
  getName,
  getReference,
  getDetails,
  rankHeader,
  nameHeader,
  expandAllLabel,
  collapseAllLabel,
  toolbar,
  skipEmptyDetails = false,
  className,
}: {
  groups: RankedGroup<T>[]
  columns: RankedColumn<T>[]
  getRowId: (row: T) => string
  getRank: (row: T) => string
  getName: (row: T) => string
  getReference?: (row: T) => string | undefined
  getDetails: (row: T) => RankedDetail[]
  rankHeader: string
  nameHeader: string
  expandAllLabel: string
  collapseAllLabel: string
  /** Caller-supplied filters or sort controls. */
  toolbar?: ReactNode
  /** Rows whose `getDetails` is empty do not open, and Expand all counts only the rows that do. */
  skipEmptyDetails?: boolean
  className?: string
}) {
  const baseId = useId()
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  // With `skipEmptyDetails`, a row with nothing to show beyond its own cells does not open (NL-12, #313).
  const canOpen = (row: T) => !skipEmptyDetails || getDetails(row).length > 0
  const allIds = groups.flatMap((g) => g.rows.filter(canOpen).map(getRowId))
  const allOpen = allIds.length > 0 && allIds.every((id) => open.has(id))
  const colSpan = columns.length + 2
  const anyOpenable = allIds.length > 0

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.target !== e.currentTarget) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggle(id)
    }
  }

  return (
    <div
      data-cockpit="ranked-table"
      className={cn("overflow-hidden rounded-lg border border-[var(--ks-limestone-dark)] bg-white", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ks-limestone-dark)] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">{toolbar}</div>
        {anyOpenable ? (
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(allIds))}
          className="text-sm font-semibold text-[var(--ks-active-blue-dark)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
        >
          {allOpen ? collapseAllLabel : expandAllLabel}
        </button>
        ) : null}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH} style={{ width: 70 }}>
              {rankHeader}
            </th>
            <th className={TH}>{nameHeader}</th>
            {columns.map((c) => (
              <th key={c.key} className={TH} style={c.width !== undefined ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.id}>
            {g.title ? (
              <tr data-group-header>
                <td colSpan={colSpan} className="border-b border-[var(--ks-limestone-dark)] px-4 py-3.5">
                  <p className="m-0 font-[family-name:var(--font-head)] text-base font-bold text-[var(--ks-ink-900)]">{g.title}</p>
                  {g.summary ? <p className="m-0 mt-0.5 text-xs text-[var(--ks-ink-700)]">{g.summary}</p> : null}
                </td>
              </tr>
            ) : null}
            {g.rows.flatMap((row) => {
              const id = getRowId(row)
              const openable = canOpen(row)
              const isOpen = openable && open.has(id)
              const detailId = `${baseId}-${id}`
              const reference = getReference?.(row)
              return [
                <tr
                  key={id}
                  tabIndex={openable ? 0 : undefined}
                  aria-expanded={openable ? isOpen : undefined}
                  aria-controls={isOpen ? detailId : undefined}
                  onClick={openable ? () => toggle(id) : undefined}
                  onKeyDown={openable ? (e) => onKeyDown(e, id) : undefined}
                  className={cn(
                    openable && "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]",
                    isOpen && "bg-[var(--ks-limestone)]",
                  )}
                >
                  <td className="border-b border-[var(--ks-limestone)] p-3 align-middle">
                    <span className="inline-block min-w-[34px] rounded-[3px] bg-[var(--ks-limestone)] px-1.5 py-1 text-center font-mono text-xs font-bold text-[var(--ks-ink-900)]">
                      {getRank(row)}
                    </span>
                  </td>
                  <td className="border-b border-[var(--ks-limestone)] p-3 align-middle text-sm text-[var(--ks-ink-900)]">
                    <div className={isOpen ? "font-bold" : "font-semibold"}>{getName(row)}</div>
                    {reference ? <div className="mt-[3px] text-xs text-[var(--ks-ink-700)]">{reference}</div> : null}
                  </td>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="border-b border-[var(--ks-limestone)] p-3 align-middle text-sm text-[var(--ks-ink-900)]"
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>,
                isOpen ? (
                  <tr key={`${id}-detail`} id={detailId} className="bg-[var(--ks-limestone)]">
                    <td colSpan={colSpan} className="border-b border-[var(--ks-limestone-dark)] pb-5 pl-[98px] pr-6 pt-2">
                      <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
                        {getDetails(row).map((d) => (
                          <div key={d.label}>
                            <dt className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]">
                              {d.label}
                            </dt>
                            <dd className="m-0 text-sm leading-[1.45] text-[var(--ks-ink-900)]">{d.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                  </tr>
                ) : null,
              ]
            })}
          </tbody>
        ))}
      </table>
    </div>
  )
}
