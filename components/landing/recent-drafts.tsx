import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileEdit, Copy, Trash2, Info } from "lucide-react"

const drafts = [
  {
    title: "NLP-Powered Prior Art Search",
    updated: "2 days ago",
    status: "In Progress",
    quality: "Good",
  },
  {
    title: "Automated Trademark Image Classification",
    updated: "5 days ago",
    status: "In Progress",
    quality: "Fair",
  },
  {
    title: "Predictive Analytics for Application Routing",
    updated: "1 week ago",
    status: "Needs More Detail",
    quality: "Poor",
  },
]

const getQualityBadgeVariant = (quality: string) => {
  switch (quality) {
    case "Good":
      return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
    case "Fair":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200"
    case "Poor":
      return "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
    default:
      return "secondary"
  }
}

export function RecentDrafts() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Your Ideas in Progress</CardTitle>
        <CardDescription>Continue refining your AI ideas.</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>You have {drafts.length} ideas in progress!</AlertTitle>
          <AlertDescription>Complete the vetting steps to submit your ideas for review.</AlertDescription>
        </Alert>
        <ul className="space-y-4">
          {drafts.map((draft) => (
            <li key={draft.title} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
              <div>
                <p className="font-semibold text-uspto-blue-primary">{draft.title}</p>
                <p className="text-sm text-muted-foreground">Last updated: {draft.updated}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getQualityBadgeVariant(draft.quality)}>
                  {draft.quality}
                </Badge>
                <Button variant="ghost" size="icon">
                  <FileEdit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
