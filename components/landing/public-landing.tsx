"use client"

import Link from "next/link"
import { Fraunces, Public_Sans } from "next/font/google"
import { useEffect, useState } from "react"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
import { Button } from "@/components/ui/button"
import { getSession, type Session } from "@/lib/auth"
import {
  ArrowRight,
  Award,
  ClipboardList,
  Download,
  FileText,
  GitMerge,
  Landmark,
  LayoutDashboard,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { getTenant, tenantHasBureauTier, type TenantConfig } from "@/lib/tenant"
import type { HeroPreviewItem } from "@/lib/tenant/types"
import { cn } from "@/lib/utils"

// Public landing typography system (docs/landing-page-conversion-audit-2026-07-15.md):
// Fraunces (display, headlines) paired with Public Sans (the official U.S. federal
// typeface, body). Self-hosted via next/font — no runtime font CDN — and scoped to
// this component only, so the app-wide DOW brand fonts (app/layout.tsx) are unaffected.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
})
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
})

// Decorative accent classes for this shared landing. Keystone (DoC) gets the
// brand active-blue (#0086CA, tailwind.config.ts's `keystone.activeBlue`);
// every other tenant keeps the pre-brand uspto-blue-primary shade so USPTO/DoW
// stay visually unchanged (issue #174 — the accent is a hardcoded literal
// here, not derived from `tenant.theme`, so it must be gated explicitly).
type AccentClasses = { tint: string; text: string; border: string }
const KEYSTONE_ACCENT: AccentClasses = {
  tint: "bg-keystone-activeBlue/10 text-keystone-activeBlue",
  text: "text-keystone-activeBlue",
  border: "border-l-keystone-activeBlue",
}
const DEFAULT_ACCENT: AccentClasses = {
  tint: "bg-uspto-blue-primary/10 text-uspto-blue-primary",
  text: "text-uspto-blue-primary",
  border: "border-l-uspto-blue-primary",
}
function getAccentClasses(tenant: TenantConfig): AccentClasses {
  return tenant.id === "doc" ? KEYSTONE_ACCENT : DEFAULT_ACCENT
}

