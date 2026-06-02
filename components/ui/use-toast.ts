'use client'

// This module used to hold a DUPLICATE copy of the toast store, with its own
// module-level state and listeners. The <Toaster/> mounted in app/layout.tsx
// reads from @/hooks/use-toast, so every toast fired through this file landed
// in a store nothing was rendering -- they were dropped silently. Re-exporting
// the single canonical store fixes toast visibility across the whole app.
export { useToast, toast, reducer } from '@/hooks/use-toast'
