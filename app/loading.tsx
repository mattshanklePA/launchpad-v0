// Next.js App Router loading UI (shown while a route segment's data loads).
// Keystone is the shared base brand layer (see docs/ARCHITECTURE.md's "Brand
// theme: Keystone" section) — the same app-icon mark used for the favicon/
// apple touch icon (app/layout.tsx) doubles as the splash surface here,
// unconditional on tenant like the rest of the Keystone mark wiring.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <img src="/keystone/app-icon.svg" alt="" className="h-16 w-16 animate-pulse" aria-hidden="true" />
    </div>
  )
}
