import { Header } from "@/components/layout/header"
import { Hero } from "@/components/landing/hero"
import { QuickStartTemplates } from "@/components/landing/quick-start-templates"
import { DashboardTiles } from "@/components/landing/dashboard-tiles"
import { RecentDrafts } from "@/components/landing/recent-drafts"
import { FocusAreas } from "@/components/landing/focus-areas"
import { CrossProgramImpact } from "@/components/landing/cross-program-impact"
import { RequireAuth } from "@/components/auth/require-auth"

export default function LandingPage() {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1 text-uspto-gray-text">
          <Hero />
          <QuickStartTemplates />
          <div className="bg-gray-50 py-24">
            <div className="container space-y-20">
              <DashboardTiles />
              <div id="recent-ideas" className="scroll-mt-24">
                <RecentDrafts />
              </div>
              <FocusAreas />
            </div>
          </div>
          <div className="bg-white">
            <CrossProgramImpact />
          </div>
        </main>
      </div>
    </RequireAuth>
  )
}
