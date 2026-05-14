"use client"

import { useState, useEffect, Suspense, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Rocket, LogIn, AlertCircle, Info } from "lucide-react"
import { login, getSession, ensureSeeded } from "@/lib/auth"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    ensureSeeded()
    const session = getSession()
    if (session) {
      const next = searchParams.get("next") || "/admin"
      router.replace(next)
    }
  }, [router, searchParams])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const result = login(email, password)
    if (!result.ok) {
      setError(result.error || "Login failed")
      setIsSubmitting(false)
      return
    }
    const next = searchParams.get("next") || "/admin"
    router.replace(next)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl flex items-center gap-2">
          <LogIn className="w-6 h-6" />
          Sign in
        </CardTitle>
        <CardDescription>Access admin features and decision tools.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@uspto.gov"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>
            Don&apos;t have an account? You can still{" "}
            <Link href="/submit" className="underline">
              submit ideas
            </Link>{" "}
            without signing in. Sign in is required only for admin and decision tools.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b bg-white">
        <div className="container flex h-20 items-center">
          <Link href="/" className="flex items-center gap-4">
            <Image src="/uspto-logo.png" alt="USPTO Logo" width={80} height={26} className="object-contain" />
            <div className="h-10 border-l border-gray-300" />
            <div className="flex items-center gap-3">
              <Rocket className="h-7 w-7 text-uspto-blue-primary" />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-uspto-gray-text">LaunchPad</span>
                <p className="-mt-1 text-xs text-gray-500">USPTO AI Use Case Platform</p>
              </div>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading sign-in…</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  )
}
