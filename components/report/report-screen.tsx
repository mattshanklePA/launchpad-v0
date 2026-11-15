"use client"

// F5-2 (#319): /report, the executive AI portfolio report. Fetches the report
// from /api/report (already limited to what the signed-in person may see), puts
// the picker and buttons in the cockpit band, and shows the loading, empty
// office and could-not-load states from docs/design/11c Portfolio Report States.
// The "Since 1 Sep / Last 90 days" switch is left out: the period cannot change.

import { Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RequireAuth } from "@/components/auth/require-auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CockpitBandContext, useCockpitBand } from "@/components/cockpit/band-context"
import { spellCount } from "@/components/dashboard/command-center-data"
import { getSession } from "@/lib/auth"
import { getDashboardScope, getHierarchy } from "@/lib/dashboard/scope"
import { getTenant } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import type { ReportResponse } from "@/lib/portfolioReportApi"
import { ReportView, fill } from "./report-view"

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
const BTN = `min-h-[44px] border px-[18px] text-[15px] font-semibold ${FOCUS}`

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; data: ReportResponse }

function Controls({ data, ready, office, onOffice }: { data: ReportResponse | null; ready: boolean; office: string; onOffice: (id: string) => void }) {
  const copy = tenantCopy(getTenant())
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  // Both files are the current view: the report on screen, with the office picked, if any.
  const download = async (kind: "pdf" | "csv") => {
    if (!data) return
    setFailed(false)
    try {
      if (kind === "pdf") {
        const { generatePortfolioReportPDF } = await import("@/lib/portfolioReportPdf")
        generatePortfolioReportPDF(data.report, { now: data.now, demo: data.demo })
      } else {
        const { downloadPortfolioReportCsv } = await import("@/lib/portfolioReportCsv")
        downloadPortfolioReportCsv(data.report, { now: data.now })
      }
    } catch {
      setFailed(true)
    }
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <>
      {data ? (
        <label className="flex items-center gap-2 text-[13px] text-[var(--ks-chalk)]">
          {copy.reportOfficeLabel}
          <select
            value={office}
            onChange={(e) => onOffice(e.target.value)}
            className={`border border-white/30 bg-[var(--ks-basalt)] px-2.5 py-1.5 text-[13px] text-[var(--ks-chalk)] ${FOCUS}`}
          >
            {data.scoped ? null : <option value="">{fill(copy.reportAllOffices, { count: spellCount(data.offices.length).toLowerCase() })}</option>}
            {data.offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        disabled={!ready}
        onClick={() => download("pdf")}
        className={`border border-white/30 px-3 py-1.5 text-[13px] font-semibold text-[var(--ks-chalk)] disabled:opacity-70 ${FOCUS}`}
      >
        {copy.reportDownloadPdf}
      </button>
      <button
        type="button"
        disabled={!ready}
        onClick={() => download("csv")}
        className={`border border-white/30 px-3 py-1.5 text-[13px] font-semibold text-[var(--ks-chalk)] disabled:opacity-70 ${FOCUS}`}
      >
        {copy.reportDownloadCsv}
      </button>
      <button type="button" onClick={copyLink} className={`px-1 text-[13px] text-[var(--ks-chalk)] underline ${FOCUS}`}>
        {copy.reportCopyLink}
      </button>
      <span role="status" className="text-[13px] text-[var(--ks-chalk)]">
        {copied ? copy.reportLinkCopied : ""}
      </span>
      {failed ? (
        <span role="alert" className="text-[13px] text-[var(--ks-chalk)]">
          {copy.reportDownloadFailed}
        </span>
      ) : null}
    </>
  )
}

function ReportBody() {
  const tenant = getTenant()
  const copy = tenantCopy(tenant)
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const office = params?.get("office") ?? ""
  const [state, setState] = useState<State>({ kind: "loading" })
  const [last, setLast] = useState<ReportResponse | null>(null)
  const [attempt, setAttempt] = useState(0)
  const band = useContext(CockpitBandContext)

  useCockpitBand({ eyebrow: copy.reportEyebrow, title: copy.reportTitle })

  useEffect(() => {
    let live = true
    setState({ kind: "loading" })
    const qs = office ? `?office=${encodeURIComponent(office)}` : ""
    fetch(`/api/report${qs}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status))
        return (await res.json()) as ReportResponse
      })
      .then((data) => {
        if (!live) return
        setLast(data)
        setState({ kind: "ready", data })
      })
      .catch(() => live && setState({ kind: "error" }))
    return () => {
      live = false
    }
  }, [office, attempt])

  const onOffice = useCallback(
    (id: string) => router.push(id ? `${pathname}?office=${encodeURIComponent(id)}` : (pathname ?? "/report")),
    [router, pathname],
  )

  const controls = <Controls data={last} ready={state.kind === "ready"} office={office} onOffice={onOffice} />
  const placed: ReactNode = band?.rightSlot ? (
    createPortal(controls, band.rightSlot)
  ) : (
    <div className="mb-5 flex flex-wrap items-center justify-end gap-3 text-[var(--ks-ink-900)]">{controls}</div>
  )

  let body: ReactNode
  if (state.kind === "loading") {
    body = (
      <div role="status" className="flex flex-col gap-4 rounded-lg border border-[var(--ks-limestone)] bg-white p-6">
        <span className="text-[15px] text-[var(--ks-ink-700)]">{fill(copy.reportLoading, { count: tenant.unit.options.length })}</span>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} className="flex flex-col gap-2">
              <div className="h-2.5 w-3/5 bg-[var(--ks-limestone)]" />
              <div className="h-8 w-2/5 bg-[var(--ks-limestone)]" />
              <div className="h-2.5 w-[90%] bg-[var(--ks-limestone)]" />
            </div>
          ))}
        </div>
      </div>
    )
  } else if (state.kind === "error") {
    body = (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--ks-limestone-dark)] bg-white p-6">
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 bg-[var(--ks-alert)]" />
          <p className="m-0 text-[15px]">{copy.reportError}</p>
        </div>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className={`${BTN} border-[var(--ks-active-blue)] bg-[var(--ks-active-blue)] text-white`}
        >
          {copy.reportRetry}
        </button>
      </div>
    )
  } else if (state.data.report.officeId && state.data.report.ideas.length === 0) {
    const d = state.data
    body = (
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-lg border border-[var(--ks-limestone)] bg-white p-7">
        <div className="flex max-w-[760px] flex-col gap-1.5">
          <h2 className="ks-section-head m-0 text-[var(--ks-ink-900)]">
            {fill(copy.reportEmptyOfficeTitle, { office: d.report.scopeLabel ?? "", total: d.totalIdeas })}
          </h2>
          <p className="m-0 text-[15px] leading-[1.55] text-[var(--ks-ink-700)]">{copy.reportEmptyOfficeBody}</p>
        </div>
        {d.scoped ? null : (
          <button type="button" onClick={() => onOffice("")} className={`${BTN} border-[var(--ks-limestone-dark)] bg-white text-[var(--ks-active-blue-dark)]`}>
            {fill(copy.reportBackToAll, { count: d.offices.length })}
          </button>
        )}
      </div>
    )
  } else {
    body = <ReportView data={state.data} tenant={tenant} />
  }

  return (
    <>
      {placed}
      {body}
    </>
  )
}

function ReportInner() {
  const tenant = getTenant()
  return (
    <DashboardShell
      baseScope={getDashboardScope(getSession())}
      hierarchy={getHierarchy(tenant)}
      selection={null}
      onSelect={() => {}}
      breadcrumb={tenantCopy(tenant).reportTitle}
    >
      <Suspense fallback={null}>
        <ReportBody />
      </Suspense>
    </DashboardShell>
  )
}

export function ReportScreen() {
  return (
    <RequireAuth requireRole={["admin", "reviewer"]}>
      <ReportInner />
    </RequireAuth>
  )
}
