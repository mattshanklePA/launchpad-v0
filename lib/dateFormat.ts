// One fixed zone for every user-facing date, so the same record shows the same
// day to every viewer and on server- and browser-rendered screens alike
// (issue #236). Never rely on the process/browser time zone.

export const DISPLAY_TIME_ZONE = "America/New_York"

/** `M/D/YYYY` in the display zone (replaces bare `toLocaleDateString()`). Returns the input unchanged if it isn't a valid date. */
export function formatDisplayDate(iso: string, timeZone: string = DISPLAY_TIME_ZONE): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" }).format(d)
}

/** "just submitted" within 24 hours of `iso`, otherwise "Submitted <date>". An idea submitted days ago is not "just submitted". */
export function submittedLabel(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t) || now - t <= 24 * 60 * 60 * 1000) return "just submitted"
  return `Submitted ${formatKeystoneDate(iso)}`
}

/** `d Mon yyyy` (e.g. "1 Nov 2026") in the display zone: the one date format every screen uses, for all tenants. Returns the input unchanged if it isn't a valid date. */
export function formatKeystoneDate(iso: string, timeZone: string = DISPLAY_TIME_ZONE): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric" }).format(d)
}
