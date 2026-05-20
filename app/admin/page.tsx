"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSession, hasAdminAccess, isAdmin, logout, ensureSeeded, type Session } from "@/lib/auth"
import { UserManagement } from "@/components/admin/user-management"
import { LogOut } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { clearSubmissions } from "@/lib/submissions"
import { FormConfigPanel } from "@/components/admin/form-config-panel"
import { DataProvider, useDataProvider } from "@/components/data-provider"
import { ComparisonView } from "@/components/admin/comparison-view"
import { DecisionCenter } from "@/components/admin/decision-center"
import { CheckCircle2, Circle, Scale, Sparkles } from "lucide-react"
import {
  FileText,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  LayoutGrid,
  TableIcon,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Header } from "@/components/layout/header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Real USPTO strategic objectives:
//   - 2022-2026 Strategic Plan — 5 agency-wide goals
//   - January 2025 AI Strategy — 5 AI-specific priorities
// Sources: uspto.gov/about-us/performance-and-planning/strategy-and-reporting
//          uspto.gov/initiatives/artificial-intelligence/ai-strategy
const mockOKRs = [
  // ───── USPTO 2022-2026 Strategic Plan ─────
  {
    id: 1,
    title: "Drive U.S. innovation and global competitiveness",
    description:
      "Expand outreach to under-represented innovators, strengthen U.S. leadership in emerging tech, and ensure broad access to the IP system.",
    category: "USPTO Strategic Goal",
    status: "active",
    progress: 45,
  },
  {
    id: 2,
    title: "Promote the efficient delivery of reliable IP rights",
    description:
      "Reduce pendency, improve first-action quality, and modernize the examination experience across patents and trademarks.",
    category: "USPTO Strategic Goal",
    status: "active",
    progress: 60,
  },
  {
    id: 3,
    title: "Promote IP protection against new and persistent threats",
    description:
      "Strengthen anti-counterfeiting capabilities, support enforcement, and defend the integrity of issued IP rights.",
    category: "USPTO Strategic Goal",
    status: "active",
    progress: 35,
  },
  {
    id: 4,
    title: "Bring innovation to impact for the public good",
    description:
      "Leverage the IP and innovation system to address national priorities including climate, public health, and equity.",
    category: "USPTO Strategic Goal",
    status: "active",
    progress: 30,
  },
  {
    id: 5,
    title: "Generate impactful employee and customer experiences",
    description:
      "Maximize agency operations to create rewarding experiences for the USPTO workforce and the applicants and public it serves.",
    category: "USPTO Strategic Goal",
    status: "active",
    progress: 50,
  },
  // ───── USPTO AI Strategy (January 2025) ─────
  {
    id: 6,
    title: "Advance IP policies for inclusive AI innovation",
    description:
      "Shape patent, trademark, and copyright policies that support U.S. AI leadership while remaining inclusive of all innovators.",
    category: "AI Strategy Priority",
    status: "active",
    progress: 40,
  },
  {
    id: 7,
    title: "Build AI capabilities through infrastructure and resources",
    description:
      "Invest in the compute, data, and tooling infrastructure required to deploy AI responsibly across USPTO operations.",
    category: "AI Strategy Priority",
    status: "active",
    progress: 25,
  },
  {
    id: 8,
    title: "Promote responsible AI use",
    description:
      "Ensure all AI systems include bias mitigation, explainability, and meaningful human oversight in line with federal AI guidance.",
    category: "AI Strategy Priority",
    status: "active",
    progress: 35,
  },
  {
    id: 9,
    title: "Develop AI expertise within the workforce",
    description:
      "Train USPTO staff across roles to evaluate, deploy, and oversee AI capabilities relevant to their work.",
    category: "AI Strategy Priority",
    status: "active",
    progress: 20,
  },
  {
    id: 10,
    title: "Collaborate with government and international partners on AI",
    description:
      "Coordinate with peer federal agencies, OMB, and international IP offices on AI governance and shared technical standards.",
    category: "AI Strategy Priority",
    status: "active",
    progress: 30,
  },
]

