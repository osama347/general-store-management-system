"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "@/contexts/LocationContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, UserPlus, Users, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle, Pencil, Search, Filter } from "lucide-react"
import { 
  getMyStaff, 
  createStaff, 
  updateStaff,
  transferStaff,
  type StaffMember 
} from "@/lib/services/staff-service"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function StaffPage() {
  const { profile, loading: authLoading } = useAuth()
  const { locations, isLoading: locationLoading } = useLocation()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [newStaffForm, setNewStaffForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "store-manager" as "admin" | "store-manager" | "warehouse-manager",
    location_id: "",
    phone: "",
  })

  const [editStaffForm, setEditStaffForm] = useState({
    full_name: "",
    role: "store-manager" as "admin" | "store-manager" | "warehouse-manager",
    phone: "",
    location_id: "",
  })

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    try {
      setLoading(true)
      const staffData = await getMyStaff()
      setStaff(staffData)
    } catch (error: any) {
      console.error("Error loading staff:", error)
      toast.error(error.message || "Failed to load staff")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStaff = async () => {
    if (!newStaffForm.email || !newStaffForm.password || !newStaffForm.full_name || !newStaffForm.location_id) {
      toast.error("Please fill in all required fields")
      return
    }

    if (newStaffForm.password.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }

    try {
      setSubmitting(true)
      await createStaff({
        email: newStaffForm.email,
        password: newStaffForm.password,
        full_name: newStaffForm.full_name,
        role: newStaffForm.role,
        location_id: parseInt(newStaffForm.location_id),
        phone: newStaffForm.phone || undefined,
      })

      toast.success("Staff member created! They will receive a confirmation email.")
      setDialogOpen(false)
      setNewStaffForm({
        email: "",
        password: "",
        full_name: "",
        role: "store-manager",
        location_id: "",
        phone: "",
      })
      await loadStaff()
    } catch (error: any) {
      console.error("Error creating staff:", error)
      toast.error(error.message || "Failed to create staff member")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditStaff = async () => {
    if (!selectedStaff) return

    try {
      setSubmitting(true)

      // Check if location changed
      const locationChanged = 
        editStaffForm.location_id && 
        parseInt(editStaffForm.location_id) !== selectedStaff.location_id

      if (locationChanged) {
        await transferStaff(selectedStaff.id, parseInt(editStaffForm.location_id))
      }

      // Update other fields
      await updateStaff(selectedStaff.id, {
        full_name: editStaffForm.full_name,
        role: editStaffForm.role,
        phone: editStaffForm.phone || null,
      })

      toast.success("Staff member updated successfully")
      setEditDialogOpen(false)
      setSelectedStaff(null)
      await loadStaff()
    } catch (error: any) {
      console.error("Error updating staff:", error)
      toast.error(error.message || "Failed to update staff")
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember)
    setEditStaffForm({
      full_name: staffMember.full_name || "",
      role: staffMember.role as any,
      phone: staffMember.phone || "",
      location_id: staffMember.location_id?.toString() || "",
    })
    setEditDialogOpen(true)
  }

  const getInitials = (name: string | null) => {
    if (!name) return "??"
    const names = name.split(" ")
    return names.map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  // Filter staff based on search and filters
  const filteredStaff = staff.filter((member) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      searchQuery === "" ||
      member.full_name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower)

    // Role filter
    const matchesRole = roleFilter === "all" || member.role === roleFilter

    // Location filter
    const matchesLocation = 
      locationFilter === "all" || 
      member.location_id?.toString() === locationFilter

    // Status filter
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && member.is_active) ||
      (statusFilter === "inactive" && !member.is_active)

    return matchesSearch && matchesRole && matchesLocation && matchesStatus
  })

  // Show loading state
  if (authLoading || loading || locationLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  // Only allow admins to access this page - check AFTER loading completes
  if (profile?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
        <Card className="max-w-md border-2 border-red-200 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Access Denied</h2>
            <p className="text-gray-600 text-center">
              Only administrators can access staff management
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-10 bg-white border-b-4 border-teal-200 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <UserPlus className="h-3.5 w-3.5" />
                  Manage your team members across all locations
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              
          <DialogContent className="max-w-lg">
            <DialogHeader className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 text-white p-6 -m-6 mb-4 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-white text-xl">Add New Staff Member</DialogTitle>
                  <DialogDescription className="text-white/90">
                    Create a new staff member account. They can sign in immediately.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-teal-600" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="staff@example.com"
                  value={newStaffForm.email}
                  onChange={(e) =>
                    setNewStaffForm({ ...newStaffForm, email: e.target.value })
                  }
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newStaffForm.password}
                  onChange={(e) =>
                    setNewStaffForm({ ...newStaffForm, password: e.target.value })
                  }
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  Full Name *
                </Label>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  value={newStaffForm.full_name}
                  onChange={(e) =>
                    setNewStaffForm({ ...newStaffForm, full_name: e.target.value })
                  }
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  placeholder="+1234567890"
                  value={newStaffForm.phone}
                  onChange={(e) =>
                    setNewStaffForm({ ...newStaffForm, phone: e.target.value })
                  }
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-semibold text-gray-700">
                  Role *
                </Label>
                <Select
                  value={newStaffForm.role}
                  onValueChange={(value: any) =>
                    setNewStaffForm({ ...newStaffForm, role: value })
                  }
                >
                  <SelectTrigger className="border-2 border-teal-200 h-11 focus:ring-teal-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="store-manager">Store Manager</SelectItem>
                    <SelectItem value="warehouse-manager">Warehouse Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Assign to Location *
                </Label>
                <Select
                  value={newStaffForm.location_id}
                  onValueChange={(value) =>
                    setNewStaffForm({ ...newStaffForm, location_id: value })
                  }
                >
                  <SelectTrigger className="border-2 border-teal-200 h-11 focus:ring-teal-500">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.location_id} value={loc.location_id.toString()}>
                        {loc.name} ({loc.location_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className="border-2 border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateStaff} 
                disabled={submitting}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

          {/* Staff List Card */}
          <Card className="border-2 border-teal-100 shadow-lg">
            <CardContent className="pt-6">
              {/* Search and Filters Row */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-2 border-teal-200 h-11 pl-10 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                {/* Role Filter */}
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="border-2 border-teal-200 h-11 w-full md:w-[180px] focus:ring-teal-500">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="store-manager">Store Manager</SelectItem>
                    <SelectItem value="warehouse-manager">Warehouse Manager</SelectItem>
                  </SelectContent>
                </Select>

                {/* Location Filter */}
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="border-2 border-teal-200 h-11 w-full md:w-[200px] focus:ring-teal-500">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.location_id} value={loc.location_id.toString()}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-2 border-teal-200 h-11 w-full md:w-[140px] focus:ring-teal-500">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {/* Add Staff Button */}
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg h-11 w-full md:w-auto"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>

              {/* Results Count */}
              <div className="mb-4 text-sm text-gray-600">
                Showing <span className="font-semibold text-teal-600">{filteredStaff.length}</span> of <span className="font-semibold">{staff.length}</span> staff members
              </div>

              {filteredStaff.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">
                    {staff.length === 0 ? "No staff members yet" : "No staff members found"}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {staff.length === 0 
                      ? "Get started by adding your first team member" 
                      : "Try adjusting your search or filters"}
                  </p>
                  {staff.length === 0 && (
                    <Button 
                      onClick={() => setDialogOpen(true)}
                      className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Staff
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-teal-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50 border-b-2 border-teal-200 hover:bg-gradient-to-r">
                        <TableHead className="font-bold text-gray-700">Staff Member</TableHead>
                        <TableHead className="font-bold text-gray-700">Role</TableHead>
                        <TableHead className="font-bold text-gray-700">Location</TableHead>
                        <TableHead className="font-bold text-gray-700">Contact</TableHead>
                        <TableHead className="font-bold text-gray-700">Status</TableHead>
                        <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((member) => (
                        <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.full_name}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {member.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{member.location.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {member.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        {member.hire_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{new Date(member.hire_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.is_active ? (
                        <Badge className="gap-1 bg-teal-100 text-teal-700 border-teal-200 border-2">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 border-2">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(member)}
                        className="hover:bg-teal-50 hover:text-teal-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Staff Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 text-white p-6 -m-6 mb-4 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl">Edit Staff Member</DialogTitle>
                <DialogDescription className="text-white/90">
                  Update staff member information and assignment
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  Full Name
                </Label>
                <Input
                  id="edit_full_name"
                  value={editStaffForm.full_name}
                  onChange={(e) =>
                    setEditStaffForm({ ...editStaffForm, full_name: e.target.value })
                  }
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  Phone
                </Label>
                <Input
                  id="edit_phone"
                  value={editStaffForm.phone}
                  onChange={(e) =>
                    setEditStaffForm({ ...editStaffForm, phone: e.target.value })
                  }
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_role" className="text-sm font-semibold text-gray-700">
                  Role
                </Label>
                <Select
                  value={editStaffForm.role}
                  onValueChange={(value: any) =>
                    setEditStaffForm({ ...editStaffForm, role: value })
                  }
                >
                  <SelectTrigger className="border-2 border-teal-200 h-11 focus:ring-teal-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="store-manager">Store Manager</SelectItem>
                    <SelectItem value="warehouse-manager">Warehouse Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_location" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Location
                </Label>
                <Select
                  value={editStaffForm.location_id}
                  onValueChange={(value) =>
                    setEditStaffForm({ ...editStaffForm, location_id: value })
                  }
                >
                  <SelectTrigger className="border-2 border-teal-200 h-11 focus:ring-teal-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.location_id} value={loc.location_id.toString()}>
                        {loc.name} ({loc.location_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
              className="border-2 border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditStaff} 
              disabled={submitting}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
