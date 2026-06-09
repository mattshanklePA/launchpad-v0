import type React from "react"
import type { Metadata } from "next"
import { Open_Sans } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const openSans = Open_Sans({ subsets: ["latin"] })

// Allow long AI calls (e.g. the Decision Center briefing) to finish before the
// serverless function times out. 60s is the Hobby-plan maximum.
export const maxDuration = 60

export const metadata: Metadata = {
  title: "LaunchPad - USPTO AI Use Case Intake",
  description: "A step-by-step guided intake platform for USPTO AI use cases.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={openSans.className}>
        <div className="min-h-screen bg-background font-sans antialiased">{children}</div>
        <Toaster />
      </body>
    </html>
  )
}
