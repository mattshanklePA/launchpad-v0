import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"

// CI builds kept failing when Google Fonts didn't answer during `next build`
// ("An error occurred in `next/font`"). Fonts are now committed under
// app/fonts and loaded with next/font/local, so a build never needs the
// network for fonts. This test stops anyone switching back.

const ROOT = path.resolve(__dirname, "..")
const SCAN_DIRS = ["app", "components", "lib", "hooks"]

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(full))
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

describe("self-hosted fonts", () => {
  it("no source file loads fonts from Google at build time", () => {
    const offenders = SCAN_DIRS.flatMap((d) => {
      const abs = path.join(ROOT, d)
      return fs.existsSync(abs) ? sourceFiles(abs) : []
    }).filter((f) => fs.readFileSync(f, "utf8").includes("next/font/google"))
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([])
  })

  it("every font file the app references is committed", () => {
    const files = ["app/layout.tsx", "components/landing/public-landing.tsx"]
    for (const rel of files) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8")
      const refs = [...src.matchAll(/path:\s*"([^"]+\.woff2)"/g)].map((m) => m[1])
      expect(refs.length, `${rel} should load local fonts`).toBeGreaterThan(0)
      for (const ref of refs) {
        expect(fs.existsSync(path.resolve(path.dirname(path.join(ROOT, rel)), ref)), ref).toBe(true)
      }
    }
  })
})
