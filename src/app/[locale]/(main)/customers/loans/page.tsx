"use client"
import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
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
  Building,
  Filter
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
  const [loans, setLoans] = useState<Loan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("current") // Default to current location
  const [isNewLoanDialogOpen, setIsNewLoanDialogOpen] = useState(false)
  const [isViewLoanDialogOpen, setIsViewLoanDialogOpen] = useState(false)
  const [isEditLoanDialogOpen, setIsEditLoanDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Fetch loans and customers data


// Replace the fetchData function with this corrected version:

const fetchData = async () => {
  try {
    setLoading(true)
    setError(null)
    
    // Build query based on user role and location
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

    // For non-admin users, use location_id from their profile
    if (profile?.role !== 'admin' && userLocationId) {
      loansQuery = loansQuery.eq('location_id', userLocationId)
    } 
    // For admin users, filter based on selected location
    else if (profile?.role === 'admin') {
      if (selectedLocation === "current" && currentLocation) {
        loansQuery = loansQuery.eq('location_id', currentLocation.location_id)
      } else if (selectedLocation !== "all") {
        loansQuery = loansQuery.eq('location_id', parseInt(selectedLocation))
      }
      // If selectedLocation is "all", don't add a location filter
    }

    const { data: loansData, error: loansError } = await loansQuery
      .order("loan_date", { ascending: false })
    
    if (loansError) throw new Error(`Loans error: ${loansError.message}`)
    
    // Fetch all customers for dropdown - also filtered by location
    let customersQuery = supabase
      .from("customers")
      .select("customer_id, first_name, last_name, email, location_id")
      .order("first_name", { ascending: true })

    // For non-admin users, use location_id from their profile
    if (profile?.role !== 'admin' && userLocationId) {
      customersQuery = customersQuery.eq('location_id', userLocationId)
    } 
    // For admin users, filter based on selected location
    else if (profile?.role === 'admin') {
      if (selectedLocation === "current" && currentLocation) {
        customersQuery = customersQuery.eq('location_id', currentLocation.location_id)
      } else if (selectedLocation !== "all") {
        customersQuery = customersQuery.eq('location_id', parseInt(selectedLocation))
      }
      // If selectedLocation is "all", don't add a location filter
    }

    const { data: customersData, error: customersError } = await customersQuery
    
    if (customersError) throw new Error(`Customers error: ${customersError.message}`)
    
    // Transform loans data with proper typing
    const transformedLoans = loansData?.map(loan => {
      // Access the first element of the nested arrays (since Supabase returns arrays for joined tables)
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
    
    setLoans(transformedLoans)
    setCustomers(customersData || [])
  } catch (err) {
    console.error("Error loading data:", err)
    setError(err instanceof Error ? err.message : "Unknown error occurred")
  } finally {
    setLoading(false)
  }
}
  useEffect(() => {
    if (!authLoading && !locationLoading && profile) {
      fetchData()
    }
  }, [profile, authLoading, locationLoading, selectedLocation])

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
    
    // Non-admin users must have a location_id in their profile
    if (profile?.role !== 'admin' && !userLocationId) {
      toast.error("Your account is not associated with any location")
      return
    }
    
    setIsSubmitting(true)
    try {
      const loanData: any = {
        customer_id: selectedCustomer.customer_id,
        loan_amount: parseFloat(newLoan.amount),
        due_date: newLoan.dueDate || null,
        status: newLoan.status,
      }

      // Add location_id from user's profile
      if (userLocationId) {
        loanData.location_id = userLocationId
      }

      const { data, error } = await supabase
        .from("loans")
        .insert([loanData])
        .select()
      
      if (error) throw error
      
      toast.success("Loan created successfully!")
      setIsNewLoanDialogOpen(false)
      setNewLoan({
        amount: "",
        dueDate: "",
        status: "pending"
      })
      setSelectedCustomer(null)
      setCustomerSearch("")
      setIsAddingForSpecificCustomer(false)
      
      await fetchData()
    } catch (error) {
      console.error("Error creating loan:", error)
      toast.error("Failed to create loan")
    } finally {
      setIsSubmitting(false)
    }
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
    
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("loans")
        .update({
          loan_amount: parseFloat(editLoan.amount),
          due_date: editLoan.dueDate || null,
          status: editLoan.status,
        })
        .eq("loan_id", parseInt(selectedLoan.id))
      
      if (error) throw error
      
      toast.success("Loan updated successfully!")
      setIsEditLoanDialogOpen(false)
      
      await fetchData()
    } catch (error) {
      console.error("Error updating loan:", error)
      toast.error("Failed to update loan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentSubmit = async () => {
    if (!selectedLoan) {
      toast.error("No loan selected")
      return
    }
    
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("loans")
        .update({
          status: 'paid',
        })
        .eq("loan_id", parseInt(selectedLoan.id))
      
      if (error) throw error
      
      toast.success("Loan marked as paid successfully!")
      setIsPaymentDialogOpen(false)
      
      await fetchData()
    } catch (error) {
      console.error("Error marking loan as paid:", error)
      toast.error("Failed to mark loan as paid")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm("Are you sure you want to delete this loan? This action cannot be undone.")) {
      return
    }
    
    try {
      const { error } = await supabase
        .from("loans")
        .delete()
        .eq("loan_id", parseInt(loanId))
      
      if (error) throw error
      
      toast.success("Loan deleted successfully!")
      await fetchData()
    } catch (error) {
      console.error("Error deleting loan:", error)
      toast.error("Failed to delete loan")
    }
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
            <pre className="bg-white p-2 rounded mt-2">{error}</pre>
          </details>
          <Button 
            onClick={fetchData} 
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
    <main className="container mx-auto p-6 space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('cards.totalLoans.title')}</p>
            <p className="text-xl font-bold">{loans.length}</p>
          </div>
        </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('cards.totalAmount.title')}</p>
            <p className="text-xl font-bold">{formatCurrency(getTotalLoanAmount())}</p>
          </div>
        </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Clock className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('cards.pending.title')}</p>
            <p className="text-xl font-bold">{getPendingLoansCount()}</p>
          </div>
        </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('cards.paid.title')}</p>
            <p className="text-xl font-bold">{getPaidLoansCount()}</p>
          </div>
        </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
        <TabsTrigger value="all-loans" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          {t('tabs.all-loans.title')}
        </TabsTrigger>
        <TabsTrigger value="customer-notebooks" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          {t('tabs.customer-notebooks.title')}
        </TabsTrigger>
        {selectedCustomerForNotebook && (
          <TabsTrigger value="customer-notebook" className="flex items-center gap-2">
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
          className="gap-2"
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
          {/* Location Filter for Admin Users */}
          {profile?.role === 'admin' && (
            <Select
              value={selectedLocation}
              onValueChange={(value) => {
            setSelectedLocation(value)
            setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('tabs.all-loans.filters.location.title')} />
              </SelectTrigger>
              <SelectContent>
            <SelectItem value="current">
              {t('tabs.all-loans.filters.location.current', {
                name: currentLocation?.name || '-'
              })}
            </SelectItem>
            <SelectItem value="all">{t('tabs.all-loans.filters.location.all')}</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.location_id} value={location.location_id.toString()}>
                {location.name}
              </SelectItem>
            ))}
              </SelectContent>
            </Select>
          )}
          
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
          <div className="overflow-x-auto">
            <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 font-medium">{t('tabs.all-loans.table.columns.loanId')}</th>
              <th className="text-left p-4 font-medium">{t('tabs.all-loans.table.columns.customer')}</th>
              {profile?.role === 'admin' && (
            <th className="text-left p-4 font-medium">{t('tabs.all-loans.table.columns.location')}</th>
              )}
              <th className="text-left p-4 font-medium">{t('tabs.all-loans.table.columns.amount')}</th>
              <th className="text-left p-4 font-medium">{t('tabs.all-loans.table.columns.loanDate')}</th>
              <th className="text-left p-4 font-medium">{t('tabs.all-loans.table.columns.dueDate')}</th>
              <th className="text-left p-4 font-medium">{t('tabs.all-loans.table.columns.status')}</th>
              <th className="text-left p-4 font-medium">{t('tabs.all-loans.table.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLoans.map((loan) => {
              const statusInfo = getLoanStatus(loan.status)
              const StatusIcon = statusInfo.icon
              const isPaid = loan.status === 'paid'
              
              return (
                <tr 
                  key={loan.id} 
                  className={`border-b hover:bg-gray-50 ${isPaid ? 'opacity-50' : ''}`}
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
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePaymentLoan(loan)}
                            title={t('tabs.all-loans.table.actions.markAsPaid')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLoan(loan.id)}
                            title={t('tabs.all-loans.table.actions.delete')}
                            className="text-red-600 hover:text-red-700"
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
            <div className="text-center py-8 text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-medium mb-2">{t('tabs.all-loans.table.noLoans.title')}</h3>
          <p className="text-sm">
            {searchTerm || statusFilter !== "all" || (profile?.role === 'admin' && selectedLocation !== "all")
              ? t('tabs.all-loans.table.noLoans.withFilters')
              : t('tabs.all-loans.table.noLoans.noLoansYet')
            }
          </p>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">{t('tabs.customer-notebooks.noCustomers.title')}</h3>
                  <p className="text-sm">{t('tabs.customer-notebooks.noCustomers.description')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customers.map((customer) => {
                    const stats = getCustomerStats(customer.customer_id.toString())

                    return (
                      <Card
                        key={customer.customer_id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleSelectCustomerForNotebook(customer)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">
                                {customer.first_name} {customer.last_name}
                              </h3>
                              {customer.email && (
                                <p className="text-sm text-muted-foreground">
                                  {t('tabs.customer-notebooks.customerCard.email')}: {customer.email}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">
                                {t('tabs.customer-notebooks.customerCard.stats.loans')}
                              </p>
                              <p className="font-medium">{stats.totalLoans}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                {t('tabs.customer-notebooks.customerCard.stats.amount')}
                              </p>
                              <p className="font-medium">{formatCurrency(stats.totalAmount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                {t('tabs.customer-notebooks.customerCard.stats.pending')}
                              </p>
                              <p className="font-medium text-red-600">{stats.pendingCount}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                {t('tabs.customer-notebooks.customerCard.stats.paid')}
                              </p>
                              <p className="font-medium text-green-600">{stats.paidCount}</p>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectCustomerForNotebook(customer)
                              }}
                            >
                              {t('tabs.customer-notebooks.customerCard.buttons.view')}
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
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
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-medium">{t('tabs.customer-notebook.table.columns.loanId')}</th>
                          <th className="text-left p-4 font-medium">{t('tabs.customer-notebook.table.columns.amount')}</th>
                          <th className="text-left p-4 font-medium">{t('tabs.customer-notebook.table.columns.loanDate')}</th>
                          <th className="text-left p-4 font-medium">{t('tabs.customer-notebook.table.columns.dueDate')}</th>
                          <th className="text-left p-4 font-medium">{t('tabs.customer-notebook.table.columns.status')}</th>
                          <th className="text-left p-4 font-medium">{t('tabs.customer-notebook.table.columns.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLoans.map((loan) => {
                          const statusInfo = getLoanStatus(loan.status)
                          const StatusIcon = statusInfo.icon
                          const isPaid = loan.status === 'paid'

                          return (
                            <tr
                              key={loan.id}
                              className={`border-b hover:bg-gray-50 ${isPaid ? 'opacity-50' : ''}`}
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

              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">
                    {t('tabs.customer-notebook.summary.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {(() => {
                    const stats = getCustomerStats(selectedCustomerForNotebook.customer_id.toString())

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {t('tabs.customer-notebook.summary.stats.totalLoans')}
                          </p>
                          <p className="text-2xl font-bold text-blue-600">{stats.totalLoans}</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {t('tabs.customer-notebook.summary.stats.totalAmount')}
                          </p>
                          <p className="text-2xl font-bold text-gray-700">{formatCurrency(stats.totalAmount)}</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {t('tabs.customer-notebook.summary.stats.pending')}
                          </p>
                          <p className="text-2xl font-bold text-red-600">{stats.pendingCount}</p>
                          <p className="text-sm font-medium text-red-600">{formatCurrency(stats.pendingAmount)}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {t('tabs.customer-notebook.summary.stats.paid')}
                          </p>
                          <p className="text-2xl font-bold text-green-600">{stats.paidCount}</p>
                          <p className="text-sm font-medium text-green-600">{formatCurrency(stats.paidAmount)}</p>
                        </div>
                      </div>
                    )
                  })()}
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
    <DialogHeader>
      <DialogTitle className="text-xl flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        {t('addnewform.title')}
      </DialogTitle>
      <DialogDescription>
        {isAddingForSpecificCustomer
          ? t('addnewform.description.specificCustomer', {
              name: `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`,
            })
          : t('addnewform.description.general')}
      </DialogDescription>

      {profile?.location && (
        <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-700 flex items-center gap-2">
            <Building className="h-4 w-4" />
            {t('addnewform.locationNotice', {
              location: profile.location.name ?? '-',
            })}
          </p>
        </div>
      )}
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
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600" />
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
                  className="text-green-600 hover:text-green-800"
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
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-blue-800">
                  {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                </div>
                {selectedCustomer?.email && (
                  <div className="text-sm text-blue-600">{selectedCustomer?.email}</div>
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
        disabled={isSubmitting || !selectedCustomer || !newLoan.amount}
        className="min-w-[120px]"
      >
        {isSubmitting ? (
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
    <DialogHeader>
  <DialogTitle className="text-xl flex items-center gap-2">
    <Edit className="h-5 w-5 text-primary" />
    {t('updateform.title')}
  </DialogTitle>
  <DialogDescription>
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
    disabled={isSubmitting || !editLoan.amount}
    className="min-w-[140px]"
  >
    {isSubmitting ? (
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
    <DialogHeader>
  <DialogTitle>{t('paymentDialog.title')}</DialogTitle>
  <DialogDescription>{t('paymentDialog.description')}</DialogDescription>
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
    disabled={isSubmitting}
    className="bg-green-600 hover:bg-green-700"
  >
    {isSubmitting ? (
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
    <DialogHeader>
  <DialogTitle>{t('viewLoanDialog.title')}</DialogTitle>
  <DialogDescription>{t('viewLoanDialog.description')}</DialogDescription>
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
  )
}