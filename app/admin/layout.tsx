import type { ReactNode } from "react"

// Server-action timeout for the Decision Center briefing (a ~20s model call).
export const maxDuration = 60

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
