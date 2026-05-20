"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { UserPlus, Trash2, Shield, Eye, User as UserIcon } from "lucide-react"
import {
  getAllUsers,
  addUser,
  removeUser,
  updateUserRole,
  updateUserProfile,
  getSession,
  type User,
  type Role,
  type JobRole,
  type BusinessUnit,
} from "@/lib/auth"
import { useDataProvider } from "@/components/data-provider"

// Display labels for the USPTO profile fields. Kept here (rather than imported
// from a shared util) so this component is fully self-contained.
const JOB_ROLE_OPTIONS: { value: JobRole; label: string }[] = [
  { value: "", label: "— Not set —" },
  { value: "patent_examiner", label: "Patent Examiner" },
  { value: "trademark_examiner", label: "Trademark Examiner" },
  { value: "manager", label: "Manager" },
  { value: "it_staff", label: "IT Staff" },
  { value: "product_owner", label: "Product Owner" },
  { value: "lead_product_owner", label: "Lead Product Owner" },
  { value: "developer", label: "Developer" },
  { value: "other", label: "Other" },
]

const BUSINESS_UNIT_OPTIONS: { value: BusinessUnit; label: string }[] = [
  { value: "", label: "— Not set —" },
  { value: "patents", label: "Patents" },
  { value: "trademarks", label: "Trademarks" },
  { value: "ocio", label: "OCIO" },
  { value: "ocfo", label: "OCFO" },
  { value: "ogc", label: "OGC" },
  { value: "opia", label: "OPIA" },
  { value: "hr", label: "Human Resources" },
  { value: "other", label: "Other" },
]

function jobRoleLabel(v?: JobRole): string {
  return JOB_ROLE_OPTIONS.find((o) => o.value === (v || ""))?.label || "—"
}
function businessUnitLabel(v?: BusinessUnit): string {
  return BUSINESS_UNIT_OPTIONS.find((o) => o.value === (v || ""))?.label || "—"
}

