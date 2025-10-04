"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  Loader2,
  Building,
  User
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "@/contexts/LocationContext"
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'  

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  createdAt: string
  locationId?: number
  locationName?: string
  locationType?: 'store' | 'warehouse'
  loans: Array<{
    loan_id: number
    loan_amount: number
    loan_date: string
    due_date: string
    status: string
  }>
}

export default function CustomersPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false)
  const [isViewCustomerDialogOpen, setIsViewCustomerDialogOpen] = useState(false)
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [walkInCustomers, setWalkInCustomers] = useState<Record<number, Customer>>({}) // Store walk-in customers by location ID
  
  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: ""
  })

  // Edit customer form state
  const [editCustomer, setEditCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: ""
  })

  const supabase = createClient()
  const queryClient = useQueryClient()
  const { profile, loading: authLoading } = useAuth()
  const t = useTranslations('customers')
  const { locations, currentLocation, isLoading: locationLoading } = useLocation()

  // Get the user's location from their profile
  const userLocationId = profile?.location_id

  // Determine which location to use
  const effectiveLocationId = profile?.role === 'admin' 
    ? currentLocation?.location_id 
    : userLocationId

  // Fetch customers data with React Query
  const fetchCustomers = async (): Promise<Customer[]> => {
    // Build query - filter by location based on user role
    let customersQuery = supabase.from("customers").select(`
      *,
      locations(name, location_type)
    `)

    // Apply location filter if we have a location
    if (effectiveLocationId) {
      customersQuery = customersQuery.eq('location_id', effectiveLocationId)
    }

    const { data: customersData, error: customersError } = await customersQuery
      .order("created_at", { ascending: false })

    if (customersError) throw new Error(`Customers error: ${customersError.message}`)

    // Fetch loans data for customer details
    let loansQuery = supabase.from("loans").select(`
      loan_id,
      loan_amount,
      loan_date,
      due_date,
      status,
      customer_id
    `)

    // Filter loans by the same location
    if (effectiveLocationId) {
      loansQuery = loansQuery.eq('location_id', effectiveLocationId)
    }

    const { data: loansData, error: loansError } = await loansQuery

    if (loansError) throw new Error(`Loans error: ${loansError.message}`)

    // Transform customers data - filter out customers from warehouses
    const transformedCustomers = customersData
      ?.filter(customer => customer.locations?.location_type === 'store') // Only show store customers
      .map(customer => ({
        id: customer.customer_id.toString(),
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email || "N/A",
        phone: customer.phone || "N/A",
        address: customer.address || "N/A",
        createdAt: customer.created_at,
        locationId: customer.location_id,
        locationName: customer.locations?.name || "N/A",
        loans: loansData?.filter(loan => loan.customer_id === customer.customer_id) || []
      })) || []

    // Fetch or create walk-in customer for the current location (only if it's a store)
    if (effectiveLocationId) {
      // Get the location details to check if it's a store
      const location = profile?.role === 'admin' 
        ? currentLocation 
        : profile?.location
      
      if (location && location.location_type === 'store') {
        await ensureWalkInCustomer(effectiveLocationId, location.name)
      }
    }

    return transformedCustomers
  }

  // React Query for customers
  const { data: customers = [], isLoading: loading, error } = useQuery({
    queryKey: ['customers', effectiveLocationId, profile?.role],
    queryFn: fetchCustomers,
    enabled: !authLoading && !locationLoading && !!profile && !!effectiveLocationId,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
  })

  // Mutation for creating customer
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: { first_name: string; last_name: string; email?: string | null; phone?: string | null; address?: string | null; location_id: number }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert([customerData])
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success("Customer created successfully!")
      setIsNewCustomerDialogOpen(false)
      setNewCustomer({ firstName: "", lastName: "", email: "", phone: "", address: "" })
    },
    onError: (error) => {
      console.error("Error creating customer:", error)
      toast.error("Failed to create customer")
    }
  })

  // Mutation for updating customer
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ customerId, updateData }: { customerId: number; updateData: any }) => {
      const { error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("customer_id", customerId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success("Customer updated successfully!")
      setIsEditCustomerDialogOpen(false)
    },
    onError: (error) => {
      console.error("Error updating customer:", error)
      toast.error("Failed to update customer")
    }
  })

  // Ensure walk-in customer exists for each location
  const ensureWalkInCustomer = async (locationId: number, locationName: string) => {
    try {
      // Check if walk-in customer already exists for this location
      const { data: existingWalkIn, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("first_name", "Walk-in")
        .eq("location_id", locationId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        throw fetchError
      }

      if (existingWalkIn) {
        // Store the walk-in customer in state with store name
        setWalkInCustomers(prev => ({
          ...prev,
          [locationId]: {
            id: existingWalkIn.customer_id.toString(),
            firstName: "Walk-in",
            lastName: locationName, // Use store name as last name
            email: existingWalkIn.email || "N/A",
            phone: existingWalkIn.phone || "N/A",
            address: existingWalkIn.address || "N/A",
            createdAt: existingWalkIn.created_at,
            locationId: existingWalkIn.location_id,
            locationName: locationName,
            loans: []
          }
        }))
        return existingWalkIn
      } else {
        // Create a new walk-in customer for this location
        const { data: newWalkIn, error: insertError } = await supabase
          .from("customers")
          .insert([{
            first_name: "Walk-in",
            last_name: locationName, // Store name as last name: "Walk-in - StoreName"
            email: `walkin-${locationId}@example.com`,
            phone: "000-000-0000",
            address: locationName,
            location_id: locationId
          }])
          .select()
          .single()

        if (insertError) throw insertError

        // Store the walk-in customer in state
        setWalkInCustomers(prev => ({
          ...prev,
          [locationId]: {
            id: newWalkIn.customer_id.toString(),
            firstName: "Walk-in",
            lastName: locationName, // Use store name as last name
            email: newWalkIn.email || "N/A",
            phone: newWalkIn.phone || "N/A",
            address: newWalkIn.address || "N/A",
            createdAt: newWalkIn.created_at,
            locationId: newWalkIn.location_id,
            locationName: locationName,
            loans: []
          }
        }))

        return newWalkIn
      }
    } catch (error) {
      console.error("Error ensuring walk-in customer:", error)
      toast.error("Failed to set up walk-in customer")
      return null
    }
  }

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers]

    // Filter out walk-in customers from the main list (first_name is "Walk-in")
    filtered = filtered.filter(customer => 
      customer.firstName !== "Walk-in"
    )

    if (searchTerm) {
      filtered = filtered.filter(
        (customer) =>
          customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm)
      )
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((customer) => {
        if (selectedStatus === "with_loans") {
          return customer.loans.length > 0
        } else if (selectedStatus === "no_loans") {
          return customer.loans.length === 0
        }
        return true
      })
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [customers, searchTerm, selectedStatus])

  // Pagination
  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage)

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
      currency: "AFN",
    }).format(amount)
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsViewCustomerDialogOpen(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    // Prevent editing walk-in customers
    if (customer.firstName === "Walk-in") {
      toast.error("Walk-in customer cannot be edited")
      return
    }

    setSelectedCustomer(customer)
    setEditCustomer({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email === "N/A" ? "" : customer.email,
      phone: customer.phone === "N/A" ? "" : customer.phone,
      address: customer.address === "N/A" ? "" : customer.address
    })
    setIsEditCustomerDialogOpen(true)
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.firstName || !newCustomer.lastName) {
      toast.error("First name and last name are required")
      return
    }

    // Determine the location to use based on user role
    let targetLocationId: number | undefined
    let targetLocation: { location_type: string } | undefined
    
    if (profile?.role === 'admin') {
      // Admin users: use currentLocation from LocationContext
      targetLocationId = currentLocation?.location_id
      targetLocation = currentLocation ?? undefined
    } else {
      // Non-admin users: use location from their profile
      targetLocationId = userLocationId ?? undefined
      targetLocation = profile?.location ?? undefined
    }

    // Validate location
    if (!targetLocationId) {
      toast.error("No location selected. Please select a location first.")
      return
    }

    // Check if the target location is a store (not a warehouse)
    if (targetLocation?.location_type === 'warehouse') {
      toast.error("Customers can only be created for store locations, not warehouses")
      return
    }

    const customerData = {
      first_name: newCustomer.firstName,
      last_name: newCustomer.lastName,
      email: newCustomer.email || null,
      phone: newCustomer.phone || null,
      address: newCustomer.address || null,
      location_id: targetLocationId,
    }

    createCustomerMutation.mutate(customerData)
  }

  const handleUpdateCustomer = async () => {
    if (!editCustomer.firstName || !editCustomer.lastName || !selectedCustomer) {
      toast.error("First name and last name are required")
      return
    }

    const updateData = {
      first_name: editCustomer.firstName,
      last_name: editCustomer.lastName,
      email: editCustomer.email || null,
      phone: editCustomer.phone || null,
      address: editCustomer.address || null,
    }

    updateCustomerMutation.mutate({
      customerId: parseInt(selectedCustomer.id),
      updateData
    })
  }

  // Get walk-in customer for the current location
  const getCurrentWalkInCustomer = () => {
    // For admin users, use currentLocation; for others, use their profile location
    const locationId = profile?.role === 'admin' 
      ? currentLocation?.location_id 
      : userLocationId
    
    if (!locationId) return null
    return walkInCustomers[locationId] || null
  }

  const getLoanStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', variant: 'destructive' as const }
      case 'paid':
        return { text: 'Paid', variant: 'default' as const }
      default:
        return { text: 'Unknown', variant: 'secondary' as const }
    }
  }

  const getTotalLoans = (customer: Customer) => {
    return customer.loans.reduce((sum, loan) => sum + loan.loan_amount, 0)
  }

  const getActiveLoans = (customer: Customer) => {
    return customer.loans.filter(loan => loan.status === 'pending').length
  }

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
            onClick={() => queryClient.invalidateQueries({ queryKey: ['customers'] })} 
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
      <main className="container mx-auto p-6 space-y-6 bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-50 min-h-screen">
        <Card className="w-full border-0 shadow-xl">
          <CardContent className="p-12 text-center">
        <div className="h-20 w-20 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Building className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">{t('noLocation.title')}</h2>
        <p className="text-slate-600 text-lg mb-6">
          {t('noLocation.description')}
        </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Show message if user is at a warehouse location
  if (profile?.role !== 'admin' && profile?.location?.location_type === 'warehouse') {
    return (
      <main className="container mx-auto p-6 space-y-6 bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-50 min-h-screen">
        <Card className="w-full border-0 shadow-xl">
          <CardContent className="p-12 text-center">
        <div className="h-20 w-20 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Building className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">{t('warehouseLocation.title', { defaultValue: 'Warehouse Location' })}</h2>
        <p className="text-slate-600 text-lg mb-6">
          {t('warehouseLocation.description', { 
            defaultValue: 'Customers are only available for store locations. Warehouses do not have customer records.',
            location: profile.location.name 
          })}
        </p>
        <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-base px-4 py-2">
          <Building className="h-4 w-4 mr-2" />
          {profile.location.name} (Warehouse)
        </Badge>
          </CardContent>
        </Card>
      </main>
    )
  }

  const walkInCustomer = getCurrentWalkInCustomer()

  return (
    <div className="flex flex-col min-h-screen ">
      {/* Premium Header */}
      <header className="bg-white border-b-2 border-teal-200 shadow-md sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 tracking-tight">
                  {t('header.title')}
                </h1>
                <p className="text-slate-600 text-sm font-medium">
                  {profile?.role === 'admin' && currentLocation && currentLocation.name}
                  {profile?.role !== 'admin' && profile?.location && profile.location.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1.5 bg-gradient-to-br from-teal-50 to-emerald-100 border-2 border-teal-300 shadow-sm">
                <Users className="h-3 w-3 mr-1.5" />
                <span className="text-sm font-semibold text-teal-900">{filteredCustomers.length}</span>
                <span className="text-xs text-teal-600 font-semibold ml-1">{filteredCustomers.length === 1 ? t('header.customer', { defaultValue: 'Customer' }) : t('header.customers', { defaultValue: 'Customers' })}</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 space-y-6 p-4 md:p-8">

      {/* Table Card */}
      <Card className="w-full border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b-2 border-slate-100 p-6">
          <div className="flex flex-col gap-4">
            {/* Search and Buttons Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder={t('filters.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 border-2 focus:border-teal-500"
                />
              </div>

              <div className="flex gap-2">
                {/* Walk-in Customer Button - Only show for store locations */}
                {walkInCustomer && profile?.location?.location_type === 'store' && (
                  <Button 
                    size="default" 
                    variant="outline" 
                    onClick={() => handleViewCustomer(walkInCustomer)}
                    className="gap-2 border-2 hover:bg-teal-50 hover:border-teal-300"
                    title={t('header.buttons.walkInCustomer.title')}
                  >
                    <User className="h-4 w-4" />
                    {t('header.buttons.walkInCustomer.label')}
                  </Button>
                )}
                
                {/* Add Customer Button - Only show for store locations */}
                {(profile?.role === 'admin' || profile?.location?.location_type === 'store') && (
                  <Button 
                    size="default" 
                    onClick={() => setIsNewCustomerDialogOpen(true)} 
                    className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md"
                    title={t('header.buttons.addCustomer.title')}
                  >
                    <Plus className="h-4 w-4" />
                    {t('header.buttons.addCustomer.label')}
                  </Button>
                )}
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex gap-3">
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  setSelectedStatus(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[180px] border-2">
                  <SelectValue placeholder={t('filters.status.title')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.status.allCustomers')}</SelectItem>
                  <SelectItem value="with_loans">{t('filters.status.withLoans')}</SelectItem>
                  <SelectItem value="no_loans">{t('filters.status.noLoans')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
          <tr className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b-2 border-teal-200">
            <th className="text-left p-4 font-bold text-slate-900">{t('table.columns.name')}</th>
            {profile?.role === 'admin' && <th className="text-left p-4 font-bold text-slate-900">{t('table.columns.location')}</th>}
            <th className="text-left p-4 font-bold text-slate-900">{t('table.columns.contact')}</th>
            <th className="text-left p-4 font-bold text-slate-900">{t('table.columns.address')}</th>
            <th className="text-left p-4 font-bold text-slate-900">{t('table.columns.loans')}</th>
            <th className="text-left p-4 font-bold text-slate-900">{t('table.columns.joined')}</th>
            <th className="text-left p-4 font-bold text-slate-900">{t('table.columns.actions')}</th>
          </tr>
              </thead>
              <tbody>
          {paginatedCustomers.map((customer) => (
            <tr key={customer.id} className="border-b border-slate-100 hover:bg-teal-50/50 transition-colors">
              <td className="p-4">
                <div>
            <div className="font-bold text-slate-900">{customer.firstName} {customer.lastName}</div>
            <div className="text-sm text-slate-500">{t('table.cells.id')}: #{customer.id}</div>
                </div>
              </td>
              {profile?.role === 'admin' && (
                <td className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-3 w-3" />
              {customer.locationName}
            </div>
                </td>
              )}
              <td className="p-4">
                <div className="space-y-1">
            {customer.email !== "N/A" && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3 w-3" />
                <span title={t('table.cells.contact.email')}>{customer.email}</span>
              </div>
            )}
            {customer.phone !== "N/A" && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3" />
                <span title={t('table.cells.contact.phone')}>{customer.phone}</span>
              </div>
            )}
                </div>
              </td>
              <td className="p-4">
                {customer.address !== "N/A" ? (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3 w-3" />
              <span className="max-w-[200px] truncate">{customer.address}</span>
            </div>
                ) : (
            <span className="text-muted-foreground">{t('table.cells.noAddress')}</span>
                )}
              </td>
              <td className="p-4">
                <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-bold text-slate-900">{formatCurrency(getTotalLoans(customer))}</span>
            </div>
            {getActiveLoans(customer) > 0 ? (
              <Badge className="text-xs bg-red-100 text-red-700 border-red-200 hover:bg-red-200">
                {getActiveLoans(customer)} {t('table.cells.activeLoans')}
              </Badge>
            ) : (
              <Badge className="text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
                {t('table.cells.noActiveLoans', { defaultValue: 'No Active Loans' })}
              </Badge>
            )}
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3" />
            {formatDate(customer.createdAt)}
                </div>
              </td>
              <td className="p-4">
                <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewCustomer(customer)}
              title={t('table.actions.view')}
              className="hover:bg-teal-50 hover:text-teal-700"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditCustomer(customer)}
              title={t('table.actions.edit')}
              disabled={customer.firstName === "Walk-in"}
              className="hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
            >
              <Edit className="h-4 w-4" />
            </Button>
                </div>
              </td>
            </tr>
          ))}
              </tbody>
            </table>
          </div>
        

          {filteredCustomers.length === 0 && (
            <div className="text-center py-16 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl m-6 border-2 border-dashed border-teal-200">
              <div className="h-20 w-20 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t('table.noResults.title')}</h3>
              <p className="text-slate-600">
          {searchTerm || selectedStatus !== "all"
            ? t('table.noResults.withFilters')
            : t('table.noResults.noCustomers')
          }
              </p>
              {!searchTerm && selectedStatus === "all" && (
                <Button
                  onClick={() => setIsNewCustomerDialogOpen(true)}
                  className="mt-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('table.noResults.addFirst', { defaultValue: 'Add Your First Customer' })}
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-6 border-t-2 border-slate-100">
              <div className="text-sm text-slate-600 font-medium">
          {t('table.pagination.showing')} {startIndex + 1} {t('table.pagination.to')} {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} {t('table.pagination.of')} {filteredCustomers.length} {t('table.pagination.results')}
              </div>
              <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="border-2 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50"
          >
            {t('table.pagination.previous')}
          </Button>
          <div className="flex items-center gap-2 px-4">
            <span className="text-sm font-bold text-slate-900">{currentPage}</span>
            <span className="text-sm text-slate-500">of</span>
            <span className="text-sm font-bold text-slate-900">{totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="border-2 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50"
          >
            {t('table.pagination.next')}
          </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* New Customer Dialog */}
      <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-lg flex items-center justify-center">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">{t('addnewform.title')}</DialogTitle>
        </div>
        <DialogDescription className="text-base">
          {t('addnewform.description')}
          {/* Show location info based on user role */}
          {profile?.role === 'admin' && currentLocation ? (
            <p className="mt-2 p-3 bg-teal-50 border-2 border-teal-200 rounded-lg text-sm text-teal-700 font-medium">
              <Building className="h-4 w-4 inline mr-2" />
              {t('addnewform.locationAssociation', { location: currentLocation.name })}
            </p>
          ) : profile?.location ? (
            <p className="mt-2 p-3 bg-teal-50 border-2 border-teal-200 rounded-lg text-sm text-teal-700 font-medium">
              <Building className="h-4 w-4 inline mr-2" />
              {t('addnewform.locationAssociation', { location: profile.location.name })}
            </p>
          ) : null}
        </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <Label htmlFor="firstName" className="font-bold text-slate-900">{t('addnewform.form.firstName')} *</Label>
            <Input
          id="firstName"
          value={newCustomer.firstName}
          onChange={(e) => setNewCustomer({...newCustomer, firstName: e.target.value})}
          className="border-2 focus:border-teal-500"
            />
          </div>
          <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <Label htmlFor="lastName" className="font-bold text-slate-900">{t('addnewform.form.lastName')} *</Label>
            <Input
          id="lastName"
          value={newCustomer.lastName}
          onChange={(e) => setNewCustomer({...newCustomer, lastName: e.target.value})}
          className="border-2 focus:border-teal-500"
            />
          </div>
        </div>

        <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <Label htmlFor="email" className="font-bold text-slate-900">{t('addnewform.form.email')}</Label>
          <Input
            id="email"
            type="email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
            className="border-2 focus:border-teal-500"
            placeholder="customer@example.com"
          />
          <p className="text-xs text-slate-600">{t('addnewform.form.emailHint', { defaultValue: 'Optional - for email notifications' })}</p>
        </div>

        <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <Label htmlFor="phone" className="font-bold text-slate-900">{t('addnewform.form.phone')}</Label>
          <Input
            id="phone"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
            className="border-2 focus:border-teal-500"
            placeholder="+93 XXX XXX XXX"
          />
          <p className="text-xs text-slate-600">{t('addnewform.form.phoneHint', { defaultValue: 'Optional - contact number' })}</p>
        </div>

        <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <Label htmlFor="address" className="font-bold text-slate-900">{t('addnewform.form.address')}</Label>
          <Textarea
            id="address"
            value={newCustomer.address}
            onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
            rows={3}
            className="border-2 focus:border-teal-500"
            placeholder="Customer's address..."
          />
          <p className="text-xs text-slate-600">{t('addnewform.form.addressHint', { defaultValue: 'Optional - delivery address' })}</p>
        </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-100">
        <Button variant="outline" onClick={() => setIsNewCustomerDialogOpen(false)} className="border-2">
          {t('addnewform.buttons.cancel')}
        </Button>
        <Button 
          onClick={handleCreateCustomer} 
          disabled={createCustomerMutation.isPending || !newCustomer.firstName || !newCustomer.lastName}
          className="min-w-[140px] bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-md disabled:opacity-50"
        >
          {createCustomerMutation.isPending ? (
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
          </div>
        </DialogContent>
        </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-emerald-600 to-green-600 rounded-lg flex items-center justify-center">
            <Edit className="h-5 w-5 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">{t('updateform.title')}</DialogTitle>
        </div>
        <DialogDescription className="text-base">
          {t('updateform.description')}
        </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <Label htmlFor="editFirstName" className="font-bold text-slate-900">{t('updateform.form.firstName')} *</Label>
            <Input
          id="editFirstName"
          value={editCustomer.firstName}
          onChange={(e) => setEditCustomer({...editCustomer, firstName: e.target.value})}
          className="border-2 focus:border-emerald-500"
            />
          </div>
          <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <Label htmlFor="editLastName" className="font-bold text-slate-900">{t('updateform.form.lastName')} *</Label>
            <Input
          id="editLastName"
          value={editCustomer.lastName}
          onChange={(e) => setEditCustomer({...editCustomer, lastName: e.target.value})}
          className="border-2 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <Label htmlFor="editEmail" className="font-bold text-slate-900">{t('updateform.form.email')}</Label>
          <Input
            id="editEmail"
            type="email"
            value={editCustomer.email}
            onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
            className="border-2 focus:border-emerald-500"
            placeholder="customer@example.com"
          />
        </div>

        <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <Label htmlFor="editPhone" className="font-bold text-slate-900">{t('updateform.form.phone')}</Label>
          <Input
            id="editPhone"
            value={editCustomer.phone}
            onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
            className="border-2 focus:border-emerald-500"
            placeholder="+93 XXX XXX XXX"
          />
        </div>

        <div className="space-y-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <Label htmlFor="editAddress" className="font-bold text-slate-900">{t('updateform.form.address')}</Label>
          <Textarea
            id="editAddress"
            value={editCustomer.address}
            onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})}
            rows={3}
            className="border-2 focus:border-emerald-500"
            placeholder="Customer's address..."
          />
        </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-100">
        <Button variant="outline" onClick={() => setIsEditCustomerDialogOpen(false)} className="border-2">
          {t('updateform.buttons.cancel')}
        </Button>
        <Button 
          onClick={handleUpdateCustomer} 
          disabled={updateCustomerMutation.isPending || !editCustomer.firstName || !editCustomer.lastName}
          className="min-w-[140px] bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold shadow-md disabled:opacity-50"
        >
          {updateCustomerMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('updateform.buttons.updating')}
            </>
          ) : (
            <>
              <Edit className="h-4 w-4 mr-2" />
              {t('updateform.buttons.update')}
            </>
          )}
        </Button>
          </div>
        </DialogContent>

      </Dialog>
      {/* View Customer Dialog */}
      <Dialog open={isViewCustomerDialogOpen} onOpenChange={setIsViewCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b-2 border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <DialogTitle className="text-2xl font-bold">{t('customerdetails.dialog.title')}</DialogTitle>
            <DialogDescription className="text-base">
              {t('customerdetails.dialog.description')}
            </DialogDescription>
          </div>
        </div>
          </DialogHeader>

          {selectedCustomer && (
        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border-2 border-teal-100">
          <Label className="text-xs font-bold text-teal-700 uppercase tracking-wider">{t('customerdetails.dialog.info.fullName')}</Label>
          <p className="text-lg font-bold text-slate-900 mt-1">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200">
          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('customerdetails.dialog.info.customerId')}</Label>
          <p className="text-lg font-bold text-slate-900 mt-1">#{selectedCustomer.id}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <Mail className="h-3 w-3" />
            {t('customerdetails.dialog.info.email')}
          </Label>
          <p className="text-sm text-slate-900 mt-1 break-all">{selectedCustomer.email}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <Phone className="h-3 w-3" />
            {t('customerdetails.dialog.info.phone')}
          </Label>
          <p className="text-sm text-slate-900 mt-1">{selectedCustomer.phone}</p>
            </div>
            <div className="col-span-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            {t('customerdetails.dialog.info.address')}
          </Label>
          <p className="text-sm text-slate-900 mt-1">{selectedCustomer.address}</p>
            </div>
            {profile?.role === 'admin' && selectedCustomer.locationName && (
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-100">
            <Label className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
              <Building className="h-3 w-3" />
              {t('customerdetails.dialog.info.location')}
            </Label>
            <p className="text-sm font-bold text-slate-900 mt-1">{selectedCustomer.locationName}</p>
          </div>
            )}
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-100">
          <Label className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            {t('customerdetails.dialog.info.memberSince')}
          </Label>
          <p className="text-sm font-bold text-slate-900 mt-1">{formatDate(selectedCustomer.createdAt)}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-100">
          <Label className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="h-3 w-3" />
            {t('customerdetails.dialog.info.totalLoans')}
          </Label>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(getTotalLoans(selectedCustomer))}</p>
            </div>
          </div>

          {/* Loan History */}
          {selectedCustomer.loans.length > 0 && (
            <div className="space-y-3">
          <Label className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            {t('customerdetails.dialog.loanHistory.title')}
          </Label>
          <div className="space-y-3">
            {selectedCustomer.loans.map((loan) => (
              <div key={loan.loan_id} className="flex justify-between items-center p-4 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <div>
              <div className="font-bold text-slate-900">{t('customerdetails.dialog.loanHistory.loanId')} #{loan.loan_id}</div>
              <div className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3" />
                {formatDate(loan.loan_date)} - {loan.due_date ? formatDate(loan.due_date) : t('customerdetails.dialog.loanHistory.noDueDate')}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-slate-900">{formatCurrency(loan.loan_amount)}</div>
              <Badge 
                className={loan.status === 'paid' 
                  ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                  : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                }
              >
                {getLoanStatus(loan.status).text}
              </Badge>
            </div>
              </div>
            ))}
          </div>
            </div>
          )}

          {selectedCustomer.loans.length === 0 && (
            <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="h-16 w-16 bg-gradient-to-br from-slate-300 to-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <p className="text-slate-600 font-medium">{t('customerdetails.dialog.loanHistory.noHistory.message')}</p>
            </div>
          )}
        </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}