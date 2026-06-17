/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

import type { SubmissionStore } from "@/lib/ports/store"
import { supabaseStore } from "@/lib/adapters/default/supabaseStore"

/**
 * Resolve the active SubmissionStore.
 *
 * Today this returns the default Supabase store. To run LaunchPad against an
 * agency's own database, branch here on config/env and return a different
 * SubmissionStore. Core code calls store methods through `lib/submissions.ts`,
 * which delegates here, so callers never reference a concrete backend.
 * See docs/BOUNDARY.md.
 */
export function getStore(): SubmissionStore {
  return supabaseStore
}
