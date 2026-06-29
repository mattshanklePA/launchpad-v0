import type { TenantConfig } from "./types"
import { uspto } from "./uspto"
import { dow } from "./dow"
import { doc } from "./doc"

const TENANTS: Record<string, TenantConfig> = { uspto, dow, doc }

// Resolve the active tenant from the deployment env. Each org is its own
// Vercel deployment with NEXT_PUBLIC_TENANT set (so it is available on both
// server and client). Defaults to USPTO so existing behavior is unchanged.
export function getTenant(): TenantConfig {
  const id = (process.env.NEXT_PUBLIC_TENANT || "uspto").toLowerCase()
  return TENANTS[id] || uspto
}

export type { TenantConfig } from "./types"
