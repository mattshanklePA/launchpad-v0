"use client"
import Link from "next/link"
import Image from "next/image"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Button } from "../ui/button"
import { Rocket, Home } from "lucide-react"

export function FormHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-20 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/uspto-logo.png" alt="USPTO Logo" width={80} height={26} className="object-contain" />
          <div className="h-10 border-l border-gray-300" />
          <div className="flex items-center gap-3">
            <Rocket className="h-7 w-7 text-uspto-blue-primary" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-uspto-gray-text">LaunchPad</span>
              <p className="-mt-1 text-xs text-gray-500">USPTO AI Use Case Platform</p>
            </div>
          </div>
        </Link>
        <Button variant="outline" asChild className="ml-4 bg-transparent">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Link>
        </Button>
        <div className="flex-1 px-8">
          <ProgressBar />
        </div>
        <div>
          <Button variant="outline">Save & Exit</Button>
        </div>
      </div>
    </header>
  )
}
