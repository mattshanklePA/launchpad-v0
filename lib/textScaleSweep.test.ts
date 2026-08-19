import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"

// RD-0 (issue #201), section 5: `text-[10px]`/`text-[11px]` may only survive
// in components/dashboard, components/submissions, components/steps, and
// components/admin on an element that is unambiguously a micro-label or
// badge — carrying `font-mono` (the DS's "mono only for uppercase
// micro-labels and badges" rule) or rendered via StatusPill/KindTag. Anything
// else (readable prose, numbers, hint text) was swept to `text-[13px]`.
//
// Allowlist: source lines where the exemption is real but not visible on the
// same line by a plain text scan.
//   - components/dashboard/dashboard-shell.tsx's GROUP_LABEL_CLASS constant:
//     applied to <SidebarGroupLabel>, whose own default className (components/
//     ui/sidebar.tsx) already carries font-mono — the merged (twMerge) result
//     is mono, but that isn't visible from this constant's own source line.
const ALLOWLIST: { file: string; match: string }[] = [
  {
    file: "components/dashboard/dashboard-shell.tsx",
    match: 'const GROUP_LABEL_CLASS = "text-[10px] font-normal tracking-[0.1em] text-sidebar-foreground/50"',
  },
]

const SCAN_DIRS = ["components/dashboard", "components/submissions", "components/steps", "components/admin"]
const SIZE_RE = /text-\[1[01]px\]/

function listTsxFiles(dir: string): string[] {
  const abs = path.join(process.cwd(), dir)
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return listTsxFiles(rel)
    return entry.isFile() && entry.name.endsWith(".tsx") ? [rel] : []
  })
}

// A same-line check is enough for this codebase's convention: every
// StatusPill/KindTag usage and every remaining Badge carries its size and its
// `font-mono`/component identity on one className expression. (The one
// exception where that isn't true is the explicit ALLOWLIST above.)
function isExempt(line: string): boolean {
  return /font-mono/.test(line) || /<StatusPill/.test(line) || /<KindTag/.test(line)
}

describe("Keystone type scale: no bare 10px/11px readable text", () => {
  for (const dir of SCAN_DIRS) {
    for (const file of listTsxFiles(dir)) {
      it(`${file} keeps text-[10px]/text-[11px] to micro-labels and badges`, () => {
        const lines = fs.readFileSync(path.join(process.cwd(), file), "utf8").split("\n")
        const offenders = lines.filter((line, i) => {
          if (!SIZE_RE.test(line)) return false
          if (isExempt(line)) return false
          if (ALLOWLIST.some((a) => a.file === file && line.includes(a.match))) return false
          return true
        })
        expect(offenders, `${file}:\n${offenders.join("\n")}`).toEqual([])
      })
    }
  }
})
