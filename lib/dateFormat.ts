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
