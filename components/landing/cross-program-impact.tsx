import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getTenant } from "@/lib/tenant"

export function CrossProgramImpact() {
  const programs = [
    { name: "Patents", description: "Use cases for patent examination and processing." },
    { name: "Trademarks", description: "Tools and processes for the trademark lifecycle." },
    { name: "IT Systems", description: "Improvements to internal and external IT infrastructure." },
    { name: "Public Engagement", description: "Ideas for better outreach and public services." },
    { name: `All ${getTenant().tierLabels.subUnitPlural}`, description: "Broad initiatives that impact the entire agency." },
  ]

  return (
    <TooltipProvider>
      <section className="text-center py-16">
        <h2 className="text-3xl font-bold tracking-tight">Consider Cross-Program Impact</h2>
        <p className="mt-2 max-w-2xl mx-auto text-lg text-muted-foreground">
          Think about how your use case could benefit multiple USPTO programs.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {programs.map((program) => (
            <Tooltip key={program.name}>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className="inline-flex cursor-default items-center rounded-full border bg-white px-4 py-2 text-base text-foreground"
                >
                  {program.name}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{program.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </section>
    </TooltipProvider>
  )
}
