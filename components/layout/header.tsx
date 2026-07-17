"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
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

const darkBtn = "bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"

export function Header() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    ensureSeeded()
    setSession(getSession())
    setHydrated(true)
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
    <header className="sticky top-0 z-50 w-full border-b border-primary-foreground/10 bg-primary text-primary-foreground">
      <div className="container flex h-20 max-w-screen-2xl items-center justify-between">
        <Link href={session ? "/home" : "/"}>
          <LaunchPadLogo size="md" monochrome className="text-primary-foreground" subtitleClassName="text-primary-foreground/60" />
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild className={darkBtn}>
            <Link href={session ? "/home" : "/"}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>

          {!hydrated ? null : !session ? (
            <Button variant="outline" asChild className={darkBtn}>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={darkBtn}>
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
