"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type Props = {
  onConfirm: () => void
  size?: "default" | "sm"
  variant?: "default" | "outline" | "ghost"
  label?: string
  className?: string
}

/**
 * Delete-draft button with a confirmation dialog. The caller supplies the
 * actual clear logic via onConfirm (e.g. resetForm() + navigate, or clear
 * localStorage + refresh the list).
 */
export function DeleteDraftButton({ onConfirm, size = "default", variant = "ghost", label = "Delete", className }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn("text-red-600 hover:text-red-700 hover:bg-red-50", className)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes your in-progress idea and everything entered so far. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
          >
            Delete draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
