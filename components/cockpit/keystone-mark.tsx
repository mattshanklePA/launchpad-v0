// The Keystone mark shown in the K1 band. NL-11 (#312) reuses it as Plumb's
// mark on ES2, so the band and the assistant carry the same mark.

export function KeystoneMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" className={className ?? "shrink-0"}>
      <path d="M9 6h16l-4 22h-8z" fill="var(--ks-amber)" />
      <path d="M9 6h16l-1 5H10z" fill="var(--ks-amber-light)" />
    </svg>
  )
}
