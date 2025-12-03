import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Microscope, Rocket, CheckCircle } from "lucide-react"
import Link from "next/link"

const metrics = [
  { title: "Use Case Submissions", value: "128", icon: FileText, color: "border-blue-500" },
  { title: "Under Review", value: "42", icon: Microscope, color: "border-yellow-500" },
  { title: "Selected for Pilot", value: "15", icon: Rocket, color: "border-purple-500" },
  { title: "Deployed Solutions", value: "7", icon: CheckCircle, color: "border-green-500" },
]

export function DashboardTiles() {
  return (
    <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Link href="#" key={metric.title}>
          <Card className={`hover:shadow-xl hover:-translate-y-1 transition-all border-b-4 ${metric.color}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              <metric.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-uspto-gray-text">{metric.value}</div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  )
}
