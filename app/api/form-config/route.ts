// /api/form-config
//   GET → returns the single-row form config (enabled + mandatory maps)
//   PUT { enabled?, mandatory?, updatedBy? } → replaces whichever map(s) are
//     provided (at least one required) — a partial upsert so setFieldEnabled
//     and setFieldMandatory (lib/formConfig.ts) can each write their own map
//     without clobbering the other.
//
// Single-row pattern (row id = 1). The schema enforces this with a CHECK
// constraint so this endpoint always upserts onto id = 1.
//
// `mandatory` (DoC field-config cascade, issue #57 — OS/department admin
// "mandatory for all bureaus" overrides) requires
// db/migrations/doc/0002_field_cascade_mandatory.sql. USPTO/DoW never send
// it, so their deployments work unmigrated.

import { NextResponse } from "next/server"
import { getSupabaseAdmin, type DbFormConfigRow } from "@/lib/supabaseClient"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

// Headers that defeat every layer of caching: browser, Vercel CDN, and any
// intermediary proxy. Applied to every JSON response from this route.
const NO_STORE = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
} as const

// Supabase/Postgres errors are plain objects ({ message, code, details, hint }),
// so String(error) yields the useless "[object Object]". Pull the useful parts
// into a readable string for the JSON `detail` field.
function errToDetail(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>
    const parts = [
      e.message,
      e.code ? `[${e.code}]` : "",
      e.details,
      e.hint ? `hint: ${e.hint}` : "",
    ]
      .filter(Boolean)
      .map(String)
    if (parts.length) return parts.join(" ")
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error)
}

type ApiFormConfig = {
  enabled: Record<string, boolean>
  mandatory: Record<string, boolean>
  updatedAt: string
  updatedBy?: string | null
}

function fromRow(row: DbFormConfigRow): ApiFormConfig {
  return {
    enabled: row.enabled || {},
    mandatory: row.mandatory || {},
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("form_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      // Defensive: schema seeds row 1 on table creation, but if someone wiped
      // it, return the empty default so the client treats all fields as enabled.
      return NextResponse.json(
        { config: { enabled: {}, mandatory: {}, updatedAt: new Date().toISOString() } },
        { headers: NO_STORE },
      )
    }
    return NextResponse.json({ config: fromRow(data as DbFormConfigRow) }, { headers: NO_STORE })
  } catch (error) {
    console.error("GET /api/form-config failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch form config", detail: errToDetail(error) },
      { status: 500, headers: NO_STORE },
    )
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const enabled = body.enabled
    const mandatory = body.mandatory
    const updatedBy = body.updatedBy ?? null
    const hasEnabled = enabled !== undefined && enabled !== null
    const hasMandatory = mandatory !== undefined && mandatory !== null
    if (!hasEnabled && !hasMandatory) {
      return NextResponse.json({ error: "Missing enabled or mandatory map" }, { status: 400 })
    }
    if (hasEnabled && typeof enabled !== "object") {
      return NextResponse.json({ error: "enabled must be an object" }, { status: 400 })
    }
    if (hasMandatory && typeof mandatory !== "object") {
      return NextResponse.json({ error: "mandatory must be an object" }, { status: 400 })
    }
    const row: Record<string, unknown> = {
      id: 1,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    }
    if (hasEnabled) row.enabled = enabled
    if (hasMandatory) row.mandatory = mandatory
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("form_config").upsert(row, { onConflict: "id" })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("PUT /api/form-config failed:", error)
    return NextResponse.json(
      { error: "Failed to update form config", detail: errToDetail(error) },
      { status: 500 },
    )
  }
}