function ObjectiveList({ items, accent }: { items: { title: string; description: string }[]; accent: AccentClasses }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border bg-white p-4 flex gap-3">
          <div className={cn("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold", accent.tint)}>
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

// Illustrative queue rows for the hero's Command Center preview — representative
// of the app's real queue-by-status board (components/dashboard/queue-board.tsx),
// not a claim about any tenant's actual submissions.
//
// The default list below renders for any tenant that doesn't declare
// `heroPreviewItems`; a tenant whose work looks nothing like these supplies its
// own (see lib/tenant/es2.ts).
const DEFAULT_HERO_PREVIEW_ITEMS: HeroPreviewItem[] = [
  { label: "Duplicate detection assistant", status: "needs_work" },
  { label: "Grant application triage", status: "ready" },
  { label: "Correspondence summarizer", status: "early" },
]

const PREVIEW_STATUS: Record<HeroPreviewItem["status"], { label: string; className: string }> = {
  needs_work: { label: "Needs work", className: "bg-amber-100 text-amber-700" },
  ready: { label: "Ready", className: "bg-green-100 text-green-700" },
  early: { label: "Early", className: "bg-gray-100 text-gray-500" },
}

/** The preview rows for a tenant — its own when declared, otherwise the shared default. */
export function heroPreviewItems(tenant: TenantConfig): HeroPreviewItem[] {
  return tenant.heroPreviewItems ?? DEFAULT_HERO_PREVIEW_ITEMS
}

// Decorative Command Center dashboard preview for the hero. Built from the
// app's own visual language (KPI tiles, status-pill queue rows) rather than a
// static screenshot, so it never goes stale and needs no binary asset.
function DashboardPreview({
  productName,
  metrics,
  accent,
  items,
}: {
  productName: string
  metrics: { submitted: number; deployed: number }
  accent: AccentClasses
  items: HeroPreviewItem[]
}) {
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
          <div className={cn("rounded-lg border border-l-4 bg-white p-2.5", accent.border)}>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Use cases submitted</div>
            <div className="text-xl font-bold text-uspto-gray-text">{metrics.submitted}</div>
          </div>
          <div className="rounded-lg border border-l-4 border-l-green-500 bg-white p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Use cases deployed</div>
            <div className="text-xl font-bold text-uspto-gray-text">{metrics.deployed}</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {items.map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
              <span className="truncate text-xs font-medium text-uspto-gray-text">{row.label}</span>
              <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium", PREVIEW_STATUS[row.status].className)}>
                {PREVIEW_STATUS[row.status].label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// The three "How it works" steps. Exported so the copy can be asserted over
// directly (public-landing.test.tsx) without rendering the page.
//
// Step 1 deliberately does NOT claim the inventory field set is captured at
// intake: since issues #164/#166 those fields are completed by reviewers during
// vetting, and intake is the short flow the hero advertises. Every reference to
// the inventory itself resolves from `tenant.inventoryLabel`, since not every
// org reports to OMB's published one.
export function howItWorksSteps(tenant: TenantConfig, bureauTier: boolean) {
  return [
    {
      title: "Submit",
      description: `${tenant.assistantName} walks a submitter through a short intake in about two minutes, asking the follow-up questions a reviewer would.`,
    },
    {
      title: "Vet & de-dupe",
      description: bureauTier
        ? `Every use case is checked against what's already in flight across ${tenant.tierLabels.unitPlural.toLowerCase()}, so duplicate effort gets flagged before it's funded twice.`
        : "Every use case is checked against what's already in flight, so duplicate effort gets flagged before it's funded twice.",
    },
    {
      title: "Fund & report",
      description: `Leadership reviews a role-based roll-up of the portfolio and exports the current ${tenant.inventoryLabel} in one click.`,
    },
  ]
}

function HowItWorks({ tenant, bureauTier }: { tenant: TenantConfig; bureauTier: boolean }) {
  const steps = howItWorksSteps(tenant, bureauTier)

  return (
    <section id="explore" className="scroll-mt-8 bg-white py-16">
      <div className="container">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-uspto-gray-text">How it works</h2>
          <p className="mt-2 text-muted-foreground">From a submitted idea to a funded, reportable use case, in three steps.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-xl border bg-gray-50 p-6">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: tenant.theme.primary }}
              >
                {i + 1}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-uspto-gray-text">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** The "What {product} does" cards. Exported for the copy assertions. */
export function featureItems(tenant: TenantConfig, bureauTier: boolean) {
  return [
    {
      icon: Sparkles,
      title: "AI-guided intake",
      description: `Conversational intake that captures the substance of an idea while it's fresh, and leaves the governance record for reviewers to complete during vetting.`,
    },
    {
      icon: ClipboardList,
      title: `Built-in ${tenant.inventoryLabel}`,
      description: `Every field the ${tenant.inventoryLabel} requires has a home in the data model, so the record is filled in as a use case is vetted rather than backfilled at year end.`,
    },
    {
      icon: GitMerge,
      title: bureauTier ? `Cross-${tenant.tierLabels.unit.toLowerCase()} duplicate detection` : "Duplicate detection",
      description: bureauTier
        ? `Flags overlapping or duplicate efforts across ${tenant.tierLabels.unitPlural.toLowerCase()} before they're funded twice.`
        : "Flags overlapping or duplicate efforts before they're funded twice.",
    },
    {
      icon: Download,
      title: `One-click ${tenant.inventoryLabel} export`,
      description: `Generates the ${tenant.inventoryLabel} export in the exact format reviewers require, no manual reformatting.`,
    },
    {
      icon: LayoutDashboard,
      title: "Role-based roll-up",
      description: "Submitters, reviewers, and leadership each get a dashboard scoped to what they're responsible for.",
    },
  ]
}

function Features({ tenant, bureauTier, accent }: { tenant: TenantConfig; bureauTier: boolean; accent: AccentClasses }) {
  const items = featureItems(tenant, bureauTier)

  return (
    <section className="border-y bg-gray-50 py-16">
      <div className="container">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-uspto-gray-text">
            What {tenant.productName} does
          </h2>
          <p className="mt-2 text-muted-foreground">Purpose-built for the AI use case pipeline federal governance actually requires.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-xl border bg-white p-6">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", accent.tint)}>
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-medium text-uspto-gray-text">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * The "Why it holds up" cards. Exported for the copy assertions.
 *
 * The third card used to be a "USPTO & Commerce provenance" claim. It named two
 * customers to every other prospect and described a relationship stronger than
 * the facts support, so it is gone rather than made tenant-aware — what the
 * product is built *to* is the durable claim, not who it was built *with*.
 *
 * The placeholder testimonial that sat under these cards is gone for the same
 * class of reason: a fabricated customer quote on a government-facing page is
 * an honesty problem, not a copy-polish problem. Restore a quote here only when
 * there is a real, attributable one.
 */
export function proofSignals(tenant: TenantConfig) {
  return [
    {
      icon: ShieldCheck,
      title: `Built to the ${tenant.inventoryLabel} field set`,
      description: `Every field the ${tenant.inventoryLabel} requires is mapped field-for-field, and completed by reviewers during vetting rather than demanded of submitters up front.`,
    },
    {
      icon: Award,
      title: "HUBZone-certified small business",
      description: "Built and supported by an SBA-certified HUBZone small business.",
    },
    {
      icon: Landmark,
      title: "Built to recognized AI governance frameworks",
      description: `Structured around ${tenant.riskFramework.label}, so a use case carries the evidence a reviewer needs without a separate compliance exercise.`,
    },
  ]
}

function Proof({ tenant, accent }: { tenant: TenantConfig; accent: AccentClasses }) {
  return (
    <section className="bg-white py-16">
      <div className="container">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-uspto-gray-text">Why it holds up</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {proofSignals(tenant).map((signal) => (
            <div key={signal.title} className="rounded-xl border p-6">
              <signal.icon className={cn("h-6 w-6", accent.text)} />
              <h3 className="mt-3 font-medium text-uspto-gray-text">{signal.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{signal.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClosingCTA({ tenant }: { tenant: TenantConfig }) {
  const subject = encodeURIComponent(`${tenant.productName} walkthrough request`)
  return (
    <section className="py-16" style={{ backgroundColor: tenant.theme.primary }}>
      <div className="container text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Ready to see {tenant.productName} on your own use cases?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/85">
          Request a walkthrough and we&apos;ll show you the intake, de-dupe, and {tenant.inventoryLabel} export end
          to end.
        </p>
        <div className="mt-8">
          <Button size="lg" className="bg-white hover:bg-white/90" style={{ color: tenant.theme.primary }} asChild>
            <a href={`mailto:matt.shankle@packagedagile.com?subject=${subject}`}>
              Request a walkthrough <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}

/**
 * The copy THIS FILE authors, resolved for one tenant — what the copy
 * guardrails in public-landing.test.tsx assert over: no other org's name, no
 * unfilled placeholder, and no "OMB" the page wrote itself.
 *
 * Deliberately excludes the tenant's own content rendered verbatim
 * (`heroHeadline`, `heroSubtitle`, `landingObjectives`). Those legitimately
 * name their own org — USPTO's headline says "USPTO", DoC's objectives say
 * "Commerce" — and are not strings in this file.
 *
 * Keep in step with the sections below when copy is added.
 */
export function landingStrings(tenant: TenantConfig, bureauTier: boolean): string[] {
  return [
    ...heroPreviewItems(tenant).map((r) => r.label),
    ...Object.values(PREVIEW_STATUS).map((s) => s.label),
    "Use cases submitted",
    "Use cases deployed",
    "Command Center",
    "See it in 2 minutes",
    "How it works",
    "From a submitted idea to a funded, reportable use case, in three steps.",
    ...howItWorksSteps(tenant, bureauTier).flatMap((s) => [s.title, s.description]),
    `What ${tenant.productName} does`,
    "Purpose-built for the AI use case pipeline federal governance actually requires.",
    ...featureItems(tenant, bureauTier).flatMap((f) => [f.title, f.description]),
    "Why it holds up",
    ...proofSignals(tenant).flatMap((p) => [p.title, p.description]),
    `Strategic priorities at ${tenant.orgName}, for reference`,
    `Ready to see ${tenant.productName} on your own use cases?`,
    `Request a walkthrough and we'll show you the intake, de-dupe, and ${tenant.inventoryLabel} export end to end.`,
    "Request a walkthrough",
  ]
}

export function PublicLanding() {
  const t = getTenant()
  const bureauTier = tenantHasBureauTier()
  const accent = getAccentClasses(t)
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
    <div className={cn(fraunces.variable, publicSans.variable, "min-h-screen bg-white flex flex-col font-body")}>
      <header className="border-b border-white/10 bg-keystone-basalt">
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
                <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-white drop-shadow-md">
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
                        <a href="#explore">See it in 2 minutes <ArrowRight className="w-4 h-4 ml-2" /></a>
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
                  <DashboardPreview
                    productName={t.productName}
                    metrics={metrics}
                    accent={accent}
                    items={heroPreviewItems(t)}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <HowItWorks tenant={t} bureauTier={bureauTier} />
        <Features tenant={t} bureauTier={bureauTier} accent={accent} />
        <Proof tenant={t} accent={accent} />

        <section className="border-t bg-gray-50 py-14">
          <div className="container">
            {/* Phrased "at {orgName}" rather than a possessive: an org name
                ending in S ("…Services's") reads badly in the uppercase eyebrow. */}
            <p className="mb-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Strategic priorities at {t.orgName}, for reference
            </p>
            <div className="grid lg:grid-cols-2 gap-10">
              {t.landingObjectives.map((group) => (
                <div key={group.title}>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-dow-space mb-1">{group.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{group.subtitle}</p>
                  <ObjectiveList items={group.items} accent={accent} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <ClosingCTA tenant={t} />
      </main>

      <footer className="border-t bg-keystone-basalt">
        <div className="container py-6 text-center text-xs text-dow-steel">
          {t.productName} &middot; {t.logoSubtitle}
        </div>
      </footer>
    </div>
  )
}
