import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, Zap, Wrench } from "lucide-react"
import Link from "next/link"

const templates = [
  {
    title: "New AI Tool",
    icon: Lightbulb,
    description: "Propose a brand new AI-powered tool or capability.",
    href: "/submit?template=new-tool",
  },
  {
    title: "Process Improvement",
    icon: Zap,
    description: "Use AI to enhance an existing workflow or process.",
    href: "/submit?template=improvement",
  },
  {
    title: "Data Analysis Initiative",
    icon: Wrench,
    description: "Suggest a project focused on new data insights.",
    href: "/submit?template=data-analysis",
  },
]

export function QuickStartTemplates() {
  return (
    <section className="py-16 bg-white text-black">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Start with a Template</h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Get a head start by choosing a template that fits your idea.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {templates.map((template) => (
            <Link href={template.href} key={template.title}>
              <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all">
                <CardHeader className="flex-row items-center gap-4">
                  <template.icon className="h-8 w-8 text-uspto-blue-primary" />
                  <CardTitle>{template.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{template.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
