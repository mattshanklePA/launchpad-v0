import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Smile, Shield, BarChart3 } from "lucide-react"
import Link from "next/link"

const focusAreas = [
  {
    title: "Operational Excellence",
    icon: Zap,
    points: [
      "Drive inclusive use cases and global competitiveness by enabling equitable access to IP systems and tools.",
      "Improve patent and trademark quality and timeliness through AI-driven search tools and more efficient examiner workflows.",
      "Expand operational capabilities by modernizing IT infrastructure and data systems.",
    ],
  },
  {
    title: "Customer Experience",
    icon: Smile,
    points: [
      "Enhance applicant and public-facing experiences by improving transparency and accessibility of IP services.",
      "Use AI and data analytics to streamline communications and reduce applicant friction points.",
      "Expand accessibility and outreach to underserved communities.",
    ],
  },
  {
    title: "Responsible AI & Policy Leadership",
    icon: Shield,
    points: [
      "Advance inclusive AI use cases by developing IP policies that promote equitable participation and global IP leadership.",
      "Empower ethical and responsible use of AI tools internally and across the IP ecosystem.",
      "Build USPTO’s internal AI capabilities, workforce expertise, and governance infrastructure.",
    ],
  },
  {
    title: "Data-Driven Decisioning & Modern IT",
    icon: BarChart3,
    points: [
      "Expand data maturity and accessibility to inform use case and policy decisions.",
      "Develop modern tools for both internal and external users while maintaining legacy systems during transition.",
      "Strengthen IT security, compliance, and resilience to support mission-critical operations.",
    ],
  },
]

export function FocusAreas() {
  return (
    <section>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-uspto-gray-text">Current USPTO Focus Areas</h2>
        <p className="mt-2 text-lg text-muted-foreground">Align your idea with USPTO’s strategic priorities.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {focusAreas.map((area) => (
          <Link href="#" key={area.title} className="group">
            <Card className="h-full rounded-lg shadow-sm transition-all group-hover:shadow-xl group-hover:-translate-y-1">
              <CardHeader className="flex-row items-center gap-4 bg-uspto-blue-primary text-white rounded-t-lg p-4">
                <area.icon className="h-7 w-7 flex-shrink-0" />
                <CardTitle className="text-lg">{area.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="list-disc pl-5 space-y-3 text-uspto-gray-text">
                  {area.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
