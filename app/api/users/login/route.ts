// /api/users/login
//   POST { email, password } → { session } or { error }
//
// Demo-grade: plaintext password comparison server-side. On success it sets
// the signed, httpOnly session cookie (lib/session/token.ts) that every other
// route and server action verifies, and returns a session blob the client
// keeps only as a display cache. Password hashing is still a production item.

import { NextResponse } from "next/server"
import { getSupabaseAdmin, type DbUserRow } from "@/lib/supabaseClient"
import { errToDetail } from "@/lib/errToDetail"
import { SESSION_COOKIE_NAME, sessionCookieOptions, signSession } from "@/lib/session/token"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle()
    if (error) throw error
    const user = data as DbUserRow | null
    // Use one generic message for both "no such email" and "wrong password" so
    // the endpoint doesn't reveal which emails have accounts (account enumeration).
    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 })
    }

    // SSO seam: this is the one step that changes when an identity provider is
    // connected — verify the IdP assertion instead of the password, then issue
    // the same cookie. Everything downstream reads only the cookie.
    const token = signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      jobRole: user.job_role,
      businessUnit: user.business_unit,
      office: user.office,
    })
    const res = NextResponse.json({
      session: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        loggedInAt: new Date().toISOString(),
        jobRole: user.job_role,
        businessUnit: user.business_unit,
        office: user.office,
      },
    })
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions())
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (error) {
    console.error("POST /api/users/login failed:", error)
    return NextResponse.json(
      { error: "Login failed", detail: errToDetail(error) },
      { status: 500 },
    )
  }
}
