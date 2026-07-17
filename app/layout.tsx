import type React from "react"
import type { Metadata } from "next"
import { Chivo, Hanken_Grotesk, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { getTenant } from "@/lib/tenant"

// Keystone base brand type system (.claude/skills/tokens/typography.css /
// fonts.css): Hanken Grotesk (body/UI), Chivo (headings/wordmark), JetBrains
// Mono (mono/labels). Self-hosted via next/font — no runtime font CDN,
// consistent with the public-landing font work
// (components/landing/public-landing.tsx) — and applied app-wide as the
// base; tenants can still override per-surface via className. Weights match
// the DS's own tokens/fonts.css CDN spec (Chivo 400/500/700/900, Hanken
// 400/500/600/700, JetBrains Mono 400/500/600).
const chivo = Chivo({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-chivo",
  display: "swap",
})
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: `${getTenant().productName} - ${getTenant().shortName} AI Use Case Intake`,
  description: "A step-by-step guided intake platform for vetting and governing AI use cases.",
  generator: "v0.app",
  icons: {
    icon: "/keystone/favicon.svg",
    shortcut: "/keystone/favicon.svg",
    apple: "/keystone/app-icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${chivo.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className={hankenGrotesk.className}>
        <div className="min-h-screen bg-background font-sans antialiased">{children}</div>
        <Toaster />
      </body>
    </html>
  )
}
