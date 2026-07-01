// /api/users/[id]
//   PATCH  → update role and/or jobRole / businessUnit
//   DELETE → remove user (blocks the primary admin)
//
// Both protect the seed admin record from destructive changes.

import { NextResponse } from "next/server"
import { getSupabaseAdmin, type DbUserRow } from "@/lib/supabaseClient"

const PRIMARY_ADMIN_EMAIL = "matt.shankle@uspto.gov"

type ApiUser = {
  id: string
  email: string
  name: string
  role: "admin" | "reviewer" | "submitter"
  jobRole?: string | null
  businessUnit?: string | null
  office?: string | null
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
    office: row.office ?? null,
    createdAt: row.created_at,
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    const { data: existing, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", params.id)
      .maybeSingle()
    if (fetchErr) throw fetchErr
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const patch: Partial<DbUserRow> = {}
    if (body.role !== undefined) {
      if (!["admin", "reviewer", "submitter"].includes(body.role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
      }
      // Don't allow demoting the primary admin.
      if ((existing as DbUserRow).email === PRIMARY_ADMIN_EMAIL && body.role !== "admin") {
        return NextResponse.json(
          { error: "Cannot demote the primary admin account" },
          { status: 403 },
        )
      }
      patch.role = body.role
    }
    if (body.jobRole !== undefined) patch.job_role = body.jobRole || null
    if (body.businessUnit !== undefined) patch.business_unit = body.businessUnit || null
    if (body.office !== undefined) patch.office = body.office || null

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, user: fromRow(existing as DbUserRow) })
    }

    const { data: updated, error } = await supabase
      .from("users")
      .update(patch)
      .eq("id", params.id)
      .select("*")
      .single()
    if (error) throw error
    return NextResponse.json({ user: fromRow(updated as DbUserRow) })
  } catch (error) {
    console.error("PATCH /api/users/[id] failed:", error)
    return NextResponse.json(
      { error: "Failed to update user", detail: String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin()
    const { data: existing } = await supabase
      .from("users")
      .select("email")
      .eq("id", params.id)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if ((existing as { email: string }).email === PRIMARY_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Cannot delete the primary admin account" },
        { status: 403 },
      )
    }
    const { error } = await supabase.from("users").delete().eq("id", params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/users/[id] failed:", error)
    return NextResponse.json(
      { error: "Failed to delete user", detail: String(error) },
      { status: 500 },
    )
  }
}
