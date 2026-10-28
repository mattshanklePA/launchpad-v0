// Tests for lib/aiResilience.ts — the shared recovery path every structured AI
// call in the app runs through. The bug these pin (seen live on the DoC demo
// site, 2026-10-28): the model returned a correct answer but wrapped it one
// level deep as {"$PARAMETER_NAME": {...}}. Schema validation failed, the
// caller caught the error, and the screen silently fell back to canned text.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { z } from "zod"

const recordAiFailure = vi.fn()
vi.mock("@/lib/aiFailureLog", () => ({
  recordAiFailure: (...args: unknown[]) => recordAiFailure(...args),
}))

import { unwrapWrappedObjectText, generateObjectResilient } from "@/lib/aiResilience"

const schema = z.object({ title: z.string(), score: z.number() })
const good = { title: "Fund NIST first", score: 3 }

// A minimal fake model (AI SDK LanguageModelV2 contract) whose successive calls
// return the given raw texts. Hand-rolled because "ai/test" pulls in msw.
function modelReturning(...texts: string[]) {
  const doGenerateCalls: unknown[] = []
  const model = {
    specificationVersion: "v2" as const,
    provider: "fake",
    modelId: "fake-model",
    supportedUrls: {},
    doGenerateCalls,
    doGenerate: async (options: unknown) => {
      const text = texts[Math.min(doGenerateCalls.length, texts.length - 1)]
      doGenerateCalls.push(options)
      return {
        content: [{ type: "text" as const, text }],
        finishReason: "stop" as const,
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        warnings: [],
      }
    },
    doStream: async () => {
      throw new Error("not used")
    },
  }
  return model
}

describe("unwrapWrappedObjectText", () => {
  it("unwraps the exact payload shape seen in production", () => {
    const text = JSON.stringify({ $PARAMETER_NAME: good })
    expect(JSON.parse(unwrapWrappedObjectText(text) ?? "null")).toEqual(good)
  })

  it("unwraps any single-key wrapper around an object", () => {
    const text = JSON.stringify({ input: good })
    expect(JSON.parse(unwrapWrappedObjectText(text) ?? "null")).toEqual(good)
  })

  it("returns null for text that isn't JSON", () => {
    expect(unwrapWrappedObjectText("not json")).toBeNull()
  })

  it("returns null when there is more than one top-level key", () => {
    expect(unwrapWrappedObjectText(JSON.stringify({ a: {}, b: {} }))).toBeNull()
  })

  it("returns null when the single value is not an object", () => {
    expect(unwrapWrappedObjectText(JSON.stringify({ a: "x" }))).toBeNull()
    expect(unwrapWrappedObjectText(JSON.stringify({ a: [1, 2] }))).toBeNull()
  })
})

describe("generateObjectResilient", () => {
  beforeEach(() => recordAiFailure.mockReset())

  it("(the bug) plain generateObject rejects the wrapped production shape", async () => {
    const { generateObject } = await import("ai")
    const model = modelReturning(JSON.stringify({ $PARAMETER_NAME: good }))
    await expect(generateObject({ model, schema, prompt: "x" })).rejects.toThrow(/did not match schema/)
  })

  it("returns a well-formed answer on the first try without logging", async () => {
    const model = modelReturning(JSON.stringify(good))
    const { object } = await generateObjectResilient("test", { model, schema, prompt: "x" })
    expect(object).toEqual(good)
    expect(model.doGenerateCalls).toHaveLength(1)
    expect(recordAiFailure).not.toHaveBeenCalled()
  })

  it("recovers a wrapped answer without a second model call, and logs the repair", async () => {
    const model = modelReturning(JSON.stringify({ $PARAMETER_NAME: good }))
    const { object } = await generateObjectResilient("test", { model, schema, prompt: "x" })
    expect(object).toEqual(good)
    expect(model.doGenerateCalls).toHaveLength(1)
    expect(recordAiFailure).toHaveBeenCalledWith(expect.objectContaining({ label: "test", outcome: "repaired" }))
  })

  it("asks the model once more when the answer can't be repaired", async () => {
    const model = modelReturning(JSON.stringify({ wrong: true, shape: 1 }), JSON.stringify(good))
    const { object } = await generateObjectResilient("test", { model, schema, prompt: "x" })
    expect(object).toEqual(good)
    expect(model.doGenerateCalls).toHaveLength(2)
    expect(recordAiFailure).toHaveBeenCalledWith(expect.objectContaining({ label: "test", outcome: "retried" }))
  })

  it("throws after two unusable answers, so the caller's fallback still runs, and logs it", async () => {
    const model = modelReturning(JSON.stringify({ wrong: true, shape: 1 }))
    await expect(generateObjectResilient("test", { model, schema, prompt: "x" })).rejects.toThrow()
    expect(model.doGenerateCalls).toHaveLength(2)
    expect(recordAiFailure).toHaveBeenCalledWith(expect.objectContaining({ label: "test", outcome: "failed" }))
  })
})
