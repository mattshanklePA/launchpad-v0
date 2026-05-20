// /api/users
//   GET  → list all users (admin-facing — passwords stripped from response)
//   POST → create a new user (admin-facing)
//
// Important: passwords are stripped from GET responses. The POST handler
// accepts the password in plaintext (demo-grade), stores it in plaintext
// (same), and the login route compares plaintext. Production work item:
// swap to Supabase Auth and stop touching passwords at all.

import { NextResponse } from "next/server"
import { getSupabaseAdmin, type DbUserRow } from "@/lib/supabaseClient"

export const dynamic = "force-dynamic"

type ApiUser = {
  id: string
  email: string
  name: string
  role: "admin" | "reviewer" | "submitter"
  jobRole?: string | null
  businessUnit?: string | null
  createdAt: string
}

function fromRow(row: DbUserRow): ApiUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    jobRole: row.job_role,
    businessUnit: row.business_unit,
    createdAt: row.created_at,
  }
}

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: true })
    if (error) throw error
    const users = (data || []).map((row) => fromRow(row as DbUserRow))
    return NextResponse.json({ users })
  } catch (error) {
    console.error("GET /api/users failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch users", detail: String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || "").trim().toLowerCase()
    const name = String(body.name || "").trim()
    const role = body.role
    const password = String(body.password || "")
    const jobRole = body.jobRole ?? null
    const businessUnit = body.businessUnit ?? null

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (!["admin", "reviewer", "submitter"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Uniqueness check
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 })
    }

    const newUser: DbUserRow = {
      id: genId("user"),
      email,
      name,
      role,
      password,
      job_role: jobRole,
      business_unit: businessUnit,
      created_at: new Date().toISOString(),
    }
    const { error } = await supabase.from("users").insert(newUser)
    if (error) throw error
    return NextResponse.json({ user: fromRow(newUser) })
  } catch (error) {
    console.error("POST /api/users failed:", error)
    return NextResponse.json(
      { error: "Failed to create user", detail: String(error) },
      { status: 500 },
    )
  }
}
