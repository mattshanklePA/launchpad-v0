"use client"

import type React from "react"
import { FormProvider } from "@/context/form-context"
import { FormHeader } from "@/components/layout/form-header"

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FormProvider>
      <div className="relative flex min-h-screen flex-col">
        <FormHeader />
        <main className="flex-1">{children}</main>
      </div>
    </FormProvider>
  )
}
