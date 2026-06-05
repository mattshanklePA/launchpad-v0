"use client"

import Link from "next/link"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b bg-white">
        <div className="container flex h-20 items-center">
          <Link href="/">
            <LaunchPadLogo size="md" />
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Sign-up is managed by your administrator
            </CardTitle>
            <CardDescription>
              Self-registration isn't available in this environment. USPTO provisions accounts and roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Go to log in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
