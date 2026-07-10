// Supabase client singletons.
//
// Two clients exist because of the security model:
//   - getSupabaseAdmin() uses the service_role key, bypasses RLS, and must
//     only be called from server-side code (API route handlers). NEVER import
//     this into a client component or it'll leak the secret.
//   - getSupabaseAnon() uses the publishable key and is safe in the browser
//     but is currently unused — all data access goes through our API routes,
//     not direct client → Supabase calls. Kept exported in case we want
//     client-side real-time subscriptions later.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | null = null
let anonClient: SupabaseClient | null = null

/**
 * Server-only admin client. Uses SUPABASE_SERVICE_ROLE_KEY. Bypasses RLS.
 * Throws at call time if env vars aren't set so we fail loudly during dev.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return adminClient
}

/**
 * Browser-safe anon client. Uses NEXT_PUBLIC_SUPABASE_ANON_KEY. Subject to RLS.
 * Currently unused — all reads go through API routes. Kept available for
 * future real-time subscription work.
 */
export function getSupabaseAnon(): SupabaseClient {
  if (anonClient) return anonClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set")
  anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return anonClient
}

// ─── Row types matching the Supabase schema ───
// Keeping these inline rather than generating from supabase types so we don't
// add a codegen step. Sync these with the SQL in lib/migration-notes.md (or
// the original schema we ran in the Supabase SQL Editor).

export type DbUserRow = {
  id: string
  email: string
  name: string
  role: "admin" | "reviewer" | "submitter"
  password: string
  job_role: string | null
  business_unit: string | null
  // Added by the office-hierarchy migration; optional so reads work pre-migration.
  office?: string | null
  created_at: string
}

export type DbSubmissionRow = {
  id: string
  submitted_at: string
  form_data: Record<string, unknown>
  // Added by the review-workflow migration; optional so reads work pre-migration.
  status?: string | null
  owner_email?: string | null
  business_unit?: string | null
  // Added by the office-hierarchy migration; optional so reads work pre-migration.
  office?: string | null
}

export type DbFormConfigRow = {
  id: number
  enabled: Record<string, boolean>
  // Added by db/migrations/doc/0002_field_cascade_mandatory.sql; optional so
  // reads work pre-migration and on tenants (USPTO/DoW) that never add it.
  mandatory?: Record<string, boolean> | null
  updated_at: string
  updated_by: string | null
}
