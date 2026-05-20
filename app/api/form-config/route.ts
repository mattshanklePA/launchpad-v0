// /api/form-config
//   GET → returns the single-row form config (enabled map)
//   PUT { enabled, updatedBy? } → replaces the enabled map
//
// Single-row pattern (row id = 1). The schema enforces this with a CHECK
// constraint so this endpoint always upserts onto id = 1.

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

type ApiFormConfig = {
  enabled: Record<string, boolean>
  updatedAt: string
  updatedBy?: string | null
}

function fromRow(row: DbFormConfigRow): ApiFormConfig {
  return {
    enabled: row.enabled || {},
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
        { config: { enabled: {}, updatedAt: new Date().toISOString() } },
        { headers: NO_STORE },
      )
    }
    return NextResponse.json({ config: fromRow(data as DbFormConfigRow) }, { headers: NO_STORE })
  } catch (error) {
    console.error("GET /api/form-config failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch form config", detail: String(error) },
      { status: 500, headers: NO_STORE },
    )
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const enabled = body.enabled
    const updatedBy = body.updatedBy ?? null
    if (!enabled || typeof enabled !== "object") {
      return NextResponse.json({ error: "Missing enabled map" }, { status: 400 })
    }
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("form_config").upsert({
      id: 1,
      enabled,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("PUT /api/form-config failed:", error)
    return NextResponse.json(
      { error: "Failed to update form config", detail: String(error) },
      { status: 500 },
    )
  }
}
