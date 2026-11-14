import { act, useState, type ReactElement, type ReactNode } from "react"
import { CockpitBandContext, type BandContent } from "./band-context"
import { createRoot, type Root } from "react-dom/client"
import { afterEach } from "vitest"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Every root a test creates is unmounted after it. Keeping only the last one
// leaked earlier roots when a test rendered twice: React then ran scheduled
// work after the test environment was torn down ("window is not defined"),
// which failed whole test runs at random.
const mounted: { container: HTMLDivElement; root: Root }[] = []

afterEach(() => {
  while (mounted.length) {
    const { container, root } = mounted.pop()!
    act(() => root.unmount())
    container.remove()
  }
})

export function render(ui: ReactElement) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  mounted.push({ container, root })
  act(() => root.render(ui))
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
