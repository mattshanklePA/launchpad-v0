"use client"

// A compact, self-contained sidebar shell primitive (persistent left nav +
// collapsible icon rail + main content inset), styled off the app's existing
// --sidebar-* CSS tokens (styles/globals.css) so it follows light/dark like
// every other surface. Not the full shadcn/ui sidebar registry component —
// trimmed to what the Command Center shell needs: a desktop icon-collapse
// rail plus a lightweight off-canvas panel on narrow viewports, no drag-resize
// or SSR cookie persistence.

import * as React from "react"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const SIDEBAR_STORAGE_KEY = "launchpad-sidebar-open"
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_ICON = "3.5rem"

type SidebarState = "expanded" | "collapsed"

type SidebarContextValue = {
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  toggleSidebar: () => void
  isMobile: boolean
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider")
  return context
}

export function SidebarProvider({
  defaultOpen = true,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & { defaultOpen?: boolean }) {
  const isMobile = useIsMobile()
  const [open, _setOpen] = React.useState(defaultOpen)
  const [openMobile, setOpenMobile] = React.useState(false)

  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(SIDEBAR_STORAGE_KEY) : null
    if (stored !== null) _setOpen(stored === "true")
  }, [])

  const setOpen = React.useCallback((value: boolean) => {
    _setOpen(value)
    if (typeof window !== "undefined") window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value))
  }, [])

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((v) => !v)
    else setOpen(!open)
  }, [isMobile, open, setOpen])

  const state: SidebarState = open ? "expanded" : "collapsed"

  const value = React.useMemo<SidebarContextValue>(
    () => ({ state, open, setOpen, toggleSidebar, isMobile, openMobile, setOpenMobile }),
    [state, open, setOpen, toggleSidebar, isMobile, openMobile],
  )

  return (
    <SidebarContext.Provider value={value}>
      <div
        style={{ "--sidebar-width": SIDEBAR_WIDTH, "--sidebar-width-icon": SIDEBAR_WIDTH_ICON, ...style } as React.CSSProperties}
        className={cn("flex min-h-svh w-full bg-background", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar()

  if (isMobile) {
    return (
      <>
        {openMobile && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpenMobile(false)}
            aria-hidden="true"
          />
        )}
        <aside
          data-state={openMobile ? "expanded" : "collapsed"}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out",
            openMobile ? "translate-x-0" : "-translate-x-full",
            className,
          )}
          {...props}
        >
          {children}
        </aside>
      </>
    )
  }

  return (
    <aside
      data-state={state}
      className={cn(
        "group/sidebar sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out md:flex",
        state === "expanded" ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-icon)]",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

export function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
}

export function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return <main className={cn("flex min-h-svh flex-1 flex-col bg-muted/30", className)} {...props} />
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 border-b border-sidebar-border p-3", className)} {...props} />
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-auto flex flex-col gap-2 border-t border-sidebar-border p-3", className)} {...props} />
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-1 flex-col gap-4 overflow-y-auto p-2", className)} {...props} />
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  const { state } = useSidebar()
  return (
    <div
      className={cn(
        "px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60",
        state === "collapsed" && "sr-only",
        className,
      )}
      {...props}
    />
  )
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-col gap-0.5", className)} {...props} />
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("group/menu-item relative", className)} {...props} />
}

export function SidebarMenuButton({
  className,
  isActive = false,
  tooltip,
  children,
  ...props
}: React.ComponentProps<"button"> & { isActive?: boolean; tooltip?: string }) {
  const { state, isMobile } = useSidebar()
  return (
    <button
      type="button"
      data-active={isActive}
      title={state === "collapsed" && !isMobile ? tooltip : undefined}
      className={cn(
        "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        state === "collapsed" && !isMobile && "justify-center px-0",
        "[&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  const { state, isMobile } = useSidebar()
  if (state === "collapsed" && !isMobile) return null
  return (
    <ul
      className={cn("ml-3.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2.5", className)}
      {...props}
    />
  )
}

export function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn(className)} {...props} />
}

export function SidebarMenuSubButton({
  className,
  isActive = false,
  children,
  ...props
}: React.ComponentProps<"button"> & { isActive?: boolean }) {
  return (
    <button
      type="button"
      data-active={isActive}
      className={cn(
        "flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        "[&>svg]:size-3.5 [&>svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarSeparator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("mx-2 my-1 border-sidebar-border", className)} {...props} />
}
