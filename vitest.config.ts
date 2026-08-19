import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"
import path from "node:path"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// Unit-test config. jsdom so modules that touch `window`/localStorage at import
// (auth, dataCache, formConfig) load cleanly. Tests live next to the code as
// *.test.ts. E2E/smoke (Playwright) is a separate setup — see docs/AUTOMATION.md.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "lib/**/*.test.ts",
      "lib/**/*.test.tsx",
      "components/**/*.test.ts",
      "components/**/*.test.tsx",
      "context/**/*.test.ts",
      "context/**/*.test.tsx",
      "hooks/**/*.test.ts",
      "hooks/**/*.test.tsx",
      "app/**/*.test.ts",
      "app/**/*.test.tsx",
    ],
  },
  resolve: {
    alias: { "@": rootDir },
  },
  esbuild: {
    jsx: "automatic",
  },
})
