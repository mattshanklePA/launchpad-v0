"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
import { Button } from "@/components/ui/button"
import { getSession, type Session } from "@/lib/auth"
import { ArrowRight, FileText, Lock } from "lucide-react"
import { getTenant } from "@/lib/tenant"
import { cn } from "@/lib/utils"

function ObjectiveList({ items }: { items: { title: string; description: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border bg-white p-4 flex gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-uspto-blue-primary/10 text-uspto-blue-primary flex items-center justify-center text-sm font-semibold">
            {i + 1}
          </div>
          <div>
            <div className="font-medium text-uspto-gray-text">{it.title}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{it.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Illustrative queue rows and KPI counts for the hero's Command Center preview
// — representative of the app's real queue-by-status board and metrics
// (components/dashboard/queue-board.tsx), not a claim about any tenant's
// actual submissions. The real, live counts appear in the "explore" section
// just below the hero.
const PREVIEW_QUEUE: { title: string; status: string; tone: "amber" | "green" | "gray" }[] = [
  { title: "Duplicate detection assistant", status: "Needs work", tone: "amber" },
  { title: "Grant application triage", status: "Ready", tone: "green" },
  { title: "Correspondence summarizer", status: "Early", tone: "gray" },
]
const PREVIEW_METRICS = { submitted: 14, deployed: 5 }

const PREVIEW_TONE_CLASS: Record<(typeof PREVIEW_QUEUE)[number]["tone"], string> = {
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
  gray: "bg-gray-100 text-gray-500",
}

// Decorative Command Center dashboard preview for the hero. Built from the
// app's own visual language (KPI tiles, status-pill queue rows) rather than a
// static screenshot, so it never goes stale and needs no binary asset. Renders
// immediately with illustrative data instead of waiting on the live metrics
// fetch, so evaluators never see a flash of "0" before the page hydrates.
function DashboardPreview({ productName }: { productName: string }) {
  return (
    <div
      role="img"
      aria-label={`Screenshot of the ${productName} Command Center dashboard`}
      className="w-full max-w-md overflow-hidden rounded-xl border border-black/5 bg-white shadow-2xl lg:max-w-none"
    >
      <div className="flex items-center gap-1.5 border-b bg-gray-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="ml-3 text-xs font-medium text-gray-400">Command Center</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-l-4 border-l-uspto-blue-primary bg-white p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Use cases submitted</div>
            <div className="text-xl font-bold text-uspto-gray-text">{PREVIEW_METRICS.submitted}</div>
          </div>
          <div className="rounded-lg border border-l-4 border-l-green-500 bg-white p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Use cases deployed</div>
            <div className="text-xl font-bold text-uspto-gray-text">{PREVIEW_METRICS.deployed}</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {PREVIEW_QUEUE.map((row) => (
            <div key={row.title} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
              <span className="truncate text-xs font-medium text-uspto-gray-text">{row.title}</span>
              <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium", PREVIEW_TONE_CLASS[row.tone])}>
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PublicLanding() {
  const t = getTenant()
  const [session, setSession] = useState<Session | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [metrics, setMetrics] = useState<{ submitted: number; deployed: number }>({ submitted: 0, deployed: 0 })

  useEffect(() => {
    setSession(getSession())
    setHydrated(true)
    fetch(`/api/submissions?_=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const subs: any[] = j?.submissions || []
        const submitted = subs.length
        const deployed = subs.filter((s) => (s.status || s.formData?.reviewStatus) === "approved").length
        setMetrics({ submitted, deployed })
      })
      .catch(() => setMetrics({ submitted: 0, deployed: 0 }))
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-white/10 bg-[#141414]">
        <div className="container flex h-20 items-center justify-between">
          <LaunchPadLogo size="md" monochrome className="text-white" subtitleClassName="text-dow-steel" />
          <div className="flex items-center gap-2">
            {hydrated && (session ? (
              <>
                <span className="text-sm text-white/70 hidden sm:inline">{session.name}</span>
                <Button asChild><Link href="/home">Go to dashboard</Link></Button>
              </>
            ) : (
              <>
                <Button variant="outline" disabled title="Accounts are provisioned by your administrator" className="bg-transparent border-white/30 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-100">
                  <Lock className="w-4 h-4 mr-2" />Request access
                </Button>
                <Button asChild><Link href="/login">Log in</Link></Button>
              </>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden" style={{ backgroundColor: t.theme.primary }}>
          {t.heroImage && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-top"
                style={{ backgroundImage: `url('${t.heroImage}')` }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-0"
                style={{ backgroundColor: t.theme.primary, opacity: 0.82 }}
                aria-hidden="true"
              />
            </>
          )}
          <div className="relative container py-16 sm:py-24 lg:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="max-w-xl">
                <h1 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight text-white drop-shadow-md">
                  {t.heroHeadline}
                </h1>
                <p className="mt-4 text-lg text-white/85 drop-shadow">
                  {t.heroSubtitle}
                </p>
                <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
                  {session ? (
                    <Button size="lg" asChild>
                      <Link href="/submit">Start a use case <ArrowRight className="w-4 h-4 ml-2" /></Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        className="bg-white hover:bg-white/90"
                        style={{ color: t.theme.primary }}
                        asChild
                      >
                        <a href="#explore">See how it works <ArrowRight className="w-4 h-4 ml-2" /></a>
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
                        asChild
                      >
                        <Link href="/login"><FileText className="w-4 h-4 mr-2" />Log in</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="lg:w-[110%] lg:-mr-10 xl:-mr-24">
                  <DashboardPreview productName={t.productName} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="explore" className="bg-dow-ocean border-b border-white/10 scroll-mt-8">
          <div className="container py-10">
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                <div className="text-4xl font-bold text-white">{metrics.submitted}</div>
                <div className="text-sm text-dow-steel mt-1">Use cases submitted</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                <div className="text-4xl font-bold text-white">{metrics.deployed}</div>
                <div className="text-sm text-dow-steel mt-1">Use cases deployed</div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-14">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-10">
              {t.landingObjectives.map((group) => (
                <div key={group.title}>
                  <h2 className="font-heading text-xl font-semibold tracking-tight text-dow-space mb-1">{group.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{group.subtitle}</p>
                  <ObjectiveList items={group.items} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-[#141414]">
        <div className="container py-6 text-center text-xs text-dow-steel">
          {t.productName} &middot; {t.logoSubtitle}
        </div>
      </footer>
    </div>
  )
}
