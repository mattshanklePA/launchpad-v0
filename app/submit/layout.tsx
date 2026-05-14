"use client"

import type React from "react"
import { FormProvider } from "@/context/form-context"
import { FormHeader } from "@/components/layout/form-header"
import { RequireAuth } from "@/components/auth/require-auth"

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireAuth>
      <FormProvider>
        <div className="relative flex min-h-screen flex-col">
          <FormHeader />
          <main className="flex-1">{children}</main>
        </div>
      </FormProvider>
    </RequireAuth>
    )
}
