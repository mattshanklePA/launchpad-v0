// K2 SampleDataStrip: one limestone line under the header band. Square basalt
// tag plus one sentence; both are passed in. No stripes.

import { cn } from "@/lib/utils"

export function SampleDataStrip({ tag, sentence, className }: { tag: string; sentence: string; className?: string }) {
  return (
    <div
      data-cockpit="sample-data-strip"
      className={cn(
        "flex items-center gap-3 border-b border-[var(--ks-limestone-dark)] bg-[var(--ks-limestone)] px-8 py-2",
        className,
      )}
    >
      <span className="rounded-[3px] bg-[var(--ks-basalt)] px-2 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ks-chalk)]">
        {tag}
      </span>
      <span className="text-[13px] text-[var(--ks-ink-700)]">{sentence}</span>
    </div>
  )
}
