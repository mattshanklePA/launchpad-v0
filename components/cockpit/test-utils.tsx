import { act, useState, type ReactElement, type ReactNode } from "react"
import { CockpitBandContext, type BandContent } from "./band-context"
import { createRoot, type Root } from "react-dom/client"
import { afterEach } from "vitest"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root!.unmount())
  container?.remove()
  container = null
  root = null
})

export function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

/**
 * NL-10: stands in for the CockpitShell's one band, so a page or flow that
 * hands its words to the band can be rendered on its own and the band read.
 */
export function BandHost({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<BandContent | null>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  return (
    <CockpitBandContext.Provider value={{ setContent, rightSlot: slot }}>
      <header data-cockpit="header-band">
        <span data-band="eyebrow">{content?.eyebrow}</span>
        <h1>{content?.title}</h1>
        <div data-band="right" ref={setSlot} />
      </header>
      {children}
    </CockpitBandContext.Provider>
  )
}
