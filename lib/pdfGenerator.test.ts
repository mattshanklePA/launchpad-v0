import { describe, it, expect, beforeEach, vi } from "vitest"
import { generateSubmissionPDF } from "@/lib/pdfGenerator"
import { initialFormData, type FormData } from "@/lib/steps"

// ES2-14: the PDF is the artifact that leaves the room, so the readiness
// findings belong on it, as bullets above the prose. Nothing here asserts
// pixels — only the text jsPDF is asked to draw, and in what order.
//
// jsPDF copies its methods onto each *instance* rather than a prototype, so
// the spy has to wrap the constructor. `save()` is stubbed out because it
// would try to hand the browser a download.
type TextCall = { text: string | string[]; x: number; y: number }

const { recorded } = vi.hoisted(() => ({ recorded: [] as TextCall[] }))

vi.mock("jspdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jspdf")>()
  function RecordingPdf(...args: unknown[]) {
    const doc = new (actual.jsPDF as any)(...args)
    const realText = doc.text.bind(doc)
    doc.text = (...call: any[]) => {
      recorded.push({ text: call[0], x: call[1], y: call[2] })
      return realText(...call)
    }
    doc.save = () => doc
    return doc
  }
  return { ...actual, jsPDF: RecordingPdf }
})

function capture(formData: FormData): TextCall[] {
  recorded.length = 0
  generateSubmissionPDF(formData)
  return recorded.map((c) => ({ ...c }))
}

/** Flatten every drawn string into one ordered list of lines. */
function lines(calls: TextCall[]): string[] {
  return calls.flatMap((c) => (Array.isArray(c.text) ? c.text : [c.text]))
}

function indexOfLineContaining(all: string[], needle: string): number {
  return all.findIndex((l) => typeof l === "string" && l.includes(needle))
}

const SUMMARY = "The problem is grounded but the expected business benefit has no measured baseline."

const base: FormData = {
  ...initialFormData,
  useCaseTitle: "Invoice anomaly triage",
  submitterName: "Dana Reyes",
  readinessScore: "needs_work",
  readinessSummary: SUMMARY,
}

beforeEach(() => {
  recorded.length = 0
})

describe("generateSubmissionPDF — readiness findings", () => {
  it("prints each finding as a Step N: line above the readiness prose", () => {
    const all = lines(
      capture({
        ...base,
        readinessFindings: [
          { step: 2, message: "Name how many hours a week the manual triage costs." },
          { step: 3, message: "Say what the model would do with a flagged invoice." },
        ],
      }),
    )

    const first = indexOfLineContaining(all, "Step 2: Name how many hours a week")
    const second = indexOfLineContaining(all, "Step 3: Say what the model would do")
    const prose = indexOfLineContaining(all, "The problem is grounded")

    expect(first).toBeGreaterThan(-1)
    expect(second).toBeGreaterThan(first)
    expect(prose).toBeGreaterThan(second)
  })

  it("draws exactly what it draws today when there are no findings", () => {
    const today = capture(base)
    const empty = capture({ ...base, readinessFindings: [] })

    expect(empty).toEqual(today)
    expect(lines(empty).some((l) => typeof l === "string" && /^Step \d+:/.test(l))).toBe(false)
  })

  it("ignores a findings entry with no message", () => {
    const today = capture(base)
    const withBlank = capture({ ...base, readinessFindings: [{ step: 3, message: "   " }] })
    expect(withBlank).toEqual(today)
  })
})
