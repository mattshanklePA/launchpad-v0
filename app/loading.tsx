// Next.js App Router loading UI (shown while a route segment's data loads).
// Keystone is the shared base brand layer (see docs/ARCHITECTURE.md's "Brand
// theme: Keystone" section) — the same app-icon mark used for the favicon/
// apple touch icon (app/layout.tsx) doubles as the splash surface here,
// unconditional on tenant like the rest of the Keystone mark wiring.
// NL-9 (#290): where features.cockpitLook is on (ES2) the same mark sits on
// the chalk canvas. Same mark, no new words.
import { getTenant } from "@/lib/tenant"

export default function Loading() {
  const cockpit = !!getTenant().features.cockpitLook
  return (
    <div
      className={`flex min-h-screen items-center justify-center ${cockpit ? "bg-[var(--surface-canvas)]" : "bg-background"}`}
    >
      <img src="/keystone/app-icon.svg" alt="" className="h-16 w-16 animate-pulse" aria-hidden="true" />
    </div>
  )
}
