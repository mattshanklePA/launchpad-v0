"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
import { Button } from "@/components/ui/button"
import { getSession, type Session } from "@/lib/auth"
import { ArrowRight, FileText, Rocket, Lock } from "lucide-react"
import { getTenant } from "@/lib/tenant"

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
      <header className="border-b bg-white">
        <div className="container flex h-20 items-center justify-between">
          <LaunchPadLogo size="md" />
          <div className="flex items-center gap-2">
            {hydrated && (session ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">{session.name}</span>
                <Button asChild><Link href="/home">Go to dashboard</Link></Button>
              </>
            ) : (
              <>
                <Button variant="outline" disabled title="Accounts are provisioned by your administrator">
                  <Lock className="w-4 h-4 mr-2" />Sign up
                </Button>
                <Button asChild><Link href="/login">Log in</Link></Button>
              </>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b bg-white">
          <div className="container py-16 sm:py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-uspto-blue-primary/10 mb-5">
              <Rocket className="w-8 h-8 text-uspto-blue-primary" strokeWidth={2.2} />
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight text-dow-space">
              {t.heroHeadline}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.heroSubtitle}
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              {session ? (
                <Button size="lg" asChild>
                  <Link href="/submit">Start a use case <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <Link href="/login"><FileText className="w-4 h-4 mr-2" />Log in to submit a use case</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 border-b">
          <div className="container py-10">
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="rounded-xl border bg-white p-6 text-center">
                <div className="text-4xl font-bold text-uspto-blue-primary">{metrics.submitted}</div>
                <div className="text-sm text-muted-foreground mt-1">Use cases submitted</div>
              </div>
              <div className="rounded-xl border bg-white p-6 text-center">
                <div className="text-4xl font-bold text-uspto-blue-primary">{metrics.deployed}</div>
                <div className="text-sm text-muted-foreground mt-1">Use cases deployed</div>
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

      <footer className="border-t bg-white">
        <div className="container py-6 text-center text-xs text-muted-foreground">
          {t.productName} &middot; {t.logoSubtitle}
        </div>
      </footer>
    </div>
  )
}
