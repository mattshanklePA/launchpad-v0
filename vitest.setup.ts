import { afterEach, beforeEach } from "vitest"

// CI runs the suite once per tenant by setting NEXT_PUBLIC_TENANT (issue #235).
// Many test files clean up with an unconditional
// `delete process.env.NEXT_PUBLIC_TENANT`, which would silently turn the rest of
// the file into a USPTO run. Re-assert the tenant this run started with around
// every test. Hooks from setup files are registered first, so with vitest's
// default reverse ("stack") afterEach order this one runs last, after any
// per-file cleanup.
const initialTenant = process.env.NEXT_PUBLIC_TENANT

function restoreTenant() {
  if (initialTenant === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = initialTenant
}

beforeEach(restoreTenant)
afterEach(restoreTenant)
