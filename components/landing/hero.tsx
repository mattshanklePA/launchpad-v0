import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Info, Rocket } from "lucide-react"

export function Hero() {
  return (
    <section className="w-full border-b bg-gray-100 py-20 md:py-28">
      <div className="container flex flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-8">
          <Rocket className="h-16 w-16 text-uspto-blue-primary" />
          <div className="flex flex-col items-start">
            <span className="text-5xl font-bold text-uspto-gray-text">LaunchPad!</span>
            <p className="text-lg text-gray-500">USPTO AI Use Case Platform</p>
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-uspto-gray-text sm:text-5xl lg:text-6xl">
          Submit Your AI Use Case
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600">
          Use LaunchPad to transform your ideas into structured, actionable business cases. Connect operational needs
          with formal AI pipelines to drive USPTO's mission forward.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-blue-400 h-12 px-8 text-base text-white hover:bg-blue-500 hover:scale-105 transition-transform"
          >
            <Link href="/submit">
              Start Use Case Submission <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent">
            View Saved Drafts
          </Button>
          <Button size="lg" variant="ghost" className="h-12 px-8 text-base text-gray-600">
            <Info className="mr-2 h-5 w-5" /> How It Works
          </Button>
        </div>
      </div>
    </section>
  )
}
