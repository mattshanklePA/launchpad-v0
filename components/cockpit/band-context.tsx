"use client"

// NL-10 (#311): one dark band per page. The page band (CockpitShell) owns the
// only K1 band; a page or flow that has more to say (the Submit step question,
// a record's title, the cluster headline) hands its words to that band through
// this context instead of drawing a second band. Outside a CockpitShell (every
// other tenant) the context is null and every export here does nothing.

import { createContext, useContext, useEffect, useLayoutEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"

export type BandContent = {
  eyebrow: string
  title: string
  subtitle?: string
}

export type CockpitBandApi = {
  setContent: (content: BandContent | null) => void
  /** The element on the band's right where a page may place a control (the Guided/Form switch). */
  rightSlot: HTMLElement | null
}

export const CockpitBandContext = createContext<CockpitBandApi | null>(null)

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/** Replace the page band's eyebrow, title and subtitle while this component is mounted. */
export function useCockpitBand(content: BandContent | null): boolean {
  const api = useContext(CockpitBandContext)
  const setContent = api?.setContent
  const eyebrow = content?.eyebrow
  const title = content?.title
  const subtitle = content?.subtitle
  useIsoLayoutEffect(() => {
    if (!setContent) return
    if (eyebrow === undefined || title === undefined) {
      setContent(null)
      return
    }
    setContent({ eyebrow, title, subtitle })
    return () => setContent(null)
  }, [setContent, eyebrow, title, subtitle])
  return !!api
}

/** Render children on the right side of the page band. Nothing outside a CockpitShell. */
export function CockpitBandRight({ children }: { children: ReactNode }) {
  const api = useContext(CockpitBandContext)
  if (!api?.rightSlot) return null
  return createPortal(children, api.rightSlot)
}
