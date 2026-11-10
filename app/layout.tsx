import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { DraftResetSync } from "@/components/draft-reset-sync"
import { getTenant } from "@/lib/tenant"

// Keystone base brand type system (.claude/skills/tokens/typography.css /
// fonts.css): Hanken Grotesk (body/UI), Chivo (headings/wordmark), JetBrains
// Mono (mono/labels). Self-hosted from app/fonts via next/font/local (no network fetch at
// build time, no runtime font CDN),
// consistent with the public-landing font work
// (components/landing/public-landing.tsx) — and applied app-wide as the
// base; tenants can still override per-surface via className. Weights match
// the DS's own tokens/fonts.css CDN spec (Chivo 400/500/700/900, Hanken
// 400/500/600/700, JetBrains Mono 400/500/600).
const chivo = localFont({
  src: [
    { path: "./fonts/chivo-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/chivo-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/chivo-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/chivo-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-chivo",
  display: "swap",
})
const hankenGrotesk = localFont({
  src: [
    { path: "./fonts/hanken-grotesk-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/hanken-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/hanken-grotesk-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/hanken-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-hanken",
  display: "swap",
})
const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
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
        <DraftResetSync />
      </body>
    </html>
  )
}