const mockDrafts = [
  {
    id: "draft-001",
    title: "NLP-Powered Prior Art Search Enhancement",
    submitter: "Jane Smith",
    department: "Patents",
    lastUpdated: "2025-03-15",
    status: "in_progress",
    completionRate: 85,
    step: 8,
    publicIndicator: "excluded",
    readinessScore: "ready" as const,
  },
  {
    id: "draft-002",
    title: "Automated Trademark Classification System",
    submitter: "Mike Johnson",
    department: "Trademarks",
    lastUpdated: "2025-02-28",
    status: "needs_review",
    completionRate: 100,
    step: 10,
    publicIndicator: "public",
    readinessScore: "ready" as const,
  },
  {
    id: "draft-003",
    title: "Predictive Analytics for Application Routing",
    submitter: "Sarah Davis",
    department: "OCIO",
    lastUpdated: "2025-01-22",
    status: "stalled",
    completionRate: 45,
    step: 5,
    publicIndicator: "public",
    readinessScore: "early_stage" as const,
  },
]

const mockSubmitted = [
  {
    id: "sub-001",
    title: "AI-Enhanced Patent Prior Art Search System",
    submitter: "Dr. Emily Chen",
    department: "Patents",
    submissionDate: "2024-01-10",
    status: "under_review",
    priority: "high",
    assignedReviewer: "John Martinez",
    estimatedReviewDate: "2024-01-25",
    routedTo: ["AI Governance Council", "Rally"],
    executiveSummary: "Proposes an NLP-powered enhancement to prior art search that would reduce examiner search time by 30-40% across 8,000+ patent examiners. Directly supports OKR 2.1 (examination efficiency) with a realistic 12-month implementation timeline. Feasibility is strong given existing Patent Center API infrastructure.",
  },
  {
    id: "sub-002",
    title: "Trademark Similarity Detection ML Model",
    submitter: "Alex Rodriguez",
    department: "Trademarks",
    submissionDate: "2024-01-08",
    status: "approved",
    priority: "medium",
    assignedReviewer: "Sarah Kim",
    estimatedReviewDate: "2024-01-20",
    routedTo: ["Rally"],
    executiveSummary: "ML-based trademark similarity detection to replace manual visual comparison. Targets 32 trademark examiners with estimated 2-hour daily time savings. Moderate implementation complexity with dependency on image processing infrastructure.",
  },
  {
    id: "sub-003",
    title: "Automated Application Routing Intelligence",
    submitter: "Michael Thompson",
    department: "OCIO",
    submissionDate: "2024-01-05",
    status: "in_development",
    priority: "high",
    assignedReviewer: "Lisa Wang",
    estimatedReviewDate: "2024-01-18",
    routedTo: ["AI Governance Council"],
    executiveSummary: "Predictive routing system to auto-assign incoming applications based on examiner expertise and workload. High strategic value for pendency reduction, but significant integration complexity with legacy assignment systems.",
  },
  {
    id: "sub-004",
    title: "Natural Language Processing for Legal Documents",
    submitter: "Jennifer Davis",
    department: "OGC",
    submissionDate: "2024-01-03",
    status: "deployed",
    priority: "low",
    assignedReviewer: "Robert Brown",
    estimatedReviewDate: "2024-01-15",
    routedTo: ["Rally", "AI Governance Council"],
    executiveSummary: "NLP tool for OGC attorneys to accelerate legal document review and extract key provisions. Narrow user base but high per-user impact. Successfully deployed with positive adoption metrics.",
  },
  {
    id: "sub-005",
    title: "Predictive Analytics Dashboard for Examination Workflow",
    submitter: "David Wilson",
    department: "Patents",
    submissionDate: "2023-12-28",
    status: "rejected",
    priority: "medium",
    assignedReviewer: "Amanda Taylor",
    estimatedReviewDate: "2024-01-12",
    routedTo: ["AI Governance Council"],
    executiveSummary: "Dashboard concept for examination workflow analytics. Rejected due to overlap with existing BI tools and insufficient differentiation from current reporting capabilities.",
  },
]

