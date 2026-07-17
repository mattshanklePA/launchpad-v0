/**
 * The Plumb assistant mark (brand/keystone/plumb-assistant.svg) — a plumb
 * line with the bob in Active Blue. Represents the in-app AI assistant
 * wherever it appears (chat panel avatar, the reviewer's "assistant's
 * recommendation" section, coaching buttons); the assistant's *name* still
 * comes from `getTenant().assistantName`, this is only the shared mark.
 */
export function PlumbMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill="none" stroke="#2A333C" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 18 L70 18" />
        <line x1="50" y1="18" x2="50" y2="66" />
      </g>
      <path d="M42 66 L50 80 L58 66 Z" fill="#0086CA" />
    </svg>
  )
}
