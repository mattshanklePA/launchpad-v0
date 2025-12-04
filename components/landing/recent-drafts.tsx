"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileEdit, Copy, Trash2, Info } from "lucide-react"
import { useEffect, useState } from "react"
import { getAllDrafts, deleteDraft, duplicateDraft, type SavedDraft } from "@/lib/draft-storage"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

export function RecentDrafts() {
  const [drafts, setDrafts] = useState<SavedDraft[]>([])
  const router = useRouter()

  useEffect(() => {
    setDrafts(getAllDrafts())
  }, [])

  const handleEdit = (draft: SavedDraft) => {
    localStorage.setItem("aid-form-data", JSON.stringify(draft.formData))
    localStorage.setItem("aid-current-step", draft.currentStep.toString())
    localStorage.setItem("aid-current-draft-id", draft.id)
    router.push("/submit")
  }

  const handleDuplicate = (id: string) => {
    const newDraft = duplicateDraft(id)
    if (newDraft) {
      setDrafts(getAllDrafts())
    }
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this draft?")) {
      deleteDraft(id)
      setDrafts(getAllDrafts())
    }
  }

  if (drafts.length === 0) {
    return null
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Drafts</CardTitle>
        <CardDescription>Continue working on your saved submissions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>
            You have {drafts.length} draft{drafts.length !== 1 ? "s" : ""} in progress!
          </AlertTitle>
          <AlertDescription>Complete your submissions to move them to the review stage.</AlertDescription>
        </Alert>
        <ul className="space-y-4">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
              <div>
                <p className="font-semibold text-uspto-blue-primary">{draft.title}</p>
                <p className="text-sm text-muted-foreground">
                  Last updated: {format(new Date(draft.lastUpdated), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(draft)}>
                  <FileEdit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDuplicate(draft.id)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(draft.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
