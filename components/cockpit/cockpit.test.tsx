import { describe, it, expect } from "vitest"
import { act } from "react"
import { render } from "./test-utils"
import { HeaderBand, SampleDataStrip, SectionTitle, MeasurePanel, MeasureRow, RankedTable, SquareTag, Track } from "./index"

describe("K1 HeaderBand", () => {
  it("renders eyebrow, title, subtitle, actions and nav", () => {
    const el = render(
      <HeaderBand eyebrow="EYEBROW" title="Page title" subtitle="Sub line" actions={<button>Act</button>} nav={<nav>Tabs</nav>} />,
    )
    expect(el.textContent).toContain("EYEBROW")
    expect(el.querySelector("h1")?.textContent).toBe("Page title")
    expect(el.querySelector("h1")?.className).toContain("ks-page-title")
    expect(el.textContent).toContain("Sub line")
    expect(el.querySelector("button")?.textContent).toBe("Act")
    expect(el.querySelector("nav")?.textContent).toBe("Tabs")
    const header = el.querySelector("header") as HTMLElement
    expect(header.style.background).toContain("--ks-basalt-800")
  })

  it("uses the tenant color when passed", () => {
    const el = render(<HeaderBand eyebrow="e" title="t" background="#112233" />)
    expect((el.querySelector("header") as HTMLElement).style.background).toBe("rgb(17, 34, 51)")
  })
})

describe("K2 SampleDataStrip", () => {
  it("renders the tag and sentence from props", () => {
    const el = render(<SampleDataStrip tag="SAMPLE DATA" sentence="Demo numbers." />)
    expect(el.textContent).toContain("SAMPLE DATA")
    expect(el.textContent).toContain("Demo numbers.")
  })
})

describe("K3 SectionTitle", () => {
  it("renders title and context with a rule", () => {
    const el = render(<SectionTitle title="Whole portfolio" context="42 ideas" />)
    expect(el.querySelector("h2")?.className).toContain("ks-section-head")
    expect(el.textContent).toContain("Whole portfolio")
    expect(el.textContent).toContain("42 ideas")
    expect(el.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})

function panel(n: number, title: string) {
  return (
    <MeasurePanel
      key={n}
      number={n}
      title={title}
      question={`Q${n}?`}
      bigNumber={n * 10}
      meaning={`meaning ${n}`}
      link={{ href: `/x${n}`, label: `link ${n}` }}
      track={n === 1 ? <Track label="Median 11 days" actualPercent={40} /> : undefined}
    />
  )
}

describe("K4 MeasurePanel / MeasureRow", () => {
  it("renders every prop, with no shadow", () => {
    const el = render(panel(1, "Risk"))
    const article = el.querySelector("article") as HTMLElement
    expect(article.textContent).toContain("Risk")
    expect(article.textContent).toContain("Q1?")
    expect(article.textContent).toContain("10")
    expect(article.textContent).toContain("meaning 1")
    expect(article.textContent).toContain("Median 11 days")
    expect(el.querySelector("a")?.getAttribute("href")).toBe("/x1")
    expect(el.querySelector(".ks-big-number")).not.toBeNull()
    expect(article.className).not.toMatch(/shadow/)
  })

  it("puts the lead panel first and wider (1.4 : 1 : 1), stacked by default", () => {
    const el = render(<MeasureRow>{[panel(1, "A"), panel(2, "B"), panel(3, "C")]}</MeasureRow>)
    const row = el.querySelector('[data-cockpit="measure-row"]') as HTMLElement
    expect(row.className).toContain("grid-cols-1")
    expect(row.className).toContain("lg:grid-cols-[1.4fr_1fr_1fr]")
    expect(row.firstElementChild?.textContent).toContain("A")
  })

  it("uses 1.4 : 1 for two panels", () => {
    const el = render(<MeasureRow>{[panel(1, "A"), panel(2, "B")]}</MeasureRow>)
    expect((el.querySelector('[data-cockpit="measure-row"]') as HTMLElement).className).toContain("lg:grid-cols-[1.4fr_1fr]")
  })
})

interface Row {
  id: string
  name: string
  ref: string
  status: string
}
const rows: Row[] = [
  { id: "a", name: "Alpha", ref: "KS-1", status: "In review" },
  { id: "b", name: "Beta", ref: "KS-2", status: "Approved" },
]

function table() {
  return (
    <RankedTable<Row>
      groups={[{ id: "g", title: "Office One", summary: "2 ideas", rows }]}
      columns={[{ key: "status", header: "Status", render: (r) => r.status }]}
      getRowId={(r) => r.id}
      getRank={(r) => (r.id === "a" ? "#1" : "#2")}
      getName={(r) => r.name}
      getReference={(r) => r.ref}
      getDetails={(r) => [
        { label: "What it does", value: `${r.name} does things` },
        { label: "Who uses it", value: "Staff" },
        { label: "Next step", value: "Open" },
      ]}
      rankHeader="Rank"
      nameHeader="Idea"
      expandAllLabel="Expand all"
      collapseAllLabel="Collapse all"
      toolbar={<span>FILTER-SLOT</span>}
    />
  )
}

const dataRows = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLTableRowElement>("tr[aria-expanded]"))
const key = (row: HTMLElement, k: string) =>
  act(() => {
    row.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }))
  })

