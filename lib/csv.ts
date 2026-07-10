// Shared RFC 4180 CSV formatting helpers — used by every export builder
// (lib/ombExport.ts, lib/approvalReport.ts) so quoting/escaping stays
// consistent and isn't duplicated per report.

/** Quotes a field containing a comma, quote, or newline; escapes embedded quotes. */
export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function csvLine(values: string[]): string {
  return values.map(csvEscape).join(",")
}
