// Shared layout constants for the Keystone shell (RD-0, issue #201).

// Pages set their own primary column width inside the shell's content frame;
// this is the shared cap the redesign mocks use (dashboard, reviewer
// screens). Nothing consumes it yet — later RD issues will.
export const PRIMARY_COLUMN_CLASS = "max-w-[1060px]"

// Nav item text size from the sidebar mock (12.5px Hanken, not the sidebar
// primitive's own default text-sm) — shared between dashboard-shell.tsx and
// entity-tree.tsx so both sets of sidebar links match.
export const SIDEBAR_ITEM_TEXT_CLASS = "text-[12.5px]"
