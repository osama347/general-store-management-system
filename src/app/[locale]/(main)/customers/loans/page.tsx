"use client"
import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  CreditCard,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Clock,
  X,
  BookOpen,
  Users,
  Building
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "@/contexts/LocationContext"
import { useTranslations } from 'next-intl'

interface Loan {
  id: string
  amount: number
  loanDate: string
  dueDate: string | null
  status: string
  customerId: string
  customerName: string
  customerEmail: string
  locationId?: number
  locationName?: string
}

interface Customer {
  customer_id: number
  first_name: string
  last_name: string
  email: string | null
  location_id?: number
}

export default function LoansPage() {
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isNewLoanDialogOpen, setIsNewLoanDialogOpen] = useState(false)
  const [isViewLoanDialogOpen, setIsViewLoanDialogOpen] = useState(false)
  const [isEditLoanDialogOpen, setIsEditLoanDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const t=useTranslations('loans')
  
  // Customer search for new loan
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  // New loan form state
  const [newLoan, setNewLoan] = useState({
    amount: "",
    dueDate: "",
    status: "pending"
  })
  
  // Edit loan form state
  const [editLoan, setEditLoan] = useState({
    amount: "",
    dueDate: "",
    status: "pending"
  })
  
  // Notebook view state
  const [activeTab, setActiveTab] = useState("all-loans")
  const [selectedCustomerForNotebook, setSelectedCustomerForNotebook] = useState<Customer | null>(null)
  const [isAddingForSpecificCustomer, setIsAddingForSpecificCustomer] = useState(false)
  
  const supabase = createClient()
  const { profile, loading: authLoading } = useAuth()
  const { locations, currentLocation, isLoading: locationLoading } = useLocation()

  // Get the user's location from their profile
  const userLocationId = profile?.location_id
  
  // Determine effective location
  const effectiveLocationId = profile?.role === 'admin' 
    ? currentLocation?.location_id 
    : userLocationId

  // Data Fetching Function
  const fetchLoansData = async () => {
    // Build loans query
    let loansQuery = supabase
      .from("loans")
      .select(`
        loan_id,
        loan_amount,
        loan_date,
        due_date,
        status,
        customer_id,
        location_id,
        locations(name),
        customers (first_name, last_name, email, location_id)
      `)

    if (effectiveLocationId) {
      loansQuery = loansQuery.eq('location_id', effectiveLocationId)
    }

    const { data: loansData, error: loansError } = await loansQuery
      .order("loan_date", { ascending: false })
    
    if (loansError) throw new Error(`Loans error: ${loansError.message}`)
    
    // Fetch customers
    let customersQuery = supabase
      .from("customers")
      .select("customer_id, first_name, last_name, email, location_id")
      .neq("first_name", "Walk-in")
      .order("first_name", { ascending: true })

    if (effectiveLocationId) {
      customersQuery = customersQuery.eq('location_id', effectiveLocationId)
    }

    const { data: customersData, error: customersError } = await customersQuery
    if (customersError) throw new Error(`Customers error: ${customersError.message}`)
    
    // Transform loans data
    const transformedLoans = loansData?.map(loan => {
      const customer = Array.isArray(loan.customers) ? loan.customers[0] : loan.customers;
      const location = Array.isArray(loan.locations) ? loan.locations[0] : loan.locations;
      
      return {
        id: loan.loan_id.toString(),
        amount: loan.loan_amount,
        loanDate: loan.loan_date,
        dueDate: loan.due_date,
        status: loan.status,
        customerId: loan.customer_id?.toString() || "N/A",
        customerName: customer ? `${customer.first_name} ${customer.last_name}` : "Unknown Customer",
        customerEmail: customer?.email || "N/A",
        locationId: loan.location_id,
        locationName: location?.name || "N/A"
      }
    }) || []
    
    return {
      loans: transformedLoans,
      customers: customersData || []
    }
  }

  // React Query for loans data
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['loans', effectiveLocationId],
    queryFn: fetchLoansData,
    enabled: !authLoading && !locationLoading && !!profile,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  const loans = data?.loans || []
  const customers = data?.customers || []

  // Mutations
  const createLoanMutation = useMutation({
    mutationFn: async (loanData: any) => {
      const { data, error } = await supabase
        .from("loans")
        .insert([loanData])
        .select()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success("Loan created successfully!")
      setIsNewLoanDialogOpen(false)
      setNewLoan({ amount: "", dueDate: "", status: "pending" })
      setSelectedCustomer(null)
      setCustomerSearch("")
      setIsAddingForSpecificCustomer(false)
    },
    onError: (error) => {
      console.error("Error creating loan:", error)
      toast.error("Failed to create loan")
    }
  })

  const updateLoanMutation = useMutation({
    mutationFn: async ({ loanId, updateData }: { loanId: number; updateData: any }) => {
      const { error } = await supabase
        .from("loans")
        .update(updateData)
        .eq("loan_id", loanId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success("Loan updated successfully!")
      setIsEditLoanDialogOpen(false)
    },
    onError: (error) => {
      console.error("Error updating loan:", error)
      toast.error("Failed to update loan")
    }
  })

  const deleteLoanMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const { error } = await supabase
        .from("loans")
        .delete()
        .eq("loan_id", parseInt(loanId))
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success("Loan deleted successfully!")
    },
    onError: (error) => {
      console.error("Error deleting loan:", error)
      toast.error("Failed to delete loan")
    }
  })

  // Filter customers based on search
  const filteredCustomersForSearch = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10)
    
    return customers.filter(customer => 
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
    ).slice(0, 10)
  }, [customers, customerSearch])

  // Filter and sort loans based on current view
  const filteredLoans = useMemo(() => {
    let filtered = [...loans]
    
    // If in notebook view, filter by selected customer
    if (activeTab === "customer-notebook" && selectedCustomerForNotebook) {
      filtered = filtered.filter(loan => 
        loan.customerId === selectedCustomerForNotebook.customer_id.toString()
      )
    }
    
    if (searchTerm) {
      filtered = filtered.filter(
        (loan) =>
          loan.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.id.includes(searchTerm)
      )
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((loan) => loan.status === statusFilter)
    }
    
    return filtered.sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime())
  }, [loans, searchTerm, statusFilter, activeTab, selectedCustomerForNotebook])

  // Pagination
  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLoans = filteredLoans.slice(startIndex, startIndex + itemsPerPage)

  // Get customer statistics
  const getCustomerStats = (customerId: string) => {
    const customerLoans = loans.filter(loan => loan.customerId === customerId)
    const totalAmount = customerLoans.reduce((sum, loan) => sum + loan.amount, 0)
    const pendingCount = customerLoans.filter(loan => loan.status === 'pending').length
    const paidCount = customerLoans.filter(loan => loan.status === 'paid').length
    const pendingAmount = customerLoans
      .filter(loan => loan.status === 'pending')
      .reduce((sum, loan) => sum + loan.amount, 0)
    const paidAmount = customerLoans
      .filter(loan => loan.status === 'paid')
      .reduce((sum, loan) => sum + loan.amount, 0)
    
    return {
      totalLoans: customerLoans.length,
      totalAmount,
      pendingCount,
      paidCount,
      pendingAmount,
      paidAmount
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getLoanStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return { 
          text: 'Pending', 
          variant: 'destructive' as const, 
          icon: Clock,
          bgColor: 'bg-red-50',
          textColor: 'text-red-700'
        }
      case 'paid':
        return { 
          text: 'Paid', 
          variant: 'default' as const, 
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          textColor: 'text-green-700'
        }
      default:
        return { 
          text: 'Unknown', 
          variant: 'secondary' as const, 
          icon: AlertTriangle,
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700'
        }
    }
  }

  const handleViewLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setIsViewLoanDialogOpen(true)
  }

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setEditLoan({
      amount: loan.amount.toString(),
      dueDate: loan.dueDate || "",
      status: loan.status
    })
    setIsEditLoanDialogOpen(true)
  }

  const handlePaymentLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setIsPaymentDialogOpen(true)
  }

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch(`${customer.first_name} ${customer.last_name}`)
    setShowCustomerDropdown(false)
  }

  const handleCreateLoan = async () => {
    if (!selectedCustomer || !newLoan.amount) {
      toast.error("Please select a customer and enter loan amount")
      return
    }
    if (isNaN(parseFloat(newLoan.amount))) {
      toast.error("Please enter a valid loan amount")
      return
    }
    
    const targetLocationId = effectiveLocationId
    if (!targetLocationId) {
      toast.error("No location selected. Please select a location first.")
      return
    }
    
    const loanData: any = {
      customer_id: selectedCustomer.customer_id,
      loan_amount: parseFloat(newLoan.amount),
      due_date: newLoan.dueDate || null,
      status: newLoan.status,
      location_id: targetLocationId,
    }

    createLoanMutation.mutate(loanData)
  }

  const handleUpdateLoan = async () => {
    if (!editLoan.amount || !selectedLoan) {
      toast.error("Please enter loan amount")
      return
    }
    if (isNaN(parseFloat(editLoan.amount))) {
      toast.error("Please enter a valid loan amount")
      return
    }
    
    updateLoanMutation.mutate({
      loanId: parseInt(selectedLoan.id),
      updateData: {
        loan_amount: parseFloat(editLoan.amount),
        due_date: editLoan.dueDate || null,
        status: editLoan.status,
      }
    })
  }

  const handlePaymentSubmit = async () => {
    if (!selectedLoan) {
      toast.error("No loan selected")
      return
    }
    
    updateLoanMutation.mutate({
      loanId: parseInt(selectedLoan.id),
      updateData: { status: 'paid' }
    })
    setIsPaymentDialogOpen(false)
  }

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm("Are you sure you want to delete this loan? This action cannot be undone.")) {
      return
    }
    
    deleteLoanMutation.mutate(loanId)
  }

  const handleSelectCustomerForNotebook = (customer: Customer) => {
    setSelectedCustomerForNotebook(customer)
    setActiveTab("customer-notebook")
    setCurrentPage(1)
  }
  const resetNewLoanForm = () => {
  setSelectedCustomer(null);
  setCustomerSearch("");
  setIsAddingForSpecificCustomer(false);
  setNewLoan({
    amount: "",
    dueDate: "",
    status: "pending"
  });
};

  const handleAddLoanForCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch(`${customer.first_name} ${customer.last_name}`)
    setIsAddingForSpecificCustomer(true)
    setIsNewLoanDialogOpen(true)
  }

  const getTotalLoanAmount = () => {
    return loans.reduce((sum, loan) => sum + loan.amount, 0)
  }

  const getPendingLoansCount = () => {
    return loans.filter(loan => loan.status === 'pending').length
  }

  const getPaidLoansCount = () => {
    return loans.filter(loan => loan.status === 'paid').length
  }

  const selectedLoanStatusInfo = selectedLoan ? getLoanStatus(selectedLoan.status) : null
  const SelectedLoanStatusIcon = selectedLoanStatusInfo?.icon

  if (loading || authLoading || locationLoading) {
    return (
      <main className="container mx-auto p-6 space-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{t('loading')}</span>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container mx-auto p-6 space-y-4">
        <div className="p-6 bg-red-50 text-red-700 rounded-lg">
          <h2 className="font-bold">{t('error.title')}</h2>
          <p>{t('error.description')}</p>
          <details className="mt-4 text-sm">
            <summary>{t('error.technicalDetails')}</summary>
            <pre className="bg-white p-2 rounded mt-2">{error instanceof Error ? error.message : String(error)}</pre>
          </details>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['loans'] })} 
            className="mt-4"
            variant="outline"
          >
            {t('error.retry')}
          </Button>
        </div>
      </main>
    )
  }

  // Show message if user is not associated with any location
  if (profile?.role !== 'admin' && !userLocationId) {
    return (
      <main className="container mx-auto p-6 space-y-4">
        <Card className="w-full">
          <CardContent className="p-8 text-center">
            <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">{t('noLocation.title')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('noLocation.description')}
            </p>
          </CardContent>
        </Card>
      </main>
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
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 tracking-tight">
                  {t('cards.title') || 'Customer Loans'}
                </h1>
                <p className="text-slate-600 text-sm font-medium">
                  {profile?.role === 'admin' && currentLocation && currentLocation.name}
                  {profile?.role !== 'admin' && profile?.location && profile.location.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1.5 bg-gradient-to-br from-teal-50 to-emerald-100 border-2 border-teal-300 shadow-sm">
                <CreditCard className="h-3 w-3 mr-1.5" />
                <span className="text-sm font-semibold text-teal-900">{loans.length}</span>
                <span className="text-xs text-teal-600 font-semibold ml-1">{loans.length === 1 ? 'Loan' : 'Loans'}</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-6 space-y-6">

      {/* Statistics Cards - KPI Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Loans Card */}
        <Card className="border-2 border-teal-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
          <CardContent className="p-0">
            <div className="p-6 bg-gradient-to-br from-teal-500 to-teal-600">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm font-semibold text-teal-100">{t('cards.totalLoans.title')}</p>
              <div className="text-3xl font-black text-white mt-2">
                {loans.length}
              </div>
              <p className="text-xs text-teal-100 mt-3 font-medium">
                Active loan records
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Amount Card */}
        <Card className="border-2 border-emerald-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
          <CardContent className="p-0">
            <div className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm font-semibold text-emerald-100">{t('cards.totalAmount.title')}</p>
              <div className="text-3xl font-black text-white mt-2">
                {formatCurrency(getTotalLoanAmount())}
              </div>
              <p className="text-xs text-emerald-100 mt-3 font-medium">
                Total loan value
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Loans Card */}
        <Card className="border-2 border-slate-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
          <CardContent className="p-0">
            <div className="p-6 bg-gradient-to-br from-slate-500 to-slate-600">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-100">{t('cards.pending.title')}</p>
              <div className="text-3xl font-black text-white mt-2">
                {getPendingLoansCount()}
              </div>
              <p className="text-xs text-slate-100 mt-3 font-medium">
                Awaiting payment
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Paid Loans Card */}
        <Card className="border-2 border-green-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
          <CardContent className="p-0">
            <div className="p-6 bg-gradient-to-br from-green-500 to-green-600">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm font-semibold text-green-100">{t('cards.paid.title')}</p>
              <div className="text-3xl font-black text-white mt-2">
                {getPaidLoansCount()}
              </div>
              <p className="text-xs text-green-100 mt-3 font-medium">
                Successfully completed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-100 p-1">
        <TabsTrigger value="all-loans" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
          <CreditCard className="h-4 w-4" />
          {t('tabs.all-loans.title')}
        </TabsTrigger>
        <TabsTrigger value="customer-notebooks" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
          <BookOpen className="h-4 w-4" />
          {t('tabs.customer-notebooks.title')}
        </TabsTrigger>
        {selectedCustomerForNotebook && (
          <TabsTrigger value="customer-notebook" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
            <User className="h-4 w-4" />
            {selectedCustomerForNotebook.first_name} {selectedCustomerForNotebook.last_name}
          </TabsTrigger>
        )}
          </TabsList>
          
          {activeTab !== "customer-notebooks" && (
        <Button
          size="sm"
          onClick={() => {
            setSelectedCustomer(null)
            setCustomerSearch("")
            setIsAddingForSpecificCustomer(false)
            setIsNewLoanDialogOpen(true)
          }}
          className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md"
        >
          <Plus className="h-4 w-4" />
          {t('tabs.actions.addLoan.title')}
        </Button>
          )}
        </div>

        {/* All Loans Tab */}
        <TabsContent value="all-loans" className="space-y-4">
          <Card className="w-full">
        <CardHeader className="p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          {t('tabs.all-loans.title')}
            </CardTitle>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t('tabs.all-loans.search.placeholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-10"
          />
            </div>
            <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('tabs.all-loans.filters.status.title')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tabs.all-loans.filters.status.all')}</SelectItem>
              <SelectItem value="pending">{t('tabs.all-loans.filters.status.pending')}</SelectItem>
              <SelectItem value="paid">{t('tabs.all-loans.filters.status.paid')}</SelectItem>
            </SelectContent>
          </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50 border-b-2 border-teal-200">
              <th className="text-left p-4 font-semibold text-slate-700">{t('tabs.all-loans.table.columns.loanId')}</th>
              <th className="text-left p-4 font-semibold text-slate-700">{t('tabs.all-loans.table.columns.customer')}</th>
              {profile?.role === 'admin' && (
            <th className="text-left p-4 font-semibold text-slate-700">{t('tabs.all-loans.table.columns.location')}</th>
              )}
              <th className="text-left p-4 font-semibold text-slate-700">{t('tabs.all-loans.table.columns.amount')}</th>
              <th className="text-left p-4 font-semibold text-slate-700">{t('tabs.all-loans.table.columns.loanDate')}</th>
              <th className="text-left p-4 font-semibold text-slate-700">{t('tabs.all-loans.table.columns.dueDate')}</th>
              <th className="text-left p-4 font-semibold text-slate-700">{t('tabs.all-loans.table.columns.status')}</th>
              <th className="text-left p-4 font-semibold text-slate-700">{t('tabs.all-loans.table.columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedLoans.map((loan) => {
              const statusInfo = getLoanStatus(loan.status)
              const StatusIcon = statusInfo.icon
              const isPaid = loan.status === 'paid'
              
              return (
                <tr 
                  key={loan.id} 
                  className={`border-b hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-emerald-50/50 transition-colors ${isPaid ? 'opacity-60' : ''}`}
                >
                  <td className="p-4">
                    <div className="font-medium">#{loan.id}</div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {loan.customerName}
                      </div>
                      {loan.customerEmail !== "N/A" && (
                        <div className="text-sm text-muted-foreground">{loan.customerEmail}</div>
                      )}
                    </div>
                  </td>
                  {profile?.role === 'admin' && (
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-3 w-3" />
                        {loan.locationName}
                      </div>
                    </td>
                  )}
                  <td className="p-4">
                    <div className="font-bold text-lg">{formatCurrency(loan.amount)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDate(loan.loanDate)}
                    </div>
                  </td>
                  <td className="p-4">
                    {loan.dueDate ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(loan.dueDate)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {t('tabs.all-loans.table.noDueDate')}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span className="text-sm font-medium">{statusInfo.text}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLoan(loan)}
                        title={t('tabs.all-loans.table.actions.view')}
                        className="hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isPaid ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLoan(loan)}
                            title={t('tabs.all-loans.table.actions.edit')}
                            className="hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePaymentLoan(loan)}
                            title={t('tabs.all-loans.table.actions.markAsPaid')}
                            className="text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLoan(loan.id)}
                            title={t('tabs.all-loans.table.actions.delete')}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('tabs.all-loans.table.completed')}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
            </table>
          </div>
          {filteredLoans.length === 0 && (
            <div className="text-center py-16 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg">
          <div className="p-4 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <CreditCard className="h-10 w-10 text-teal-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-2 text-lg">{t('tabs.all-loans.table.noLoans.title')}</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {searchTerm || statusFilter !== "all"
              ? t('tabs.all-loans.table.noLoans.withFilters')
              : t('tabs.all-loans.table.noLoans.noLoansYet')
            }
          </p>
          {!searchTerm && statusFilter === "all" && (
            <Button
              onClick={() => setIsNewLoanDialogOpen(true)}
              className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Loan
            </Button>
          )}
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {t('tabs.all-loans.table.pagination.showing')} {startIndex + 1} {t('tabs.all-loans.table.pagination.to')} {Math.min(startIndex + itemsPerPage, filteredLoans.length)} {t('tabs.all-loans.table.pagination.of')} {filteredLoans.length} {t('tabs.all-loans.table.pagination.results')}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              {t('tabs.all-loans.table.pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              {t('tabs.all-loans.table.pagination.next')}
            </Button>
          </div>
            </div>
          )}
        </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Notebooks Tab */}
        <TabsContent value="customer-notebooks" className="space-y-4">
          <Card className="w-full">
            <CardHeader className="p-6">
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {t('tabs.customer-notebooks.title')}
              </CardTitle>
              <p className="text-muted-foreground">
                {t('tabs.customer-notebooks.description')}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {customers.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg">
                  <div className="p-4 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-10 w-10 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2 text-lg">{t('tabs.customer-notebooks.noCustomers.title')}</h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">{t('tabs.customer-notebooks.noCustomers.description')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customers.map((customer) => {
                    const stats = getCustomerStats(customer.customer_id.toString())

                    return (
                      <Card
                        key={customer.customer_id}
                        className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-teal-200 bg-gradient-to-br from-white to-teal-50/30"
                        onClick={() => handleSelectCustomerForNotebook(customer)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">
                                {customer.first_name} {customer.last_name}
                              </h3>
                              {customer.email && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  {customer.email}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mt-4 mb-3">
                            <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                              <p className="text-blue-600 text-xs font-medium">
                                {t('tabs.customer-notebooks.customerCard.stats.loans')}
                              </p>
                              <p className="font-bold text-blue-700">{stats.totalLoans}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                              <p className="text-gray-600 text-xs font-medium">
                                {t('tabs.customer-notebooks.customerCard.stats.amount')}
                              </p>
                              <p className="font-bold text-gray-700">{formatCurrency(stats.totalAmount)}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-2 border border-red-100">
                              <p className="text-red-600 text-xs font-medium">
                                {t('tabs.customer-notebooks.customerCard.stats.pending')}
                              </p>
                              <p className="font-bold text-red-700">{stats.pendingCount}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                              <p className="text-green-600 text-xs font-medium">
                                {t('tabs.customer-notebooks.customerCard.stats.paid')}
                              </p>
                              <p className="font-bold text-green-700">{stats.paidCount}</p>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectCustomerForNotebook(customer)
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {t('tabs.customer-notebooks.customerCard.buttons.view')}
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddLoanForCustomer(customer)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {t('tabs.customer-notebooks.customerCard.buttons.addLoan')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Customer Notebook Tab */}
        <TabsContent value="customer-notebook" className="space-y-4">
          {selectedCustomerForNotebook ? (
            <>
              <Card className="w-full">
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {t('tabs.customer-notebook.loanTitle', {
                          name: `${selectedCustomerForNotebook.first_name} ${selectedCustomerForNotebook.last_name}`,
                        })}
                      </CardTitle>
                      {selectedCustomerForNotebook.email && (
                        <p className="text-muted-foreground">{selectedCustomerForNotebook.email}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddLoanForCustomer(selectedCustomerForNotebook)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {t('tabs.customer-notebook.actions.addLoan')}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder={t('tabs.customer-notebook.filters.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                          setStatusFilter(value)
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder={t('tabs.customer-notebook.filters.allStatus')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('tabs.customer-notebook.filters.allStatus')}</SelectItem>
                          <SelectItem value="pending">{t('tabs.all-loans.filters.status.pending')}</SelectItem>
                          <SelectItem value="paid">{t('tabs.all-loans.filters.status.paid')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50 border-b-2 border-teal-200">
                          <th className="text-left p-4 font-semibold text-gray-700">{t('tabs.customer-notebook.table.columns.loanId')}</th>
                          <th className="text-left p-4 font-semibold text-gray-700">{t('tabs.customer-notebook.table.columns.amount')}</th>
                          <th className="text-left p-4 font-semibold text-gray-700">{t('tabs.customer-notebook.table.columns.loanDate')}</th>
                          <th className="text-left p-4 font-semibold text-gray-700">{t('tabs.customer-notebook.table.columns.dueDate')}</th>
                          <th className="text-left p-4 font-semibold text-gray-700">{t('tabs.customer-notebook.table.columns.status')}</th>
                          <th className="text-left p-4 font-semibold text-gray-700">{t('tabs.customer-notebook.table.columns.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {paginatedLoans.map((loan) => {
                          const statusInfo = getLoanStatus(loan.status)
                          const StatusIcon = statusInfo.icon
                          const isPaid = loan.status === 'paid'

                          return (
                            <tr
                              key={loan.id}
                              className={`border-b hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors ${isPaid ? 'opacity-60' : ''}`}
                            >
                              <td className="p-4">
                                <div className="font-medium">#{loan.id}</div>
                              </td>
                              <td className="p-4">
                                <div className="font-bold text-lg">{formatCurrency(loan.amount)}</div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(loan.loanDate)}
                                </div>
                              </td>
                              <td className="p-4">
                                {loan.dueDate ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(loan.dueDate)}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {t('tabs.customer-notebook.table.noDueDate')}
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  <span className="text-sm font-medium">{statusInfo.text}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewLoan(loan)}
                                    title={t('tabs.customer-notebook.actions.viewDetails')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>

                                  {!isPaid ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditLoan(loan)}
                                        title={t('tabs.customer-notebook.actions.editLoan')}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePaymentLoan(loan)}
                                        title={t('tabs.customer-notebook.actions.markAsPaid')}
                                        className="text-green-600 hover:text-green-700"
                                      >
                                        <DollarSign className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteLoan(loan.id)}
                                        title={t('tabs.customer-notebook.actions.deleteLoan')}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      {t('tabs.customer-notebook.table.completed')}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filteredLoans.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="font-medium mb-2">{t('tabs.customer-notebook.table.noLoans.title')}</h3>
                      <p className="text-sm">
                        {searchTerm || statusFilter !== 'all'
                          ? t('tabs.customer-notebook.table.noLoans.withFilters')
                          : t('tabs.customer-notebook.table.noLoans.noLoansYet')}
                      </p>
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        {t('tabs.all-loans.table.pagination.showing')} {startIndex + 1}{' '}
                        {t('tabs.all-loans.table.pagination.to')} {Math.min(startIndex + itemsPerPage, filteredLoans.length)}{' '}
                        {t('tabs.all-loans.table.pagination.of')} {filteredLoans.length}{' '}
                        {t('tabs.all-loans.table.pagination.results')}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          {t('tabs.all-loans.table.pagination.previous')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          {t('tabs.all-loans.table.pagination.next')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* New Loan Dialog */}
      {/* New Loan Dialog - Improved UI */}
<Dialog open={isNewLoanDialogOpen} onOpenChange={(open) => {
  setIsNewLoanDialogOpen(open)
  if (!open) {
    resetNewLoanForm()
  }
}}>
  <DialogContent className="sm:max-w-[550px]">
    <DialogHeader className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 -m-6 mb-4 p-6 rounded-t-lg">
      <DialogTitle className="text-xl flex items-center gap-2 text-white">
        <CreditCard className="h-5 w-5" />
        {t('addnewform.title')}
      </DialogTitle>
      <DialogDescription className="text-white/90">
        {isAddingForSpecificCustomer
          ? t('addnewform.description.specificCustomer', {
              name: `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`,
            })
          : t('addnewform.description.general')}
      </DialogDescription>

      {profile?.role === 'admin' && currentLocation ? (
        <div className="mt-2 p-3 bg-white/20 rounded-md border border-white/30">
          <p className="text-sm text-white flex items-center gap-2">
            <Building className="h-4 w-4" />
            {t('addnewform.locationNotice', {
              location: currentLocation.name,
            })}
          </p>
        </div>
      ) : profile?.location ? (
        <div className="mt-2 p-3 bg-white/20 rounded-md border border-white/30">
          <p className="text-sm text-white flex items-center gap-2">
            <Building className="h-4 w-4" />
            {t('addnewform.locationNotice', {
              location: profile.location.name ?? '-',
            })}
          </p>
        </div>
      ) : null}
    </DialogHeader>

    <div className="grid gap-6 py-4">
      {/* Customer Selection */}
      {!isAddingForSpecificCustomer ? (
        <div className="space-y-3">
          <Label htmlFor="customerSearch" className="text-sm font-medium">
            {t('addnewform.fields.selectCustomer')} <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="customerSearch"
                placeholder={t('addnewform.fields.searchPlaceholder')}
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="pl-10"
              />
              {customerSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    setCustomerSearch("")
                    setSelectedCustomer(null)
                    setShowCustomerDropdown(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Customer Dropdown */}
            {showCustomerDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomersForSearch.length > 0 ? (
                  filteredCustomersForSearch.map((customer) => (
                    <div
                      key={customer.customer_id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                          {customer.email && (
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('addnewform.fields.noCustomersFound')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Customer Display */}
          {selectedCustomer && (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-medium text-green-800">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </div>
                    {selectedCustomer.email && (
                      <div className="text-sm text-green-600">{selectedCustomer.email}</div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCustomer(null)
                    setCustomerSearch("")
                  }}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t('addnewform.fields.customer')}</Label>
          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <User className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <div className="font-medium text-teal-800">
                  {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                </div>
                {selectedCustomer?.email && (
                  <div className="text-sm text-teal-600">{selectedCustomer?.email}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Amount */}
      <div className="space-y-3">
        <Label htmlFor="amount" className="text-sm font-medium">
          {t('addnewform.fields.amount')} <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={newLoan.amount}
            onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>

      {/* Due Date */}
      <div className="space-y-3">
        <Label htmlFor="dueDate" className="text-sm font-medium">
          {t('addnewform.fields.dueDateOptional')}
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="dueDate"
            type="date"
            value={newLoan.dueDate}
            onChange={(e) => setNewLoan({ ...newLoan, dueDate: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-3">
        <Label htmlFor="status" className="text-sm font-medium">
          {t('addnewform.fields.status')}
        </Label>
        <Select
          value={newLoan.status}
          onValueChange={(value) => setNewLoan({ ...newLoan, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('addnewform.statusOptions.pending')}
              </div>
            </SelectItem>
            <SelectItem value="paid">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {t('addnewform.statusOptions.paid')}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <DialogFooter className="flex justify-end gap-2 pt-4">
      <Button variant="outline" onClick={() => setIsNewLoanDialogOpen(false)}>
        {t('addnewform.buttons.cancel')}
      </Button>
      <Button
        onClick={handleCreateLoan}
        disabled={createLoanMutation.isPending || !selectedCustomer || !newLoan.amount}
        className="min-w-[120px]"
      >
        {createLoanMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('addnewform.buttons.creating')}
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            {t('addnewform.buttons.create')}
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
  </Dialog>
{/* Edit Loan Dialog */}
<Dialog open={isEditLoanDialogOpen} onOpenChange={setIsEditLoanDialogOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 -m-6 mb-4 p-6 rounded-t-lg">
  <DialogTitle className="text-xl flex items-center gap-2 text-white">
    <Edit className="h-5 w-5" />
    {t('updateform.title')}
  </DialogTitle>
  <DialogDescription className="text-white/90">
    {t('updateform.description')}
  </DialogDescription>
    </DialogHeader>
    
  <div className="space-y-2">
    <Label htmlFor="editAmount" className="text-sm font-medium">
      {t('updateform.fields.amount')}
    </Label>
    <Input
      id="editAmount"
      type="number"
      step="0.01"
      min="0"
      placeholder="0.00"
      value={editLoan.amount}
      onChange={(e) => setEditLoan({ ...editLoan, amount: e.target.value })}
    />
  </div>
  <div className="space-y-2">
    <Label htmlFor="editDueDate" className="text-sm font-medium">
      {t('updateform.fields.dueDateOptional')}
    </Label>
    <Input
      id="editDueDate"
      type="date"
      value={editLoan.dueDate}
      onChange={(e) => setEditLoan({ ...editLoan, dueDate: e.target.value })}
    />
  </div>
  <div className="space-y-2">
    <Label htmlFor="editStatus" className="text-sm font-medium">
      {t('updateform.fields.status')}
    </Label>
    <Select
      value={editLoan.status}
      onValueChange={(value) => setEditLoan({ ...editLoan, status: value })}
    >
      <SelectTrigger id="editStatus">
    <SelectValue />
      </SelectTrigger>
      <SelectContent>
    <SelectItem value="pending">{t('updateform.statusOptions.pending')}</SelectItem>
    <SelectItem value="paid">{t('updateform.statusOptions.paid')}</SelectItem>
      </SelectContent>
    </Select>
  </div>
    
    <div className="flex justify-end gap-2">
  <Button variant="outline" onClick={() => setIsEditLoanDialogOpen(false)}>
    {t('updateform.buttons.cancel')}
  </Button>
  <Button
    onClick={handleUpdateLoan}
    disabled={updateLoanMutation.isPending || !editLoan.amount}
    className="min-w-[140px]"
  >
    {updateLoanMutation.isPending ? (
      <>
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
    {t('updateform.buttons.updating')}
      </>
    ) : (
      t('updateform.buttons.update')
    )}
  </Button>
    </div>
  </DialogContent>
  </Dialog>
{/* Payment Dialog */}
<Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 -m-6 mb-4 p-6 rounded-t-lg">
  <DialogTitle className="text-xl flex items-center gap-2 text-white">
    <CheckCircle className="h-5 w-5" />
    {t('paymentDialog.title')}
  </DialogTitle>
  <DialogDescription className="text-white/90">{t('paymentDialog.description')}</DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
  {selectedLoan ? (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-2 gap-2 text-sm">
    <div>
      <p className="text-muted-foreground">{t('paymentDialog.loanAmount')}</p>
      <p className="font-medium">{formatCurrency(selectedLoan.amount)}</p>
    </div>
    <div>
      <p className="text-muted-foreground">{t('paymentDialog.customer')}</p>
      <p className="font-medium">{selectedLoan.customerName}</p>
    </div>
    {profile?.role === 'admin' && selectedLoan.locationName && (
      <div>
        <p className="text-muted-foreground">{t('paymentDialog.location')}</p>
        <p className="font-medium">{selectedLoan.locationName}</p>
      </div>
    )}
      </div>
    </div>
  ) : null}
    </div>
    <div className="flex justify-end gap-2">
  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
    {t('paymentDialog.actions.cancel')}
  </Button>
  <Button
    onClick={handlePaymentSubmit}
    disabled={updateLoanMutation.isPending}
    className="bg-emerald-600 hover:bg-emerald-700"
  >
    {updateLoanMutation.isPending ? (
      <>
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
    {t('paymentDialog.actions.processing')}
      </>
    ) : (
      t('paymentDialog.actions.markAsPaid')
    )}
  </Button>
    </div>
  </DialogContent>
  </Dialog>
{/* View Loan Dialog */}
<Dialog open={isViewLoanDialogOpen} onOpenChange={setIsViewLoanDialogOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 -m-6 mb-4 p-6 rounded-t-lg">
  <DialogTitle className="text-xl flex items-center gap-2 text-white">
    <Eye className="h-5 w-5" />
    {t('viewLoanDialog.title')}
  </DialogTitle>
  <DialogDescription className="text-white/90">{t('viewLoanDialog.description')}</DialogDescription>
    </DialogHeader>
    {selectedLoan ? (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
    <Label className="text-sm font-medium">{t('viewLoanDialog.fields.loanId')}</Label>
    <p className="text-sm">#{selectedLoan.id}</p>
      </div>
      <div>
    <Label className="text-sm font-medium">{t('viewLoanDialog.fields.amount')}</Label>
    <p className="text-lg font-bold">{formatCurrency(selectedLoan.amount)}</p>
      </div>
      <div>
    <Label className="text-sm font-medium">{t('viewLoanDialog.fields.customer')}</Label>
    <p className="text-sm">{selectedLoan.customerName}</p>
      </div>
      <div>
    <Label className="text-sm font-medium">{t('viewLoanDialog.fields.customerEmail')}</Label>
    <p className="text-sm">{selectedLoan.customerEmail}</p>
      </div>
      {profile?.role === 'admin' && selectedLoan.locationName && (
    <div>
      <Label className="text-sm font-medium">{t('viewLoanDialog.fields.location')}</Label>
      <p className="text-sm">{selectedLoan.locationName}</p>
    </div>
      )}
      <div>
    <Label className="text-sm font-medium">{t('viewLoanDialog.fields.loanDate')}</Label>
    <p className="text-sm">{formatDate(selectedLoan.loanDate)}</p>
      </div>
      <div>
    <Label className="text-sm font-medium">{t('viewLoanDialog.fields.dueDate')}</Label>
    <p className="text-sm">
      {selectedLoan.dueDate ? formatDate(selectedLoan.dueDate) : t('viewLoanDialog.fields.noDueDate')}
    </p>
      </div>
    </div>

    <div className="space-y-2">
      <Label className="text-sm font-medium">{t('viewLoanDialog.fields.status')}</Label>
      <div className="flex items-center gap-2">
    {selectedLoanStatusInfo && SelectedLoanStatusIcon ? (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${selectedLoanStatusInfo.bgColor} ${selectedLoanStatusInfo.textColor}`}
      >
        <SelectedLoanStatusIcon className="h-4 w-4" />
        <span className="font-medium">{selectedLoanStatusInfo.text}</span>
      </div>
    ) : null}
      </div>
    </div>
  </div>
    ) : null}
  </DialogContent>
</Dialog>
    </main>
    </div>
  )
}