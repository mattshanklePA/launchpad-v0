// F5-5 (#322): what the person has asked for in this browser session only:
// Plumb's note (one per office view) and the Decision Center briefing added to
// the report. Browser memory, never storage and never the database, so a page
// reload or a new session starts clean. Plain functions plus a subscribe so a
// screen can follow changes (`useSyncExternalStore`).

import { useSyncExternalStore } from "react"
import type { CompareBriefing } from "@/app/admin/compare-actions"

export type SavedNote = { note: string; writtenAt: number }
export type SavedBriefing = { briefing: CompareBriefing; /** Titles of the ideas compared, in order. */ titles: string[]; writtenAt: number }

let notes = new Map<string, SavedNote>()
let briefing: SavedBriefing | undefined
let version = 0
const listeners = new Set<() => void>()

function changed() {
  version += 1
  listeners.forEach((fn) => fn())
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

/** `office` is "" for the whole portfolio. */
export const getNote = (office: string): SavedNote | undefined => notes.get(office)
export function setNote(office: string, value: SavedNote): void {
  notes = new Map(notes).set(office, value)
  changed()
}

/** Forget every note: a note is about one set of ideas, and the office view changed. */
export function clearNotes(): void {
  if (notes.size === 0) return
  notes = new Map()
  changed()
}

export const getBriefing = (): SavedBriefing | undefined => briefing
export function setBriefing(value: SavedBriefing): void {
  briefing = value
  changed()
}
export function removeBriefing(): void {
  briefing = undefined
  changed()
}

/** For tests: forget everything. */
export function resetPortfolioReportSession(): void {
  notes = new Map()
  briefing = undefined
  changed()
}

export function useSavedNote(office: string): SavedNote | undefined {
  return useSyncExternalStore(subscribe, () => getNote(office), () => undefined)
}
export function useSavedBriefing(): SavedBriefing | undefined {
  return useSyncExternalStore(subscribe, getBriefing, () => undefined)
}
void version
