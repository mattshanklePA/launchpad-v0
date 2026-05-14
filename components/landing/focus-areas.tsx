import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, Gauge, ShieldCheck, Users, Bot, Globe } from "lucide-react"

// Focus areas drawn from USPTO's published strategic frameworks:
//   - 2022-2026 Strategic Plan (5 agency-wide goals)
//   - AI Strategy (January 2025) (5 AI-specific priorities)
// We group them into 4 themes to match the 2x2 layout the landing uses.
const focusAreas = [
  {
    title: "Efficient Delivery of Reliable IP Rights",
    icon: Gauge,
    source: "USPTO 2022–2026 Strategic Plan — Goal 2",
    points: [
      "Reduce patent and trademark pendency across the corps.",
      "Improve first-action quality and consistency of examination outcomes.",
      "Modernize the examination experience for examiners and applicants alike.",
    ],
  },
  {
    title: "Inclusive Innovation & Public Impact",
    icon: Lightbulb,
    source: "USPTO 2022–2026 Strategic Plan — Goals 1 & 4",
    points: [
      "Expand outreach to under-represented innovators and ensure broad access to the IP system.",
      "Strengthen U.S. leadership in emerging technologies and global competitiveness.",
      "Apply IP and innovation to national priorities — climate, public health, and equity.",
    ],
  },
  {
    title: "IP Protection Against New & Persistent Threats",
    icon: ShieldCheck,
    source: "USPTO 2022–2026 Strategic Plan — Goal 3",
    points: [
      "Strengthen anti-counterfeiting capabilities and enforcement support.",
      "Defend the integrity of issued patents, trademarks, and copyright registrations.",
      "Address emerging threats from fraudulent filings and bad-faith actors.",
    ],
  },
  {
    title: "Responsible AI & Workforce Capability",
    icon: Bot,
    source: "USPTO AI Strategy (Jan 2025) + Strategic Goal 5",
    points: [
      "Promote responsible AI use — bias mitigation, explainability, meaningful human oversight.",
      "Develop AI expertise across the USPTO workforce (examiners, IT, OGC, leadership).",
      "Build AI infrastructure and tooling that maximizes impactful employee and customer experiences.",
    ],
  },
]

export function FocusAreas() {
  return (
    <section>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-uspto-gray-text">Current USPTO Strategic Focus Areas</h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Anchored to USPTO&apos;s published 2022–2026 Strategic Plan and January 2025 AI Strategy.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {focusAreas.map((area) => (
          <Card
            key={area.title}
            className="h-full rounded-lg shadow-sm transition-all hover:shadow-xl hover:-translate-y-1"
          >
            <CardHeader className="flex-row items-center gap-4 bg-uspto-blue-primary text-white rounded-t-lg p-4">
              <area.icon className="h-7 w-7 flex-shrink-0" />
              <div>
                <CardTitle className="text-lg">{area.title}</CardTitle>
                <p className="text-xs text-white/80 mt-0.5">{area.source}</p>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="list-disc pl-5 space-y-3 text-uspto-gray-text">
                {area.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