describe("K5 RankedTable", () => {
  it("renders group header, rank, name, reference, columns and the given toolbar", () => {
    const el = render(table())
    expect(el.textContent).toContain("Office One")
    expect(el.textContent).toContain("2 ideas")
    expect(el.textContent).toContain("#1")
    expect(el.textContent).toContain("Alpha")
    expect(el.textContent).toContain("KS-1")
    expect(el.textContent).toContain("In review")
    expect(el.textContent).toContain("FILTER-SLOT")
    expect(el.querySelector("dl")).toBeNull()
  })

  it("opens and closes a row by click, with aria-expanded", () => {
    const el = render(table())
    const [first] = dataRows(el)
    expect(first.getAttribute("aria-expanded")).toBe("false")
    act(() => first.click())
    expect(dataRows(el)[0].getAttribute("aria-expanded")).toBe("true")
    expect(el.querySelectorAll("dt")).toHaveLength(3)
    expect(el.textContent).toContain("Alpha does things")
    act(() => dataRows(el)[0].click())
    expect(dataRows(el)[0].getAttribute("aria-expanded")).toBe("false")
    expect(el.querySelector("dl")).toBeNull()
  })

  it("opens and closes a row with Enter and with Space", () => {
    const el = render(table())
    expect(dataRows(el)[0].tabIndex).toBe(0)
    key(dataRows(el)[0], "Enter")
    expect(dataRows(el)[0].getAttribute("aria-expanded")).toBe("true")
    key(dataRows(el)[0], "Enter")
    expect(dataRows(el)[0].getAttribute("aria-expanded")).toBe("false")
    key(dataRows(el)[1], " ")
    expect(dataRows(el)[1].getAttribute("aria-expanded")).toBe("true")
    key(dataRows(el)[1], " ")
    expect(dataRows(el)[1].getAttribute("aria-expanded")).toBe("false")
  })

  it("open row has a limestone wash, bold title and no amber left rule", () => {
    const el = render(table())
    act(() => dataRows(el)[0].click())
    const open = dataRows(el)[0]
    expect(open.className).toContain("bg-[var(--ks-limestone)]")
    expect(open.className).not.toMatch(/amber|border-l/)
    expect(open.querySelector("div.font-bold")?.textContent).toBe("Alpha")
  })

  it("Expand all opens every row, then collapses", () => {
    const el = render(table())
    const btn = () => Array.from(el.querySelectorAll("button")).find((b) => /all/.test(b.textContent ?? ""))!
    expect(btn().textContent).toBe("Expand all")
    act(() => btn().click())
    expect(dataRows(el).every((r) => r.getAttribute("aria-expanded") === "true")).toBe(true)
    expect(btn().textContent).toBe("Collapse all")
    act(() => btn().click())
    expect(dataRows(el).every((r) => r.getAttribute("aria-expanded") === "false")).toBe(true)
  })
})

describe("K6 SquareTag / Track", () => {
  it.each(["healthy", "attention", "alert", "neutral", "info"] as const)("%s tag is square and shows its word", (tone) => {
    const el = render(<SquareTag tone={tone}>Word {tone}</SquareTag>)
    const tag = el.querySelector('[data-cockpit="square-tag"]') as HTMLElement
    expect(tag.className).not.toContain("rounded-full")
    expect(tag.textContent).toBe(`Word ${tone}`)
    expect(tag.querySelector("svg")).not.toBeNull()
  })

  it("Track shows a hollow planned dot, a solid actual dot and a text label", () => {
    const el = render(<Track label="Median 11 days" actualPercent={48} plannedPercent={70} startLabel="0 days" endLabel="30 days" />)
    expect(el.querySelector('[data-track-dot="actual"]')?.className).toContain("bg-[var(--ks-basalt)]")
    expect(el.querySelector('[data-track-dot="planned"]')?.className).toContain("bg-white")
    expect(el.textContent).toContain("Median 11 days")
    expect(el.textContent).toContain("0 days")
    expect(el.textContent).toContain("30 days")
  })
})
