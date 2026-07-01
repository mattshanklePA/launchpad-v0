// Small "OMB" indicator shown next to fields that are required for the federal
// AI use case inventory (OMB M-25-21 companion guidance). Purely informational —
// it flags to the submitter and reviewer that this specific field feeds the
// mandated OMB report.
export function OmbBadge() {
  return (
    <span
      title="Required for the OMB federal AI use case inventory (M-25-21 companion guidance)"
      className="ml-2 inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 align-middle"
    >
      OMB
    </span>
  )
}
