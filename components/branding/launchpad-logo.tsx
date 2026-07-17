import { cn } from "@/lib/utils"
import { getTenant } from "@/lib/tenant"

type LogoSize = "sm" | "md" | "lg"
type LogoVariant = "wordmark" | "icon"

export type LaunchPadLogoProps = {
  size?: LogoSize
  variant?: LogoVariant
  withSubtitle?: boolean
  monochrome?: boolean
  className?: string
  titleClassName?: string
  subtitleClassName?: string
}

const SIZE_MAP: Record<LogoSize, { icon: string; title: string; subtitle: string; gap: string }> = {
  sm: { icon: "h-5 w-5", title: "text-base", subtitle: "text-[10px]", gap: "gap-2" },
  md: { icon: "h-7 w-7", title: "text-lg", subtitle: "text-xs", gap: "gap-3" },
  lg: { icon: "h-10 w-10", title: "text-2xl", subtitle: "text-sm", gap: "gap-3.5" },
}

/**
 * The Keystone keystone-wedge mark (brand/keystone/mark-fullcolor.svg). Amber
 * two-tone by default; `monochrome` swaps both facets for `currentColor` so it
 * can sit on any tenant surface (dark headers, sidebars) via the ancestor's
 * text color, matching brand/keystone/README.md's "amber is reserved for the
 * mark and alerts only" rule — the amber fill never appears as decoration.
 */
function KeystoneMark({ className, monochrome }: { className?: string; monochrome?: boolean }) {
  if (monochrome) {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <path d="M30 26 L70 26 L62 80 L38 80 Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M30 26 L70 26 L62 80 L38 80 Z" fill="#C77D3A" />
      <path d="M30 26 L70 26 L67.3 39.5 L32.7 39.5 Z" fill="#DCA061" />
    </svg>
  )
}

/**
 * LaunchPadLogo
 * - Wordmark variant: Keystone mark + product name (Chivo) + subtitle
 * - Icon variant: Keystone mark only with sr-only text
 * - The mark is the shared Keystone base brand asset; the product name and
 *   subtitle text still come from the active tenant (see lib/tenant), so
 *   USPTO/DoW's "LaunchPad" and DoC's "Keystone" keep rendering as before.
 */
export function LaunchPadLogo({
  size = "md",
  variant = "wordmark",
  withSubtitle = true,
  monochrome = false,
  className,
  titleClassName,
  subtitleClassName,
}: LaunchPadLogoProps) {
  const sz = SIZE_MAP[size]

  const iconColor = monochrome ? "text-current" : undefined
  const titleColor = monochrome ? "text-current" : "text-foreground"
  const subtitleColor = monochrome ? "text-current/70" : "text-muted-foreground"

  if (variant === "icon") {
    return (
      <span className={cn("inline-flex items-center", className)} role="img" aria-label={`${getTenant().productName} logo`}>
        <KeystoneMark className={cn(sz.icon, iconColor)} monochrome={monochrome} />
        <span className="sr-only">{getTenant().productName}</span>
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center", sz.gap, className)} role="img" aria-label={`${getTenant().productName} logo`}>
      <KeystoneMark className={cn(sz.icon, "shrink-0", iconColor)} monochrome={monochrome} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-heading font-semibold tracking-tight", sz.title, titleColor, titleClassName)}>{getTenant().productName}</span>
        {withSubtitle && (
          <span className={cn("-mt-0.5 font-medium", sz.subtitle, subtitleColor, subtitleClassName)}>
            {getTenant().logoSubtitle}
          </span>
        )}
      </span>
    </span>
  )
}

/**
 * Convenience export: icon-only mark.
 */
export function LaunchPadMark({
  size = "md",
  monochrome = false,
  className,
}: Pick<LaunchPadLogoProps, "size" | "monochrome" | "className">) {
  return <LaunchPadLogo size={size} variant="icon" monochrome={monochrome} className={className} />
}
