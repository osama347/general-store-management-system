"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Filter,
  Trash2,
  Edit,
  AlertTriangle,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "@/contexts/LocationContext"

const supabase = createClient()

// Interfaces
interface Expense {
  expense_id: number
  location_id?: number
  profile_id?: string
  category_id?: number
  amount: number
  expense_date: string
  description?: string
  status: string
  receipt_number?: string
  vendor_name?: string
  notes?: string
  created_at: string
  updated_at: string
  locations?: {
    location_id: number
    name: string
    location_type: string
  }
  profile?: {
    id: string
    full_name: string
  }
  created_by?: {
    id: string
    full_name: string
  }
  updated_by?: {
    id: string
    full_name: string
  }
}

interface Location {
  location_id: number
  name: string
  location_type: string
}

interface ExpenseCategory {
  category_id: number
  name: string
  description?: string
  is_active: boolean
}

interface FilterState {
  location: string
  category: string
  status: string
  dateRange: { start: string; end: string }
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  
  // Form states
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    location_id: "",
    category_id: "",
    amount: "",
    expense_date: new Date().toISOString().split('T')[0],
    description: "",
    status: "pending",
    receipt_number: "",
    vendor_name: "",
    notes: "",
  })
  
  const [filters, setFilters] = useState<FilterState>({
    location: "",
    category: "",
    status: "",
    dateRange: { start: "", end: "" },
  })
  const [showFilters, setShowFilters] = useState(false)
  
  const { profile, loading: authLoading } = useAuth()
  const { locations: allLocations, isLoading: locationLoading } = useLocation()
  
  // Get the user's location from their profile
  const userLocationId = profile?.location_id

  // Data Fetching Functions
  const fetchExpenses = async () => {
    try {
      let query = supabase
        .from("expenses")
        .select(`
          *,
          locations ( location_id, name, location_type ),
          profile:profile_id ( id, full_name ),
          created_by:created_by ( id, full_name ),
          updated_by:updated_by ( id, full_name )
        `)
        .order("expense_date", { ascending: false })
      
      // For non-admin users, filter by their profile location_id
      if (profile?.role !== 'admin' && userLocationId) {
        query = query.eq('location_id', userLocationId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setExpenses(data || [])
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to load expenses", { description: err.message })
    }
  }

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase.from("locations").select("location_id, name, location_type")
      if (error) throw error
      setLocations(data || [])
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to load locations", { description: err.message })
    }
  }

  const fetchExpenseCategories = async () => {
    try {
      const { data, error } = await supabase.from("expense_categories").select("category_id, name, description, is_active")
      if (error) throw error
      setExpenseCategories(data || [])
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to load expense categories", { description: err.message })
    }
  }

  // Expense CRUD Functions
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Validate required fields
      if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
        toast.error("Amount must be greater than zero!")
        setIsSubmitting(false)
        return
      }
      
      if (!formData.expense_date) {
        toast.error("Expense date is required!")
        setIsSubmitting(false)
        return
      }
      
      const expenseData: any = {
        category_id: formData.category_id ? Number(formData.category_id) : null,
        amount: Number(formData.amount),
        expense_date: new Date(formData.expense_date).toISOString(),
        description: formData.description || null,
        status: formData.status,
        receipt_number: formData.receipt_number || null,
        vendor_name: formData.vendor_name || null,
        notes: formData.notes || null,
        profile_id: profile?.id || null,
        created_by: profile?.id || null,
        updated_by: profile?.id || null,
      }
      
      // Add location_id
      if (userLocationId) {
        expenseData.location_id = userLocationId
      } else if (formData.location_id) {
        expenseData.location_id = Number(formData.location_id)
      }
      
      const { data, error } = await supabase
        .from("expenses")
        .insert(expenseData)
        .select()
        .single()
      
      if (error) throw error
      
      toast.success("Expense added successfully!")
      setIsExpenseDialogOpen(false)
      resetForm()
      await fetchExpenses()
    } catch (err: any) {
      toast.error("Failed to add expense", { description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    
    setIsSubmitting(true)
    
    try {
      // Validate required fields
      if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
        toast.error("Amount must be greater than zero!")
        setIsSubmitting(false)
        return
      }
      
      if (!formData.expense_date) {
        toast.error("Expense date is required!")
        setIsSubmitting(false)
        return
      }
      
      const updateData: any = {
        category_id: formData.category_id ? Number(formData.category_id) : null,
        amount: Number(formData.amount),
        expense_date: new Date(formData.expense_date).toISOString(),
        description: formData.description || null,
        status: formData.status,
        receipt_number: formData.receipt_number || null,
        vendor_name: formData.vendor_name || null,
        notes: formData.notes || null,
        updated_by: profile?.id || null,
      }
      
      // Only update location_id if user is admin
      if (profile?.role === 'admin' && formData.location_id) {
        updateData.location_id = Number(formData.location_id)
      }
      
      const { error } = await supabase
        .from("expenses")
        .update(updateData)
        .eq("expense_id", editingExpense.expense_id)
      
      if (error) throw error
      
      toast.success("Expense updated successfully!")
      setIsExpenseDialogOpen(false)
      setEditingExpense(null)
      resetForm()
      await fetchExpenses()
    } catch (err: any) {
      toast.error("Failed to update expense", { description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async (expenseId: number) => {
    if (!confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      return
    }
    
    try {
      const { error } = await supabase.from("expenses").delete().eq("expense_id", expenseId)
      
      if (error) throw error
      
      toast.success("Expense deleted successfully!")
      await fetchExpenses()
    } catch (err: any) {
      toast.error("Failed to delete expense", { description: err.message })
    }
  }

  const startEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      location_id: expense.location_id?.toString() || "",
      category_id: expense.category_id?.toString() || "",
      amount: expense.amount.toString(),
      expense_date: new Date(expense.expense_date).toISOString().split('T')[0],
      description: expense.description || "",
      status: expense.status,
      receipt_number: expense.receipt_number || "",
      vendor_name: expense.vendor_name || "",
      notes: expense.notes || "",
    })
    setIsExpenseDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      location_id: "",
      category_id: "",
      amount: "",
      expense_date: new Date().toISOString().split('T')[0],
      description: "",
      status: "pending",
      receipt_number: "",
      vendor_name: "",
      notes: "",
    })
    setEditingExpense(null)
  }

  // Sorting & Filtering
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  const filteredExpenses = expenses
    .filter((expense) => {
      const matchesSearch =
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.locations?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expenseCategories.find(c => c.category_id === expense.category_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesLocation = !filters.location || expense.location_id?.toString() === filters.location
      const matchesCategory = !filters.category || expense.category_id?.toString() === filters.category
      const matchesStatus = !filters.status || expense.status === filters.status
      
      let matchesDateRange = true
      if (filters.dateRange.start && filters.dateRange.end) {
        const expenseDate = new Date(expense.expense_date)
        const startDate = new Date(filters.dateRange.start)
        const endDate = new Date(filters.dateRange.end)
        matchesDateRange = expenseDate >= startDate && expenseDate <= endDate
      }
      
      return matchesSearch && matchesLocation && matchesCategory && matchesStatus && matchesDateRange
    })
    .sort((a, b) => {
      if (!sortConfig) return 0
      
      let aValue: any, bValue: any
      switch (sortConfig.key) {
        case "date":
          aValue = new Date(a.expense_date)
          bValue = new Date(b.expense_date)
          break
        case "amount":
          aValue = a.amount
          bValue = b.amount
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        case "vendor":
          aValue = a.vendor_name || ""
          bValue = b.vendor_name || ""
          break
        case "location":
          aValue = a.locations?.name || ""
          bValue = b.locations?.name || ""
          break
        case "category":
          aValue = expenseCategories.find(c => c.category_id === a.category_id)?.name || ""
          bValue = expenseCategories.find(c => c.category_id === b.category_id)?.name || ""
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1
      return 0
    })

  const clearFilters = () => {
    setFilters({
      location: "",
      category: "",
      status: "",
      dateRange: { start: "", end: "" },
    })
    setSearchTerm("")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "approved":
        return <Badge variant="default">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchExpenses(),
          fetchLocations(),
          fetchExpenseCategories(),
        ])
      } catch (err) {
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    
    if (!authLoading && !locationLoading) {
      loadData()
    }
  }, [authLoading, locationLoading, profile])

  if (loading || authLoading || locationLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading expenses...</p>
        </div>
      </div>
    )
  }

  // Show message if user is not associated with any location
  if (profile?.role !== 'admin' && !userLocationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md p-8 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-bold mb-2">No Location Assigned</h2>
          <p className="text-gray-600">
            Your account is not associated with any location. Please contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Unable to load data</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Expenses Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                Track and manage your business expenses
                {profile?.role !== 'admin' && profile?.location && (
                  <span className="ml-1">for {profile.location.name}</span>
                )}
              </p>
            </div>
            
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    resetForm()
                    setEditingExpense(null)
                  }}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingExpense ? "Edit Expense" : "Add New Expense"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingExpense 
                      ? "Update the expense information below." 
                      : "Fill in the expense details. Click save when you're done."
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}>
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="status">Status</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Only show location selector for admin users */}
                        {profile?.role === 'admin' && (
                          <div className="space-y-2">
                            <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                            <Select 
                              value={formData.location_id} 
                              onValueChange={(value) => setFormData({...formData, location_id: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.map((location) => (
                                  <SelectItem key={location.location_id} value={location.location_id.toString()}>
                                    {location.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                          <Select 
                            value={formData.category_id} 
                            onValueChange={(value) => setFormData({...formData, category_id: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseCategories.map((category) => (
                                <SelectItem key={category.category_id} value={category.category_id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-sm font-medium">Amount *</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="expense_date" className="text-sm font-medium">Date *</Label>
                          <Input
                            id="expense_date"
                            type="date"
                            value={formData.expense_date}
                            onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="details" className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vendor_name" className="text-sm font-medium">Vendor Name</Label>
                          <Input
                            id="vendor_name"
                            placeholder="Who was paid"
                            value={formData.vendor_name}
                            onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="receipt_number" className="text-sm font-medium">Receipt Number</Label>
                          <Input
                            id="receipt_number"
                            placeholder="Receipt number"
                            value={formData.receipt_number}
                            onChange={(e) => setFormData({...formData, receipt_number: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                          <Input
                            id="description"
                            placeholder="Expense description"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                          <Input
                            id="notes"
                            placeholder="Additional notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="status" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                        <Select 
                          value={formData.status} 
                          onValueChange={(value) => setFormData({...formData, status: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Status Information</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• <span className="font-medium">Pending</span>: Expense is awaiting approval</li>
                          <li>• <span className="font-medium">Approved</span>: Expense has been approved and processed</li>
                          <li>• <span className="font-medium">Rejected</span>: Expense has been rejected</li>
                        </ul>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <DialogFooter className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsExpenseDialogOpen(false)
                        resetForm()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !formData.amount}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      {isSubmitting ? "Saving..." : editingExpense ? "Update Expense" : "Add Expense"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search expenses, vendors, receipts..."
                  className="pl-10 border-gray-200 bg-gray-50 focus:bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-gray-200 text-gray-600"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {(filters.location ||
                filters.category ||
                filters.status ||
                filters.dateRange.start ||
                filters.dateRange.end) && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  !
                </Badge>
              )}
            </Button>
          </div>
          
          {showFilters && (
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Only show location filter for admin users */}
                {profile?.role === 'admin' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Location</Label>
                    <Select
                      value={filters.location}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, location: value === "all" ? "" : value }))
                      }
                    >
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="All locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All locations</SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location.location_id} value={location.location_id.toString()}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Category</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, category: value === "all" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.category_id} value={category.category_id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value === "all" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="Start date"
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value },
                        }))
                      }
                      className="border-gray-200"
                    />
                    <Input
                      type="date"
                      placeholder="End date"
                      value={filters.dateRange.end}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value },
                        }))
                      }
                      className="border-gray-200"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500"
                >
                  Clear all filters
                </Button>
              </div>
            </div>
          )}
          
          {/* Expenses Table */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100">
                    <TableHead 
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("date")}
                    >
                      Date
                    </TableHead>
                    <TableHead 
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("vendor")}
                    >
                      Vendor
                    </TableHead>
                    <TableHead 
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("category")}
                    >
                      Category
                    </TableHead>
                    {/* Only show location column for admin users */}
                    {profile?.role === 'admin' && (
                      <TableHead 
                        className="font-medium text-gray-700 cursor-pointer"
                        onClick={() => requestSort("location")}
                      >
                        Location
                      </TableHead>
                    )}
                    <TableHead 
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("amount")}
                    >
                      Amount
                    </TableHead>
                    <TableHead 
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("status")}
                    >
                      Status
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={profile?.role === 'admin' ? 7 : 6} className="text-center py-8 text-gray-500">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.expense_id} className="border-gray-100 hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {formatDate(expense.expense_date)}
                        </TableCell>
                        <TableCell>
                          {expense.vendor_name || "-"}
                        </TableCell>
                        <TableCell>
                          {expenseCategories.find(c => c.category_id === expense.category_id)?.name || "-"}
                        </TableCell>
                        {/* Only show location cell for admin users */}
                        {profile?.role === 'admin' && (
                          <TableCell>
                            {expense.locations?.name || "-"}
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(expense.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditExpense(expense)}
                              className="text-gray-500"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.expense_id)}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div> 
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}