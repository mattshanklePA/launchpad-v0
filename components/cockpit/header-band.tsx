// K1 HeaderBand (docs/design/cockpit/Main.dc.html, "Page kit"). Presentation
// only: every word and slot comes in as a prop. Keystone mark only, never an
// agency seal. Band color is basalt-800 unless the caller passes the tenant's
// `theme.primary`.

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function HeaderBand({
  eyebrow,
  title,
  subtitle,
  actions,
  nav,
  background,
  className,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  actions?: ReactNode
  nav?: ReactNode
  /** Tenant `theme.primary`; defaults to --ks-basalt-800. */
  background?: string
  className?: string
}) {
  return (
    <header
      data-cockpit="header-band"
      className={cn("border-b-[3px] border-[var(--ks-amber)] px-8 py-3.5 text-[var(--ks-chalk)]", className)}
      style={{ background: background ?? "var(--ks-basalt-800)" }}
    >
      <div className="flex flex-wrap items-center gap-4">
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0">
          <path d="M9 6h16l-4 22h-8z" fill="var(--ks-amber)" />
          <path d="M9 6h16l-1 5H10z" fill="var(--ks-amber-light)" />
        </svg>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ks-amber-light)]">
            {eyebrow}
          </span>
          <h1 className="ks-page-title text-[var(--ks-chalk)]" style={{ fontSize: 22 }}>
            {title}
          </h1>
          {subtitle ? <p className="m-0 text-[13px] text-[var(--ks-chalk)]">{subtitle}</p> : null}
        </div>
        <div className="flex-1" />
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {nav ? <div className="mt-3">{nav}</div> : null}
    </header>
  )
}
