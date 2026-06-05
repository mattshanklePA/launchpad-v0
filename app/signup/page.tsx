"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle } from "lucide-react"
import { addUser, login, type BusinessUnit } from "@/lib/auth"

const UNITS: { value: BusinessUnit; label: string }[] = [
  { value: "patents", label: "Patents" },
  { value: "trademarks", label: "Trademarks" },
  { value: "ocio", label: "OCIO" },
  { value: "ocfo", label: "OCFO" },
  { value: "ogc", label: "OGC" },
  { value: "opia", label: "OPIA" },
  { value: "hr", label: "Human Resources" },
  { value: "other", label: "Other" },
]

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [unit, setUnit] = useState<BusinessUnit>("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await addUser({ email, name, role: "submitter", password, businessUnit: unit })
    if ("error" in res) {
      setError(res.error)
      setBusy(false)
      return
    }
    const lr = await login(email, password)
    setBusy(false)
    router.replace(lr.ok ? "/home" : "/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b bg-white">
        <div className="container flex h-20 items-center">
          <Link href="/"><LaunchPadLogo size="md" /></Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Sign up to submit and track AI use cases.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@uspto.gov" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
              </div>
              <div className="space-y-2">
                <Label>Business unit</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as BusinessUnit)}>
                  <SelectTrigger><SelectValue placeholder="Select your business unit..." /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <div className="mt-6 pt-4 border-t text-xs text-muted-foreground text-center">
              Already have an account? <Link href="/login" className="underline">Log in</Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
