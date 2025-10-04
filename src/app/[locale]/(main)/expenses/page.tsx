"use client"
import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Edit,
  AlertTriangle,
  X,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Receipt,
  TrendingUp,
  Building2,
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
import { Card, CardContent } from "@/components/ui/card"
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
import {useTranslations} from "next-intl"

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
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  
  // Form states
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
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
  const { currentLocation, locations: allLocations, isLoading: locationLoading } = useLocation()
  
  // Get the user's location from their profile
  const userLocationId = profile?.location_id
  
  // Determine effective location
  const effectiveLocationId = profile?.role === 'admin' 
    ? currentLocation?.location_id 
    : userLocationId

  // Data Fetching Function
  const fetchExpensesData = async () => {
    // Fetch expenses
    let expensesQuery = supabase
      .from("expenses")
      .select(`
        *,
        locations ( location_id, name, location_type ),
        profile:profile_id ( id, full_name ),
        created_by:created_by ( id, full_name ),
        updated_by:updated_by ( id, full_name )
      `)
      .order("expense_date", { ascending: false })
    
    if (effectiveLocationId) {
      expensesQuery = expensesQuery.eq('location_id', effectiveLocationId)
    }
    
    const { data: expensesData, error: expensesError } = await expensesQuery
    if (expensesError) throw expensesError
    
    // Fetch locations
    const { data: locationsData, error: locationsError } = await supabase
      .from("locations")
      .select("location_id, name, location_type")
    if (locationsError) throw locationsError
    
    // Fetch expense categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("expense_categories")
      .select("category_id, name, description, is_active")
    if (categoriesError) throw categoriesError
    
    return {
      expenses: expensesData || [],
      locations: locationsData || [],
      expenseCategories: categoriesData || [],
    }
  }

  // React Query for expenses data
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['expenses', effectiveLocationId],
    queryFn: fetchExpensesData,
    enabled: !authLoading && !locationLoading && !!profile,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  const expenses = data?.expenses || []
  const locations = data?.locations || []
  const expenseCategories = data?.expenseCategories || []

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      // Validate required fields
      if (!expenseData.amount || isNaN(Number(expenseData.amount)) || Number(expenseData.amount) <= 0) {
        throw new Error("Amount must be greater than zero!")
      }
      
      if (!expenseData.expense_date) {
        throw new Error("Expense date is required!")
      }
      
      const insertData: any = {
        category_id: expenseData.category_id ? Number(expenseData.category_id) : null,
        amount: Number(expenseData.amount),
        expense_date: new Date(expenseData.expense_date).toISOString(),
        description: expenseData.description || null,
        status: expenseData.status,
        receipt_number: expenseData.receipt_number || null,
        vendor_name: expenseData.vendor_name || null,
        notes: expenseData.notes || null,
        profile_id: profile?.id || null,
        created_by: profile?.id || null,
        updated_by: profile?.id || null,
      }
      
      // Add location_id based on user role
      const targetLocationId = profile?.role === 'admin' 
        ? currentLocation?.location_id 
        : userLocationId
      
      if (targetLocationId) {
        insertData.location_id = targetLocationId
      }
      
      const { data, error } = await supabase
        .from("expenses")
        .insert(insertData)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success("Expense added successfully!")
      setIsExpenseDialogOpen(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error("Failed to add expense", { description: err.message })
    }
  })

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ expenseId, updateData }: { expenseId: number; updateData: any }) => {
      // Validate required fields
      if (!updateData.amount || isNaN(Number(updateData.amount)) || Number(updateData.amount) <= 0) {
        throw new Error("Amount must be greater than zero!")
      }
      
      if (!updateData.expense_date) {
        throw new Error("Expense date is required!")
      }
      
      const data: any = {
        category_id: updateData.category_id ? Number(updateData.category_id) : null,
        amount: Number(updateData.amount),
        expense_date: new Date(updateData.expense_date).toISOString(),
        description: updateData.description || null,
        status: updateData.status,
        receipt_number: updateData.receipt_number || null,
        vendor_name: updateData.vendor_name || null,
        notes: updateData.notes || null,
        updated_by: profile?.id || null,
      }
      
      // Only update location_id if user is admin
      if (profile?.role === 'admin' && updateData.location_id) {
        data.location_id = Number(updateData.location_id)
      }
      
      const { error } = await supabase
        .from("expenses")
        .update(data)
        .eq("expense_id", expenseId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success("Expense updated successfully!")
      setIsExpenseDialogOpen(false)
      setEditingExpense(null)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error("Failed to update expense", { description: err.message })
    }
  })

  // Expense CRUD Functions
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    createExpenseMutation.mutate(formData)
  }

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    updateExpenseMutation.mutate({ expenseId: editingExpense.expense_id, updateData: formData })
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

  const t = useTranslations("expenses")

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">{t("statusInfo.pending.label")}</Badge>
      case "approved":
        return <Badge variant="default">{t("statusInfo.approved.label")}</Badge>
      case "rejected":
        return <Badge variant="destructive">{t("statusInfo.rejected.label")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Statistics calculations
  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  const getPendingCount = () => {
    return expenses.filter(e => e.status === 'pending').length
  }

  const getApprovedCount = () => {
    return expenses.filter(e => e.status === 'approved').length
  }

  const getRejectedCount = () => {
    return expenses.filter(e => e.status === 'rejected').length
  }

  if (loading || authLoading || locationLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">{t("loading")}</p>
        </div>
      </div>
    )
  }

  if (profile?.role !== "admin" && !userLocationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md p-8 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-bold mb-2">{t("noLocation.title")}</h2>
          <p className="text-gray-600">{t("noLocation.description")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen ">
      {/* Premium Header */}
      <header className="bg-white border-b-2 border-teal-200 shadow-md sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 tracking-tight">
                  {t("header.title")}
                </h1>
                <p className="text-slate-600 text-sm font-medium">
                  {profile?.role === 'admin' && currentLocation 
                    ? currentLocation.name
                    : profile?.location 
                    ? profile.location.name
                    : t("header.description")
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1.5 bg-gradient-to-br from-teal-50 to-emerald-100 border-2 border-teal-300 shadow-sm">
                <Receipt className="h-3 w-3 mr-1.5" />
                <span className="text-sm font-semibold text-teal-900">{expenses.length}</span>
                <span className="text-xs text-teal-600 font-semibold ml-1">{expenses.length === 1 ? 'Expense' : 'Expenses'}</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-8">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">{t("error.title")}</p>
                <p className="text-sm text-red-700 mt-1">{t("error.description")}</p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Amount Card */}
          <Card className="border-2 border-emerald-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-emerald-100">Total Amount</p>
                <div className="text-3xl font-black text-white mt-2">
                  {formatCurrency(getTotalExpenses())}
                </div>
                <p className="text-xs text-emerald-100 mt-3 font-medium">
                  Total expense value
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pending Expenses Card */}
          <Card className="border-2 border-slate-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-slate-500 to-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-100">Pending</p>
                <div className="text-3xl font-black text-white mt-2">
                  {getPendingCount()}
                </div>
                <p className="text-xs text-slate-100 mt-3 font-medium">
                  Awaiting approval
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Approved Expenses Card */}
          <Card className="border-2 border-teal-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-teal-500 to-teal-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-teal-100">Approved</p>
                <div className="text-3xl font-black text-white mt-2">
                  {getApprovedCount()}
                </div>
                <p className="text-xs text-teal-100 mt-3 font-medium">
                  Successfully approved
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rejected Expenses Card */}
          <Card className="border-2 border-red-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="p-6 bg-gradient-to-br from-red-500 to-red-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-red-100">Rejected</p>
                <div className="text-3xl font-black text-white mt-2">
                  {getRejectedCount()}
                </div>
                <p className="text-xs text-red-100 mt-3 font-medium">
                  Declined expenses
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl border-2 border-gray-100 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t("search.placeholder")}
                    className="pl-10 border-2 bg-white focus:border-teal-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-2 hover:bg-teal-50 hover:border-teal-300"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {t("filters.toggle")}
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

                <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="default"
                      onClick={() => {
                        resetForm()
                        setEditingExpense(null)
                      }}
                      className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md text-white"
                    >
                      <Plus className="h-4 w-4" />
                      {t("actions.add")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className={`${editingExpense ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600' : 'bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600'} -m-6 mb-4 p-6 rounded-t-lg`}>
                      <DialogTitle className="text-xl flex items-center gap-2 text-white">
                        <Receipt className="h-5 w-5" />
                        {editingExpense ? t("dialog.editTitle") : t("dialog.addTitle")}
                      </DialogTitle>
                      <DialogDescription className="text-teal-100">
                        {editingExpense ? t("dialog.editDescription") : t("dialog.addDescription")}
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}>
                      <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
                          <TabsTrigger value="details">{t("tabs.details")}</TabsTrigger>
                          <TabsTrigger value="status">{t("tabs.status")}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profile?.role === "admin" && (
                              <div className="space-y-2">
                                <Label htmlFor="location" className="text-sm font-medium">
                                  {t("form.location")}
                                </Label>
                                <Select
                                  value={formData.location_id}
                                  onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("form.location")} />
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
                              <Label htmlFor="category" className="text-sm font-medium">
                                {t("form.category")}
                              </Label>
                              <Select
                                value={formData.category_id}
                                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("form.category")} />
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
                              <Label htmlFor="amount" className="text-sm font-medium">
                                {t("form.amount")}
                              </Label>
                              <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="expense_date" className="text-sm font-medium">
                                {t("form.date")}
                              </Label>
                              <Input
                                id="expense_date"
                                type="date"
                                value={formData.expense_date}
                                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                required
                              />
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="details" className="space-y-4 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="vendor_name" className="text-sm font-medium">
                                {t("form.vendor")}
                              </Label>
                              <Input
                                id="vendor_name"
                                placeholder={t("form.vendor")}
                                value={formData.vendor_name}
                                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="receipt_number" className="text-sm font-medium">
                                {t("form.receipt")}
                              </Label>
                              <Input
                                id="receipt_number"
                                placeholder={t("form.receipt")}
                                value={formData.receipt_number}
                                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="description" className="text-sm font-medium">
                                {t("form.description")}
                              </Label>
                              <Input
                                id="description"
                                placeholder={t("form.description")}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="notes" className="text-sm font-medium">
                                {t("form.notes")}
                              </Label>
                              <Input
                                id="notes"
                                placeholder={t("form.notes")}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                              />
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="status" className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="status" className="text-sm font-medium">
                              {t("form.status")}
                            </Label>
                            <Select
                              value={formData.status}
                              onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("form.status")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">{t("statusInfo.pending.label")}</SelectItem>
                                <SelectItem value="approved">{t("statusInfo.approved.label")}</SelectItem>
                                <SelectItem value="rejected">{t("statusInfo.rejected.label")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">{t("statusInfo.title")}</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>
                                • <span className="font-medium">{t("statusInfo.pending.label")}</span>:{" "}
                                {t("statusInfo.pending.description")}
                              </li>
                              <li>
                                • <span className="font-medium">{t("statusInfo.approved.label")}</span>:{" "}
                                {t("statusInfo.approved.description")}
                              </li>
                              <li>
                                • <span className="font-medium">{t("statusInfo.rejected.label")}</span>:{" "}
                                {t("statusInfo.rejected.description")}
                              </li>
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
                          className="border-gray-300"
                        >
                          {t("actions.cancel")}
                        </Button>
                        <Button
                          type="submit"
                          disabled={(createExpenseMutation.isPending || updateExpenseMutation.isPending) || !formData.amount}
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                        >
                          {(createExpenseMutation.isPending || updateExpenseMutation.isPending) ? t("actions.saving") : editingExpense ? t("actions.update") : t("actions.add")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50 border-b border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("filters.category")}</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, category: value === "all" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="border-gray-200 bg-white">
                      <SelectValue placeholder={t("filters.allCategories")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.category_id} value={category.category_id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("filters.status")}</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value === "all" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="border-gray-200 bg-white">
                      <SelectValue placeholder={t("filters.allStatuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                      <SelectItem value="pending">{t("statusInfo.pending.label")}</SelectItem>
                      <SelectItem value="approved">{t("statusInfo.approved.label")}</SelectItem>
                      <SelectItem value="rejected">{t("statusInfo.rejected.label")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("filters.dateRange")}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder={t("filters.startDate")}
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value },
                        }))
                      }
                      className="border-gray-200 bg-white"
                    />
                    <Input
                      type="date"
                      placeholder={t("filters.endDate")}
                      value={filters.dateRange.end}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value },
                        }))
                      }
                      className="border-gray-200 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-700">
                  <X className="h-4 w-4 mr-2" />
                  {t("filters.clearAll")}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50 border-b-2 border-teal-200">
                    <TableHead className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors" onClick={() => requestSort("date")}>
                      {t("table.columns.date")}
                    </TableHead>
                    <TableHead
                      className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors"
                      onClick={() => requestSort("vendor")}
                    >
                      {t("table.columns.vendor")}
                    </TableHead>
                    <TableHead
                      className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors"
                      onClick={() => requestSort("category")}
                    >
                      {t("table.columns.category")}
                    </TableHead>
                    {profile?.role === "admin" && (
                      <TableHead
                        className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors"
                        onClick={() => requestSort("location")}
                      >
                        {t("table.columns.location")}
                      </TableHead>
                    )}
                    <TableHead
                      className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors"
                      onClick={() => requestSort("amount")}
                    >
                      {t("table.columns.amount")}
                    </TableHead>
                    <TableHead
                      className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors"
                      onClick={() => requestSort("status")}
                    >
                      {t("table.columns.status")}
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">
                      {t("table.columns.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={profile?.role === "admin" ? 7 : 6} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <div className="p-4 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full w-20 h-20 mb-4 flex items-center justify-center">
                            <Receipt className="h-10 w-10 text-teal-600" />
                          </div>
                          <p className="text-lg font-semibold text-gray-700">{t("table.empty")}</p>
                          <p className="text-sm text-gray-500 mt-2">Start by adding your first expense</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.expense_id} className="border-b hover:bg-teal-50/50 transition-colors">
                        <TableCell className="font-medium text-gray-700">{formatDate(expense.expense_date)}</TableCell>
                        <TableCell className="text-gray-600">{expense.vendor_name || "-"}</TableCell>
                        <TableCell className="text-gray-600">
                          {expenseCategories.find((c) => c.category_id === expense.category_id)?.name || "-"}
                        </TableCell>
                        {profile?.role === "admin" && (
                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              {expense.locations?.name || "-"}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="font-semibold text-gray-700">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell>{renderStatusBadge(expense.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditExpense(expense)}
                            className="h-8 px-3 hover:bg-teal-100 hover:text-teal-600 transition-colors"
                          >
                            <Edit className="h-4 w-4 mr-1.5" />
                            Edit
                          </Button>
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