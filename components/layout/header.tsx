"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { User, Settings, LogOut, Shield, Home, LogIn } from "lucide-react"
import { ensureSeeded, getSession, logout, type Session, hasAdminAccess, isAdmin } from "@/lib/auth"

export function Header() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    ensureSeeded()
    setSession(getSession())
    setHydrated(true)
    // Re-check on storage changes (e.g., when user signs in/out in another tab)
    const onStorage = () => setSession(getSession())
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const handleSignOut = () => {
    logout()
    setSession(null)
    router.replace("/login")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white text-uspto-gray-text">
      <div className="container flex h-20 max-w-screen-2xl items-center justify-between">
        <Link href="https://www.uspto.gov" target="_blank" rel="noopener noreferrer">
          <Image src="/uspto-logo.png" alt="USPTO Logo" width={120} height={40} className="object-contain" />
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>

          {/* Hide the auth UI until we know the session — prevents flicker / hydration mismatch */}
          {!hydrated ? null : !session ? (
            <Button variant="outline" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  {session.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{session.name}</span>
                  <span className="text-xs text-muted-foreground">{session.email}</span>
                  <Badge variant="outline" className="text-xs w-fit mt-1 capitalize">
                    {session.role}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {hasAdminAccess(session) && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      Administration
                    </Link>
                  </DropdownMenuItem>
                )}

                {isAdmin(session) && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin?tab=settings">
                      <Settings className="mr-2 h-4 w-4" />
                      User Management
                    </Link>
                  </DropdownMenuItem>
                )}

                {!hasAdminAccess(session) && (
                  <DropdownMenuItem disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    No admin access
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
