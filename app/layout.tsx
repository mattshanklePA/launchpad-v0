import type React from "react"
import type { Metadata } from "next"
import { Lato, Oswald, Crimson_Pro } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { getTenant } from "@/lib/tenant"

// Department of War brand type system: Lato (body/UI), Oswald (headlines),
// Crimson Pro (wordmark). All three are the official DOW open-source fonts.
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-lato" })
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-oswald" })
const crimsonPro = Crimson_Pro({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-crimson" })

export const metadata: Metadata = {
  title: `${getTenant().productName} - ${getTenant().shortName} AI Use Case Intake`,
  description: "A step-by-step guided intake platform for vetting and governing AI use cases.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${lato.variable} ${oswald.variable} ${crimsonPro.variable}`}>
      <body className={lato.className}>
        <div className="min-h-screen bg-background font-sans antialiased">{children}</div>
        <Toaster />
      </body>
    </html>
  )
}
