import { Rocket } from "lucide-react"
import { HeroActions } from "@/components/landing/hero-actions"
import { getTenant } from "@/lib/tenant"

export function Hero() {
  const tenant = getTenant()
  return (
    <section className="w-full border-b bg-gray-100 py-20 md:py-28">
      <div className="container flex flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-8">
          <Rocket className="h-16 w-16 text-uspto-blue-primary" />
          <div className="flex flex-col items-start">
            <span className="text-5xl font-bold text-uspto-gray-text">{tenant.productName}!</span>
            <p className="text-lg text-gray-500">{tenant.logoSubtitle}</p>
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-uspto-gray-text sm:text-5xl lg:text-6xl">
          Submit Your AI Idea
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600">
          Turn rough AI ideas into vetted, decision-ready use cases.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500">
          Configurable for every business unit — Patents, Trademarks, OCIO, HR, OGC, and beyond.
          {tenant.productName} adapts to how each team frames its work.
        </p>
        <HeroActions />
      </div>
    </section>
  )
}
