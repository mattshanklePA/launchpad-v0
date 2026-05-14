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
  getSession,
  type User,
  type Role,
} from "@/lib/auth"

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
  const [formPassword, setFormPassword] = useState("")
  const { toast } = useToast()

  const session = typeof window !== "undefined" ? getSession() : null

  const refresh = () => setUsers(getAllUsers())

  useEffect(() => {
    refresh()
  }, [])

  const handleAdd = () => {
    const result = addUser({
      email: formEmail,
      name: formName,
      role: formRole,
      password: formPassword,
    })
    if ("error" in result) {
      toast({ variant: "destructive", title: "Could not add user", description: result.error })
      return
    }
    toast({ title: "User added", description: `${result.name} (${result.role})` })
    setFormEmail("")
    setFormName("")
    setFormRole("submitter")
    setFormPassword("")
    setShowAddForm(false)
    refresh()
  }

  const handleDelete = (user: User) => {
    if (!confirm(`Delete user ${user.name} (${user.email})?`)) return
    const result = removeUser(user.id)
    if (!result.ok) {
      toast({ variant: "destructive", title: "Could not delete", description: result.error })
      return
    }
    toast({ title: "User removed", description: `${user.name} removed.` })
    refresh()
  }

  const handleRoleChange = (user: User, newRole: Role) => {
    if (newRole === user.role) return
    const result = updateUserRole(user.id, newRole)
    if (!result.ok) {
      toast({ variant: "destructive", title: "Could not update role", description: result.error })
      return
    }
    toast({ title: "Role updated", description: `${user.name} is now ${newRole}.` })
    refresh()
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
          Manage who has access to admin features. Submitters can use the wizard without an account.
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
                <Label htmlFor="newRole">Role</Label>
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
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border rounded-lg"
              >
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
            )
          })}
          {users.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}
        </div>
      </CardContent>
    </Card>
  )
}
