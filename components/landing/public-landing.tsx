"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
import { Button } from "@/components/ui/button"
import { getSession, type Session } from "@/lib/auth"
import {
  ArrowRight,
  FileText,
  Rocket,
  Lock,
  ScanSearch,
  Landmark,
  Bot,
  ClipboardList,
  Copy,
  Download,
  Users,
  ShieldCheck,
  Award,
  Building2,
  Quote,
} from "lucide-react"
import { getTenant } from "@/lib/tenant"
import { tenantHasBureauTier } from "@/lib/rationalization"

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

function StepCard({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: number
  icon: typeof FileText
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-uspto-blue-primary/10 text-uspto-blue-primary flex items-center justify-center text-sm font-semibold">
          {step}
        </div>
        <Icon className="w-5 h-5 text-uspto-blue-primary" />
      </div>
      <div className="mt-4 font-heading font-semibold text-lg text-uspto-gray-text">{title}</div>
      <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-uspto-blue-primary/10 text-uspto-blue-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4 font-heading font-semibold text-uspto-gray-text">{title}</div>
      <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
    </div>
  )
}

function ProofCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border bg-white p-6 text-center">
      <div className="mx-auto flex-shrink-0 w-9 h-9 rounded-full bg-uspto-blue-primary/10 text-uspto-blue-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-3 font-heading font-semibold text-uspto-gray-text">{title}</div>
      <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
    </div>
  )
}

export function PublicLanding() {
  const t = getTenant()
  const bureauTier = tenantHasBureauTier(t)
  const [session, setSession] = useState<Session | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSession(getSession())
    setHydrated(true)
  }, [])

  const steps = [
    {
      icon: FileText,
      title: "Submit",
      description: `A guided intake, not a blank form — ${t.assistantName} proposes field values as you write, so a complete use case takes minutes.`,
    },
    {
      icon: ScanSearch,
      title: "Vet & de-dupe",
      description:
        "Reviewers get a readiness score and every near-duplicate or overlapping effort already in the pipeline, flagged automatically before anyone signs off.",
    },
    {
      icon: Landmark,
      title: "Fund & report",
      description:
        "Leadership rolls decisions up to the view their role needs, funds the strongest use cases, and exports the federal OMB inventory in one click.",
    },
  ]

  const features = [
    {
      icon: Bot,
      title: `AI-guided intake (${t.assistantName})`,
      description: `${t.assistantName} proposes field values as you write — problem, users, solution, value, alignment, risk — so a use case arrives complete, not half-empty.`,
    },
    {
      icon: ClipboardList,
      title: "Built-in federal OMB inventory",
      description:
        "All 34 fields of the 2025 OMB AI use case inventory (M-25-21 companion guidance) are wired into the wizard itself, most pre-filled or proposed from your answers.",
    },
    {
      icon: Copy,
      title: bureauTier ? "Cross-bureau duplicate detection" : "Duplicate & overlap detection",
      description: bureauTier
        ? "Flags near-duplicate use cases being pursued in more than one bureau, before the Department funds the same idea twice."
        : "Flags near-duplicate and overlapping use cases already in the pipeline, before you fund the same idea twice.",
    },
    {
      icon: Download,
      title: "One-click OMB export",
      description:
        "Every submission already maps to the OMB inventory's exact fields and formats — export the full CSV in a single click.",
    },
    {
      icon: Users,
      title: "Role-based roll-up",
      description:
        "Dashboards roll every submission up automatically — from an individual reviewer's queue to the full leadership view — with no separate reporting step.",
    },
  ]

  const proofPoints = [
    {
      icon: ShieldCheck,
      title: "Built to the 2025 OMB inventory spec",
      description: "All 34 required and conditional fields, wired into the intake itself rather than bolted on afterward.",
    },
    {
      icon: Award,
      title: "SBA-certified HUBZone small business",
      description: "Packaged Agile is HUBZone-certified, opening a sole-source path for a first pilot (FAR 19.1306).",
    },
    {
      icon: Building2,
      title: "Built with USPTO and Commerce reviewers",
      description: "Developed alongside USPTO and Commerce-bureau staff who review AI use cases today, not designed in the abstract.",
    },
  ]

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
                  <Lock className="w-4 h-4 mr-2" />Sign up
                </Button>
                <Button asChild><Link href="/login">Log in</Link></Button>
              </>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative" style={{ backgroundColor: t.theme.primary }}>
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
          <div className="relative container py-20 sm:py-28 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-white/15 mb-5">
              <Rocket className="w-8 h-8 text-white" strokeWidth={2.2} />
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight text-white drop-shadow-md">
              {t.heroHeadline}
            </h1>
            <p className="mt-4 text-lg text-white/85 max-w-2xl mx-auto drop-shadow">
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

        <section className="bg-white py-14 border-b">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-uspto-gray-text">How it works</h2>
              <p className="text-sm text-muted-foreground mt-2">From a rough idea to a funded, reportable use case, in three steps.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {steps.map((s, i) => (
                <StepCard key={s.title} step={i + 1} icon={s.icon} title={s.title} description={s.description} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-14 border-b">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-uspto-gray-text">
                What {t.productName} actually does
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Not another intake form — the governance layer that gets an idea from submission to a funded, OMB-ready use case.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((f) => (
                <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-14 border-b">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-uspto-gray-text">
                Built for federal AI governance
              </h2>
              <p className="text-sm text-muted-foreground mt-2">Not a demo — a product built to the government's own spec.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {proofPoints.map((p) => (
                <ProofCard key={p.title} icon={p.icon} title={p.title} description={p.description} />
              ))}
            </div>
            <blockquote className="mt-10 max-w-2xl mx-auto rounded-xl border bg-gray-50 p-6 text-center">
              <Quote className="w-5 h-5 text-uspto-blue-primary mx-auto" />
              <p className="italic text-uspto-gray-text mt-3">
                "[Pilot quote placeholder — a reviewer or CIO on what changed once duplicate effort and readiness were visible before funding.]"
              </p>
              <footer className="mt-3 text-sm text-muted-foreground">— Name, Title, Bureau (placeholder)</footer>
            </blockquote>
          </div>
        </section>

        <section className="bg-gray-50 py-14 border-b">
          <div className="container">
            <div className="max-w-2xl mx-auto mb-8">
              <h2 className="font-heading text-lg font-semibold tracking-tight text-uspto-gray-text">
                {t.orgName}'s strategic mandate
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t.productName} is built to serve every priority below — for reference, not as the pitch.
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-10">
              {t.landingObjectives.map((group) => (
                <div key={group.title}>
                  <h3 className="font-heading text-base font-semibold tracking-tight text-dow-space mb-1">{group.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{group.subtitle}</p>
                  <ObjectiveList items={group.items} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative" style={{ backgroundColor: t.theme.primary }}>
          <div className="relative container py-16 text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-white drop-shadow-md">
              Ready to see it on your own use cases?
            </h2>
            <p className="mt-3 text-white/85 max-w-xl mx-auto drop-shadow">
              Request a walkthrough of {t.productName} with your bureau's real submissions, duplicates, and OMB fields.
            </p>
            <div className="mt-8 flex items-center justify-center">
              <Button size="lg" asChild>
                <a href={`mailto:matt.shankle@packagedagile.com?subject=${encodeURIComponent(`Request a walkthrough — ${t.productName}`)}`}>
                  Request a walkthrough <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
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
