import { describe, it, expect, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "", style: {} })
  return { Fraunces: font, Public_Sans: font }
})

import { ALL_TENANTS } from "@/lib/tenant"

// Issue #223 / roadmap 32.5. Customer environments require LaunchPad to
// present as model-neutral: no model vendor, lab, or model-family name in
// anything a customer sees or reads. This is the model-neutrality analogue of
// the DoW naming test (lib/tenant/displayVocabulary.test.ts's "no display
// string carries another org's vocabulary") — same two techniques, walk every
// string in a tenant config, and scan the display text of every file that can
// render customer-facing copy — driven off ALL_TENANTS so a fifth tenant is
// covered automatically.
//
// What FORBIDDEN does *not* need to cover: cloud/hosting infrastructure names
// (AWS, Amazon Bedrock, GovCloud) are not a model vendor, lab, or
// model-family — they describe where the model runs, not who trained it, and
// several tenants' copy legitimately cites Bedrock/GovCloud as an
// authorization example. Only the provider org, the model family, and the
// package/product names that would leak vendor identity are in scope.
const FORBIDDEN =
  /\bAnthropic\b|\bClaude\b|\bSonnet\b|\bOpus\b|\bHaiku\b|\bOpenAI\b|\bChatGPT\b|\bGPT-?\d\w*\b|\bGemini\b|\bLlama\b|\bMistral\b|\bCohere\b/i

const root = process.cwd()
const source = (f: string) => fs.readFileSync(path.join(root, f), "utf8")

// Same display-text extractor as lib/tenant/displayVocabulary.test.ts: pulls
// only quoted/template-literal strings and JSX text nodes, after stripping
// comments, `className` attributes, and module specifiers, so an import path
// like `@/lib/adapters/default/anthropicProvider` or an identifier like
// `anthropicModelProvider` can't masquerade as a leak. Kept as a local copy
// rather than a shared import so this test stays self-contained and doesn't
// risk destabilizing the existing DoW naming test.
function displayTextOf(src: string): string[] {
  const code = src
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .map((line) => line.replace(/(^|[^:])\/\/.*/, "$1"))
    .join("\n")
    .replace(/className=(?:"[^"]*"|\{[^}]*\})/g, "")
    .replace(/\bfrom\s+(['"])[^'"]*\1/g, "")
    .replace(/\bimport\s*\(\s*(['"])[^'"]*\1\s*\)/g, "")
    .replace(/\bimport\s+(['"])[^'"]*\1/g, "")
    .replace(/\brequire\(\s*(['"])[^'"]*\1\s*\)/g, "")

  const out: string[] = []
  for (const m of code.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`]*)`/g)) {
    out.push(m[1] ?? m[2] ?? m[3] ?? "")
  }
  for (const m of code.matchAll(/>([^<>{}]+)</g)) out.push(m[1])
  return out.map((t) => t.trim()).filter(Boolean)
}

// Recursively walks a directory, returning every file whose name ends in one
// of `exts`, skipping `*.test.*` files (fixtures/assertions legitimately name
// the banned words) and any path matching `skip`.
function walk(dir: string, exts: string[], skip: RegExp[] = []): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    if (skip.some((re) => re.test(rel))) continue
    if (entry.isDirectory()) out.push(...walk(rel, exts, skip))
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(rel)
  }
  return out
}

// Every renderable file under app/ and components/ — the UI copy, the public
// landing/home surface, and the exports under app/api/export/ are all here —
// plus lib/pdfGenerator.ts and lib/tenant/*.ts named explicitly by the issue.
// lib/modelProvider.ts, lib/ports/model.ts and lib/adapters/default/
// anthropicProvider.ts are deliberately NOT walked: per the issue's scope
// line, internal code identifiers (the port, the adapter, the env var name)
// are out of bounds — this test is about rendered output, not the plumbing
// that makes the port swappable.
const SWEPT_DIRS = [
  ...walk("app", [".ts", ".tsx"], [/\.test\.tsx?$/]),
  ...walk("components", [".ts", ".tsx"], [/\.test\.tsx?$/]),
]
const SWEPT_FILES = [...SWEPT_DIRS, "lib/pdfGenerator.ts", ...walk("lib/tenant", [".ts"], [/\.test\.ts$/])]

describe("no rendered surface names a model vendor, lab, or model family (#223)", () => {
  it("has none of Anthropic/Claude/OpenAI/Gemini/Llama/Mistral/Cohere/Sonnet/Opus/Haiku/GPT/ChatGPT in the display text of app/, components/, lib/pdfGenerator.ts, or lib/tenant/*.ts", () => {
    for (const file of SWEPT_FILES) {
      const offending = displayTextOf(source(file)).filter((t) => FORBIDDEN.test(t))
      expect(offending, `${file}:\n${offending.join("\n")}`).toEqual([])
    }
  })

  it("covers all four tenants — not just es2", () => {
    expect(ALL_TENANTS.map((t) => t.id).sort()).toEqual(["doc", "dow", "es2", "uspto"])
  })

  // The DoW-naming-test technique: walk every string value in the tenant
  // config object itself (not just the files that read from it), so a vendor
  // name hardcoded straight into seed/tenant data is caught even if no
  // component's source text embeds it literally.
  function stringsIn(value: unknown): string[] {
    if (typeof value === "string") return [value]
    if (Array.isArray(value)) return value.flatMap(stringsIn)
    if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn)
    return []
  }

  it("has no vendor/lab/model-family name anywhere in any tenant's config object", () => {
    for (const tenant of ALL_TENANTS) {
      const offending = stringsIn(tenant).filter((s) => FORBIDDEN.test(s))
      expect(offending, `${tenant.id}:\n${offending.join("\n")}`).toEqual([])
    }
  })

  it("would still catch a reintroduced vendor name — the pattern is not inert", () => {
    expect(displayTextOf('<p>Running on Claude, by Anthropic.</p>')).toEqual(
      expect.arrayContaining(["Running on Claude, by Anthropic."]),
    )
    expect(FORBIDDEN.test("Running on Claude, by Anthropic.")).toBe(true)
    expect(FORBIDDEN.test("claude-sonnet-4-5-20250929")).toBe(true)
    expect(FORBIDDEN.test("Powered by GPT-4 and ChatGPT")).toBe(true)
    // ...while ordinary words, an import path, and a class name are not false
    // positives — the DS's own "Palm/Bard/Cohere"-adjacent English words don't
    // exist here, so there is nothing to accidentally strip.
    expect(FORBIDDEN.test("Scout coaches a non-technical submitter")).toBe(false)
    expect(displayTextOf('import { anthropicModelProvider } from "@/lib/adapters/default/anthropicProvider"')).toEqual(
      [],
    )
  })

  // Item 3: wherever the settings surface displays which model an AI feature
  // runs on, the rendered default must not be a live model id (which, for
  // this provider, is itself a vendor string — see
  // lib/adapters/default/anthropicProvider.ts's DEFAULT_MODEL_ID) — it must
  // come from config and render neutrally when that config is unset.
  it("renders the Platform Configuration AI Model field from config, neutral by default", () => {
    const src = source("app/admin/page.tsx")
    expect(src).toContain("{tenant.assistantName} AI Model")
    expect(src).toMatch(/process\.env\.NEXT_PUBLIC_MODEL_DISPLAY_NAME\s*\?\?\s*"[^"]*"/)
    expect(src).not.toMatch(/defaultValue="claude[^"]*"/i)
  })
})
