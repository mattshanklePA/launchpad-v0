"use client"

// NL-11 (#312): the "Advisory" word beside Plumb. On ES2 (features.cockpitLook)
// it is a K6 square tag; every other tenant keeps the rounded kind tag.

import { KindTag } from "@/components/ui/kind-tag"
import { GlossaryTerm } from "@/components/launchpad/glossary-term"
import { getTenant } from "@/lib/tenant"
import { SquareTag } from "./square-tag"

export function AdvisoryTag({ glossary = false }: { glossary?: boolean }) {
  const word = glossary ? <GlossaryTerm term="advisory">Advisory</GlossaryTerm> : "Advisory"
  if (getTenant().features.cockpitLook) {
    return <SquareTag tone="neutral">{word}</SquareTag>
  }
  return <KindTag>{word}</KindTag>
}
