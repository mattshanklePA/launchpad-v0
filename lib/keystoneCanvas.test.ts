import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"

// `--surface-canvas` must resolve to the Keystone DS export's chalk canvas
// (#F4F2EC), matching docs/design/_ds/keystone-design-system/tokens/colors.css
// and every RD-* mock (RD-0, issue #201). Reads the source file rather than
// computed styles — same precedent as lib/tenant/displayVocabulary.test.ts.
const source = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8")

describe("Keystone canvas token", () => {
  it("--ks-chalk is #F4F2EC", () => {
    const css = source("app/styles/keystone/colors.css")
    expect(css).toMatch(/--ks-chalk:\s*#F4F2EC;/)
  })

  it("--surface-canvas resolves to --ks-chalk (not --ks-chalk-light)", () => {
    const css = source("app/styles/keystone/colors.css")
    expect(css).toMatch(/--surface-canvas:\s*var\(--ks-chalk\);/)
  })

  it("app/globals.css's --background HSL is re-derived from #F4F2EC", () => {
    const css = source("app/globals.css")
    // hsl(45, 26.7%, 94.1%) for #F4F2EC, rounded to whole numbers.
    expect(css).toMatch(/--background:\s*45 27% 94%;/)
  })
})
