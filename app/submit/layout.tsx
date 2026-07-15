"use client"

import type React from "react"
import { FormProvider } from "@/context/form-context"
import { RequireAuth } from "@/components/auth/require-auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { getSession } from "@/lib/auth"
import { getDashboardScope } from "@/lib/dashboard/scope"

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireAuth>
      <FormProvider>
        <DashboardShell
          baseScope={getDashboardScope(getSession())}
          hierarchy={{ bureaus: [] }}
          selection={null}
          onSelect={() => {}}
          breadcrumb="Submit an idea"
        >
          {children}
        </DashboardShell>
      </FormProvider>
    </RequireAuth>
  )
}
