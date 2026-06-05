"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
import { Button } from "@/components/ui/button"
import { getSession, type Session } from "@/lib/auth"
import { ArrowRight, FileText, Rocket } from "lucide-react"

const USPTO_GOALS: { title: string; description: string }[] = [
  { title: "Drive U.S. innovation and global competitiveness", description: "Expand access to the IP system and strengthen U.S. leadership in emerging technology." },
  { title: "Promote the efficient delivery of reliable IP rights", description: "Reduce pendency and improve quality across patents and trademarks." },
  { title: "Promote IP protection against new and persistent threats", description: "Strengthen enforcement and defend the integrity of issued IP rights." },
  { title: "Bring innovation to impact for the public good", description: "Apply the IP and innovation system to national priorities like health, climate, and equity." },
  { title: "Generate impactful employee and customer experiences", description: "Create rewarding experiences for the USPTO workforce and the public it serves." },
]

const AI_PRIORITIES: { title: string; description: string }[] = [
  { title: "Advance IP policies for inclusive AI innovation", description: "Shape policy that supports U.S. AI leadership and stays inclusive of all innovators." },
  { title: "Build AI capabilities through infrastructure and resources", description: "Invest in the compute, data, and tooling to deploy AI responsibly." },
  { title: "Promote responsible AI use", description: "Ensure bias mitigation, explainability, and human oversight across AI systems." },
  { title: "Develop AI expertise within the workforce", description: "Train USPTO staff to evaluate, deploy, and oversee AI in their work." },
  { title: "Collaborate with government and international partners on AI", description: "Coordinate with peer agencies, OMB, and international IP offices on AI." },
]

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
                <Button variant="outline" asChild><Link href="/signup">Sign up</Link></Button>
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
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-uspto-gray-text">
              The governable front door for AI at USPTO
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              One place to turn AI ideas into vetted, decision-ready use cases, so leadership can fund the strong ones and catch risky ones early.
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
              <div>
                <h2 className="text-xl font-bold text-uspto-gray-text mb-1">USPTO strategic objectives</h2>
                <p className="text-sm text-muted-foreground mb-4">2022–2026 Strategic Plan</p>
                <ObjectiveList items={USPTO_GOALS} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-uspto-gray-text mb-1">USPTO AI strategy</h2>
                <p className="text-sm text-muted-foreground mb-4">January 2025 AI Strategy priorities</p>
                <ObjectiveList items={AI_PRIORITIES} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="container py-6 text-center text-xs text-muted-foreground">
          LaunchPad · USPTO AI Use Case Platform
        </div>
      </footer>
    </div>
  )
}
