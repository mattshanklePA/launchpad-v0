import type { FormData } from "./steps"

export interface SavedDraft {
  id: string
  title: string
  formData: FormData
  lastUpdated: string
  currentStep: number
}

const DRAFTS_STORAGE_KEY = "launchpad-saved-drafts"

export function saveDraft(draft: Omit<SavedDraft, "id" | "lastUpdated">): SavedDraft {
  const drafts = getAllDrafts()
  const newDraft: SavedDraft = {
    ...draft,
    id: crypto.randomUUID(),
    lastUpdated: new Date().toISOString(),
  }

  drafts.push(newDraft)
  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
  return newDraft
}

export function updateDraft(id: string, updates: Partial<Omit<SavedDraft, "id">>): void {
  const drafts = getAllDrafts()
  const index = drafts.findIndex((d) => d.id === id)

  if (index !== -1) {
    drafts[index] = {
      ...drafts[index],
      ...updates,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
  }
}

export function getAllDrafts(): SavedDraft[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(DRAFTS_STORAGE_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function getDraft(id: string): SavedDraft | null {
  const drafts = getAllDrafts()
  return drafts.find((d) => d.id === id) || null
}

export function deleteDraft(id: string): void {
  const drafts = getAllDrafts()
  const filtered = drafts.filter((d) => d.id !== id)
  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(filtered))
}

export function duplicateDraft(id: string): SavedDraft | null {
  const draft = getDraft(id)
  if (!draft) return null

  const newDraft = saveDraft({
    title: `${draft.title} (Copy)`,
    formData: draft.formData,
    currentStep: draft.currentStep,
  })

  return newDraft
}

export function clearCurrentDraft(): void {
  localStorage.removeItem("aid-current-draft-id")
  localStorage.removeItem("aid-form-data")
  localStorage.removeItem("aid-current-step")
}
