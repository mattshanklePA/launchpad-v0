// Submission persistence helpers (localStorage)
// Stores the most recent submitted ideas so they can be re-shown
// in Recent Drafts / admin pipeline without a backend.

import type { FormData } from "@/lib/steps"

const STORAGE_KEY = "launchpad-submissions"
const MAX_SUBMISSIONS = 5

export type Submission = {
  id: string
  submittedAt: string
  formData: FormData
}

function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getSubmissions(): Submission[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error("Failed to read submissions from localStorage:", error)
    return []
  }
}

export function saveSubmission(formData: FormData): Submission {
  const submission: Submission = {
    id: generateId(),
    submittedAt: new Date().toISOString(),
    formData,
  }

  if (typeof window === "undefined") return submission

  try {
    const existing = getSubmissions()
    const updated = [submission, ...existing].slice(0, MAX_SUBMISSIONS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to save submission to localStorage:", error)
  }

  return submission
}

export function clearSubmissions(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear submissions:", error)
  }
}