const pipelineStats = {
  totalSubmissions: 128,
  inProgress: 42,
  underReview: 23,
  approved: 15,
  deployed: 7,
  avgCompletionTime: "12.5 days",
  successRate: "78%",
}

// Wrapper that provides shared app data to the admin page. The actual page
// logic lives in AdminPageInner so it can call useDataProvider().
export default function AdminPage() {
  return (
    <DataProvider>
      <AdminPageInner />
    </DataProvider>
  )
}

function AdminPageInner() {
  const [okrs, setOKRs] = useState(mockOKRs)
  const [editingOKR, setEditingOKR] = useState<number | null>(null)
  const [newOKR, setNewOKR] = useState({ title: "", description: "", category: "" })
  const [draftsViewMode, setDraftsViewMode] = useState<"cards" | "table">("cards")
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set())
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set())
  const [showComparison, setShowComparison] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()
  const { loaded: dataLoaded, refetchSubmissions } = useDataProvider()

  // ─── Auth gate: redirect to /login if not an admin or reviewer ───
  useEffect(() => {
    ensureSeeded()
    const s = getSession()
    if (!hasAdminAccess(s)) {
      router.replace("/login?next=/admin")
      return
    }
    setSession(s)
    setAuthChecked(true)
  }, [router])

  // Re-hydrate the local submissions array whenever the cache changes.
  useEffect(() => {
    if (dataLoaded) {
      setSubmissions(getSubmissions())
      setHydrated(true)
    }
  }, [dataLoaded])

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  const toggleCompareSelect = (id: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 4) next.add(id)
      return next
    })
  }

  const clearCompareSelect = () => {
    setSelectedForCompare(new Set())
    setShowComparison(false)
  }

  // Submissions are hydrated from the shared cache via the dataLoaded effect
  // above — no separate mount hydration needed now that data lives in Supabase.

  // Shape submissions to match the UI's expected "draft" structure so the
  // existing rendering code works unchanged.
  const officeLabel = (o: string): string => {
    const map: Record<string, string> = {
      patents: "Patents",
      trademarks: "Trademarks",
      ocio: "OCIO",
      ogc: "OGC",
      other: "Other",
    }
    return map[o] || (o ? o : "Unknown")
  }
  const realDrafts = submissions.map((s) => ({
    id: s.id,
    title: s.formData.useCaseTitle || "Untitled idea",
    submitter: s.formData.submitterName || "Anonymous",
    department: officeLabel(s.formData.submitterOffice || ""),
    lastUpdated: new Date(s.submittedAt).toLocaleDateString(),
    status: "needs_review" as const,
    completionRate: 100,
    step: 11,
    publicIndicator: s.formData.publicIndicator || "",
    readinessScore: (s.formData.readinessScore || "needs_work") as
      | "ready"
      | "needs_work"
      | "early_stage",
  }))

  // Prefer real submissions; fall back to mocks only if there are none yet,
  // so the demo still shows visual content on a fresh browser.
  const drafts = hydrated && realDrafts.length > 0 ? realDrafts : mockDrafts

  const toggleSummary = (id: string) => {
    setExpandedSummaries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const getReadinessBadge = (score: string | undefined) => {
    switch (score) {
      case "ready":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            Ready
          </Badge>
        )
      case "needs_work":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
            Needs Work
          </Badge>
        )
      case "early_stage":
        return (
          <Badge className="bg-gray-100 text-gray-600 border-gray-300">
            Early Stage
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Not Assessed
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Draft (In Progress)
          </Badge>
        )
      case "needs_review":
        return (
          <Badge variant="default">
            <Eye className="w-3 h-3 mr-1" />
            Submitted for Vetting
          </Badge>
        )
      case "stalled":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Needs Input
          </Badge>
        )
      case "under_review":
        return (
          <Badge variant="secondary">
            <Eye className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "in_development":
        return (
          <Badge className="bg-blue-600">
            <Clock className="w-3 h-3 mr-1" />
            In Development
          </Badge>
        )
      case "deployed":
        return (
          <Badge className="bg-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Deployed
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      case "active":
        return (
          <Badge variant="default">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
      case "planning":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Planning
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPublicIndicatorBadge = (indicator: string) => {
    switch (indicator) {
      case "public":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Public
          </Badge>
        )
      case "excluded":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Excluded
          </Badge>
        )
      default:
        return <Badge variant="outline">Not Set</Badge>
    }
  }

  const addOKR = () => {
    if (newOKR.title && newOKR.description) {
      setOKRs([
        ...okrs,
        {
          id: Date.now(),
          ...newOKR,
          status: "planning",
          progress: 0,
        },
      ])
      setNewOKR({ title: "", description: "", category: "" })
    }
  }

  const deleteOKR = (id: number) => {
    setOKRs(okrs.filter((okr) => okr.id !== id))
  }

  // Don't render the dashboard until BOTH the auth check has run AND the
  // shared data cache has loaded — prevents a flash where toggles/submissions
  // render from an empty cache (everything appears "on" / no submissions).
  if (!authChecked || !dataLoaded) {
    return <div className="min-h-screen bg-gray-50" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-uspto-gray-text">Administration Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage USPTO OKRs, monitor the AI idea pipeline, and oversee vetting operations
            </p>
          </div>
          {session && (
            <div className="text-right text-sm flex flex-col items-end gap-2">
              <div>
                <p className="font-medium">{session.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{session.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-3 h-3 mr-1" />
                Sign out
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="okrs">USPTO OKRs</TabsTrigger>
            <TabsTrigger value="drafts">Submissions</TabsTrigger>
            <TabsTrigger value="submitted">Decision Center</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="formconfig">Form Config</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ideas Submitted</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pipelineStats.totalSubmissions}</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pipelineStats.inProgress}</div>
                  <p className="text-xs text-muted-foreground">In Vetting</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pipelineStats.successRate}</div>
                  <p className="text-xs text-muted-foreground">Ideas vetted to approved</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pipelineStats.avgCompletionTime}</div>
                  <p className="text-xs text-muted-foreground">Avg. vetting time</p>
                </CardContent>
              </Card>
            </div>

            {/* Pipeline Funnel Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>Idea Pipeline Funnel</CardTitle>
                <CardDescription>Flow of ideas from submission to production</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                  {/* Ideas Submitted */}
                  <div className="flex-1 min-w-[140px]">
                    <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">{pipelineStats.totalSubmissions}</div>
                      <div className="text-sm font-medium text-blue-600">Ideas Submitted</div>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  
                  {/* In Vetting */}
                  <div className="flex-1 min-w-[140px]">
                    <div className="bg-blue-200 border-2 border-blue-400 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-800">{pipelineStats.inProgress}</div>
                      <div className="text-sm font-medium text-blue-700">In Vetting</div>
                      <div className="text-xs text-blue-600 mt-1">{Math.round((pipelineStats.inProgress / pipelineStats.totalSubmissions) * 100)}% of submitted</div>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  
                  {/* Vetted & Submitted */}
                  <div className="flex-1 min-w-[140px]">
                    <div className="bg-blue-300 border-2 border-blue-500 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-900">{pipelineStats.underReview}</div>
                      <div className="text-sm font-medium text-blue-800">Vetted & Submitted</div>
                      <div className="text-xs text-blue-700 mt-1">{Math.round((pipelineStats.underReview / pipelineStats.inProgress) * 100)}% of in vetting</div>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  
                  {/* Approved */}
                  <div className="flex-1 min-w-[140px]">
                    <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-700">{pipelineStats.approved}</div>
                      <div className="text-sm font-medium text-green-600">Approved</div>
                      <div className="text-xs text-green-500 mt-1">{Math.round((pipelineStats.approved / pipelineStats.underReview) * 100)}% of vetted</div>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  
                  {/* In Production */}
                  <div className="flex-1 min-w-[140px]">
                    <div className="bg-green-200 border-2 border-green-500 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-800">{pipelineStats.deployed}</div>
                      <div className="text-sm font-medium text-green-700">In Production</div>
                      <div className="text-xs text-green-600 mt-1">{Math.round((pipelineStats.deployed / pipelineStats.approved) * 100)}% of approved</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New idea: AI-Powered Patent Search</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Vetting complete: Trademark Classification</p>
                        <p className="text-xs text-muted-foreground">5 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">OKR updated: IT Infrastructure Modernization</p>
                        <p className="text-xs text-muted-foreground">1 day ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Patents</span>
                      <span className="text-sm font-medium">45 submissions</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Trademarks</span>
                      <span className="text-sm font-medium">32 submissions</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">OCIO</span>
                      <span className="text-sm font-medium">28 submissions</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">OGC</span>
                      <span className="text-sm font-medium">12 submissions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="okrs" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">USPTO OKRs Management</h2>
              <Button onClick={() => setEditingOKR(-1)}>
                <Plus className="w-4 h-4 mr-2" />
                Add New OKR
              </Button>
            </div>

            {editingOKR === -1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New OKR</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="okr-title">Title</Label>
                    <Input
                      id="okr-title"
                      value={newOKR.title}
                      onChange={(e) => setNewOKR({ ...newOKR, title: e.target.value })}
                      placeholder="Enter OKR title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="okr-description">Description</Label>
                    <Textarea
                      id="okr-description"
                      value={newOKR.description}
                      onChange={(e) => setNewOKR({ ...newOKR, description: e.target.value })}
                      placeholder="Enter OKR description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="okr-category">Category</Label>
                    <Input
                      id="okr-category"
                      value={newOKR.category}
                      onChange={(e) => setNewOKR({ ...newOKR, category: e.target.value })}
                      placeholder="e.g., Operational Excellence"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addOKR}>Add OKR</Button>
                    <Button variant="outline" onClick={() => setEditingOKR(null)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {okrs.map((okr) => (
                <Card key={okr.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{okr.title}</CardTitle>
                        <CardDescription className="mt-2">{okr.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(okr.status)}
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteOKR(okr.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{okr.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-uspto-blue-primary h-2 rounded-full"
                          style={{ width: `${okr.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground">Category: {okr.category}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="drafts" className="space-y-6">
            {showComparison && selectedForCompare.size >= 2 && (
              <ComparisonView
                submissions={submissions.filter((s) => selectedForCompare.has(s.id))}
                onClose={clearCompareSelect}
              />
            )}
            {selectedForCompare.size > 0 && !showComparison && (
              <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/40 bg-primary/5">
                <p className="text-sm">
                  <span className="font-semibold">{selectedForCompare.size}</span> selected for comparison
                  {selectedForCompare.size === 1 && " — pick 1 more to compare"}
                  {selectedForCompare.size >= 4 && " (max 4)"}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={clearCompareSelect}>
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowComparison(true)}
                    disabled={selectedForCompare.size < 2}
                  >
                    <Scale className="w-4 h-4 mr-2" />
                    Compare {selectedForCompare.size}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Idea Pipeline</h2>
              <div className="flex gap-2">
                <div className="flex border rounded-md">
                  <Button
                    variant={draftsViewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDraftsViewMode("cards")}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Card View
                  </Button>
                  <Button
                    variant={draftsViewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDraftsViewMode("table")}
                    className="rounded-l-none"
                  >
                    <TableIcon className="w-4 h-4 mr-2" />
                    Table View
                  </Button>
                </div>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              </div>
            </div>

            {draftsViewMode === "cards" ? (
              <div className="grid gap-4">
                {drafts.map((draft) => (
                  <Card key={draft.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{draft.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Submitter: {draft.submitter}</span>
                            <span>Department: {draft.department}</span>
                            <span>Last Updated: {draft.lastUpdated}</span>
                            <span>Step {draft.step}/9</span>
                            <div className="flex items-center gap-1">
                              <span>Classification:</span>
                              {getPublicIndicatorBadge(draft.publicIndicator)}
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Completion Rate</span>
                              <span>{draft.completionRate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${draft.completionRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {getReadinessBadge(draft.readinessScore)}
                          {getStatusBadge(draft.status)}
                          {submissions.some((s) => s.id === draft.id) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCompareSelect(draft.id)}
                              title={selectedForCompare.has(draft.id) ? "Remove from comparison" : "Select for comparison"}
                            >
                              {selectedForCompare.has(draft.id) ? (
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Title</TableHead>
                        <TableHead>Submitter</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Current Step</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Readiness</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drafts.map((draft) => (
                        <TableRow key={draft.id}>
                          <TableCell className="font-medium">
                            <div className="max-w-[280px] truncate" title={draft.title}>
                              {draft.title}
                            </div>
                          </TableCell>
                          <TableCell>{draft.submitter}</TableCell>
                          <TableCell>{draft.department}</TableCell>
                          <TableCell>{getStatusBadge(draft.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${draft.completionRate}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-muted-foreground">{draft.completionRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{draft.step}/9</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{draft.lastUpdated}</TableCell>
                          <TableCell>{getPublicIndicatorBadge(draft.publicIndicator)}</TableCell>
                          <TableCell>{getReadinessBadge(draft.readinessScore)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="submitted" className="space-y-6">
            <DecisionCenter />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Platform Analytics</h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Submission Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Submission volume over time chart would go here</p>
                  <div className="h-32 bg-gray-100 rounded mt-4 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Completion Rates by Step</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => (
                      <div key={step} className="flex justify-between items-center">
                        <span className="text-sm">Step {step}</span>
                        <span className="text-sm font-medium">{Math.floor(Math.random() * 30 + 70)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="formconfig" className="space-y-6">
            <h2 className="text-2xl font-bold">Form Configuration</h2>
            <p className="text-sm text-muted-foreground -mt-4 max-w-3xl">
              Turn individual wizard fields on or off so the form captures exactly the data your
              organization needs — no more, no less. Hidden fields are also excluded from the
              readiness check on the final step. Core fields and DoC-mandated AI risk questions
              are locked on by design.
            </p>
            <FormConfigPanel />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold">System Settings</h2>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Default Submission Timeout (days)</Label>
                    <Input type="number" defaultValue="30" className="mt-1" />
                  </div>
                  <div>
                    <Label>Scout AI Model</Label>
                    <Input defaultValue="claude-sonnet-4-5" className="mt-1" />
                  </div>
                  <div>
                    <Label>Rally Integration Endpoint</Label>
                    <Input defaultValue="https://rally1.rallydev.com/..." className="mt-1" />
                  </div>
                  <Button>Save Settings</Button>
                </CardContent>
              </Card>

              {isAdmin(session) ? (
                <UserManagement />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      User management is restricted to Admin role. Contact your administrator to request changes.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Demo data controls — only useful during the 5/20 demo prep */}
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    Demo Data
                  </CardTitle>
                  <CardDescription>
                    Pre-loaded sample submissions across business units (Patents, Trademarks, OCIO, HR, OGC) for the
                    Decision Center demo. Use these controls if the seed didn't load or you want a clean slate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        // Clear in Supabase, then trigger the server-side seed
                        // which inserts the 5 demo records into the now-empty table.
                        await clearSubmissions()
                        await fetch("/api/seed", { method: "POST" })
                        window.location.reload()
                      }}
                    >
                      Reload Demo Submissions
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!confirm("Clear ALL submissions in the database (visible to every visitor)? This cannot be undone.")) return
                        await clearSubmissions()
                        window.location.reload()
                      }}
                    >
                      Clear All Submissions
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reload wipes the Supabase submissions table and re-inserts the 5 demo records. Clear All wipes
                    everything. Both actions affect what every visitor to the demo site sees.
                  </p>
                </CardContent>
              </Card>
            </div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
