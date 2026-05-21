// /api/users/login
//   POST { email, password } → { session } or { error }
//
// Demo-grade: plaintext password comparison server-side. Returns a session
// blob the client persists in localStorage. Production replacement is
// Supabase Auth with proper cookies and password hashing.

import { NextResponse } from "next/server"
import { getSupabaseAdmin, type DbUserRow } from "@/lib/supabaseClient"

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

    return NextResponse.json({
      session: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        loggedInAt: new Date().toISOString(),
        jobRole: user.job_role,
        businessUnit: user.business_unit,
      },
    })
  } catch (error) {
    console.error("POST /api/users/login failed:", error)
    return NextResponse.json(
      { error: "Login failed", detail: String(error) },
      { status: 500 },
    )
  }
}
