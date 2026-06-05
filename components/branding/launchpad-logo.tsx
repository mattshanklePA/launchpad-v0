import { Rocket } from 'lucide-react'
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
 * LaunchPadLogo
 * - Wordmark variant: Rocket icon + product name (Crimson Pro) + subtitle
 * - Icon variant: Rocket icon only with sr-only text
 * - Uses lucide-react for the icon, Tailwind for styling, and tenant brand colors
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

  const iconColor = monochrome ? "text-current" : "text-uspto-blue-primary"
  const titleColor = monochrome ? "text-current" : "text-uspto-gray-text"
  const subtitleColor = monochrome ? "text-current/70" : "text-gray-500"

  if (variant === "icon") {
    return (
      <span className={cn("inline-flex items-center", className)} role="img" aria-label="LaunchPad logo">
        <Rocket className={cn(sz.icon, iconColor)} strokeWidth={2.2} />
        <span className="sr-only">{getTenant().productName}</span>
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center", sz.gap, className)} role="img" aria-label="LaunchPad logo">
      <Rocket className={cn(sz.icon, iconColor)} strokeWidth={2.2} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-wordmark font-semibold tracking-tight", sz.title, titleColor, titleClassName)}>{getTenant().productName}</span>
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