function roleBadge(role: Role) {
  switch (role) {
    case "admin":
      return (
        <Badge className="bg-uspto-blue-primary text-white">
          <Shield className="w-3 h-3 mr-1" /> Admin
        </Badge>
      )
    case "reviewer":
      return (
        <Badge variant="secondary">
          <Eye className="w-3 h-3 mr-1" /> Reviewer
        </Badge>
      )
    case "submitter":
      return (
        <Badge variant="outline">
          <UserIcon className="w-3 h-3 mr-1" /> Submitter
        </Badge>
      )
  }
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formEmail, setFormEmail] = useState("")
  const [formName, setFormName] = useState("")
  const [formRole, setFormRole] = useState<Role>("submitter")
  const [formJobRole, setFormJobRole] = useState<JobRole>("")
  const [formBusinessUnit, setFormBusinessUnit] = useState<BusinessUnit>("")
  const [formPassword, setFormPassword] = useState("")
  const { toast } = useToast()
  const { refetchUsers } = useDataProvider()

  const session = typeof window !== "undefined" ? getSession() : null

  // Re-render the local users array from the shared cache.
  const refresh = async () => {
    await refetchUsers()
    setUsers(getAllUsers())
  }

  useEffect(() => {
    setUsers(getAllUsers())
  }, [])

  const handleAdd = async () => {
    const result = await addUser({
      email: formEmail,
      name: formName,
      role: formRole,
      password: formPassword,
      jobRole: formJobRole,
      businessUnit: formBusinessUnit,
    })
    if ("error" in result) {
      toast({ variant: "destructive", title: "Could not add user", description: result.error })
      return
    }
    toast({ title: "User added", description: `${result.name} (${result.role})` })
    setFormEmail("")
    setFormName("")
    setFormRole("submitter")
    setFormJobRole("")
    setFormBusinessUnit("")
    setFormPassword("")
    setShowAddForm(false)
    await refresh()
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user ${user.name} (${user.email})?`)) return
    const result = await removeUser(user.id)
    if (!result.ok) {
      toast({ variant: "destructive", title: "Could not delete", description: result.error })
      return
    }
    toast({ title: "User removed", description: `${user.name} removed.` })
    await refresh()
  }

  const handleRoleChange = async (user: User, newRole: Role) => {
    if (newRole === user.role) return
    const result = await updateUserRole(user.id, newRole)
    if (!result.ok) {
      toast({ variant: "destructive", title: "Could not update role", description: result.error })
      return
    }
    toast({ title: "Role updated", description: `${user.name} is now ${newRole}.` })
    await refresh()
  }

  const handleJobRoleChange = async (user: User, newJobRole: JobRole) => {
    if (newJobRole === (user.jobRole || "")) return
    const result = await updateUserProfile(user.id, { jobRole: newJobRole })
    if (!result.ok) {
      toast({ variant: "destructive", title: "Could not update job role", description: result.error })
      return
    }
    toast({
      title: "Profile updated",
      description: `${user.name}: ${jobRoleLabel(newJobRole)}`,
    })
    await refresh()
  }

  const handleBusinessUnitChange = async (user: User, newBu: BusinessUnit) => {
    if (newBu === (user.businessUnit || "")) return
    const result = await updateUserProfile(user.id, { businessUnit: newBu })
    if (!result.ok) {
      toast({ variant: "destructive", title: "Could not update business unit", description: result.error })
      return
    }
    toast({
      title: "Profile updated",
      description: `${user.name}: ${businessUnitLabel(newBu)}`,
    })
    await refresh()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
            <UserPlus className="w-4 h-4 mr-2" />
            {showAddForm ? "Cancel" : "Add User"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Manage who has access to admin features. Job Role and Business Unit auto-fill the
          submitter step of the wizard so people don't have to retype it.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="newName">Name</Label>
                <Input id="newName" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newEmail">Email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="jane.smith@uspto.gov"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newRole">Access role</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as Role)}>
                  <SelectTrigger id="newRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitter">Submitter</SelectItem>
                    <SelectItem value="reviewer">Reviewer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword">Temporary password</Label>
                <Input
                  id="newPassword"
                  type="text"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newJobRole">Job role</Label>
                <Select
                  value={formJobRole || "_none"}
                  onValueChange={(v) => setFormJobRole(v === "_none" ? "" : (v as JobRole))}
                >
                  <SelectTrigger id="newJobRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value || "_none"} value={o.value || "_none"}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="newBusinessUnit">Business unit</Label>
                <Select
                  value={formBusinessUnit || "_none"}
                  onValueChange={(v) => setFormBusinessUnit(v === "_none" ? "" : (v as BusinessUnit))}
                >
                  <SelectTrigger id="newBusinessUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_UNIT_OPTIONS.map((o) => (
                      <SelectItem key={o.value || "_none"} value={o.value || "_none"}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAdd}>Create User</Button>
          </div>
        )}

        <div className="space-y-2">
          {users.map((u) => {
            const isMe = session?.userId === u.id
            const isPrimaryAdmin = u.email === "matt.shankle@uspto.gov"
            return (
              <div
                key={u.id}
                className="flex flex-col gap-3 p-3 border rounded-lg"
              >
                {/* Top row: name / access role / delete */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{u.name}</p>
                      {isMe && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                      {isPrimaryAdmin && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {roleBadge(u.role)}
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u, v as Role)}
                      disabled={isPrimaryAdmin}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitter">Submitter</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(u)}
                      disabled={isPrimaryAdmin || isMe}
                      title={isPrimaryAdmin ? "Cannot delete primary admin" : isMe ? "Cannot delete yourself" : "Delete user"}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Profile row: job role + business unit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Job role</Label>
                    <Select
                      value={u.jobRole || "_none"}
                      onValueChange={(v) =>
                        handleJobRoleChange(u, v === "_none" ? "" : (v as JobRole))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_ROLE_OPTIONS.map((o) => (
                          <SelectItem key={o.value || "_none"} value={o.value || "_none"}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Business unit</Label>
                    <Select
                      value={u.businessUnit || "_none"}
                      onValueChange={(v) =>
                        handleBusinessUnitChange(u, v === "_none" ? "" : (v as BusinessUnit))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_UNIT_OPTIONS.map((o) => (
                          <SelectItem key={o.value || "_none"} value={o.value || "_none"}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )
          })}
          {users.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}
        </div>
      </CardContent>
    </Card>
  )
}
