"use client"

// The "sent" page (F6-3, #343), ES2 only. It loads the idea from the saved
// record (the same cache and data provider the record page reads, so a reload
// shows the same page and never "not found"), and asks the server for the
// office's typical time to a decision.

import { useEffect, useState } from "react"
import { notFound, useParams } from "next/navigation"
import { useDataProvider } from "@/components/data-provider"
import { IntakeSent } from "@/components/launchpad/intake-sent"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { getOfficeDecisionTime, type SentDecisionTime } from "@/app/sent-actions"
import { getTenant } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"

export default function SentPage() {
  const tenant = getTenant()
  if (!tenant.features.sentPage) notFound()

  const id = String(useParams()?.id || "")
  const { loaded } = useDataProvider()
  const [sub, setSub] = useState<Submission | null>(null)
  const [time, setTime] = useState<SentDecisionTime | null>(null)

  useEffect(() => {
    if (loaded) setSub(getSubmissions().find((s) => s.id === id) || null)
  }, [loaded, id])

  useEffect(() => {
    if (!sub) return
    let live = true
    getOfficeDecisionTime(sub.id)
      .then((r) => live && setTime(r.status === "refused" ? { status: "not-enough" } : r))
      .catch(() => live && setTime({ status: "not-enough" }))
    return () => {
      live = false
    }
  }, [sub])

  if (!loaded) return null
  if (!sub) return <p className="text-[14px]">{tenantCopy(tenant).sentMissing}</p>
  return <IntakeSent submission={sub} time={time} />
}
