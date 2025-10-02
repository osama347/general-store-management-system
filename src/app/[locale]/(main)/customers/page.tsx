"use client"

import { useState, useEffect, useMemo } from "react"
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
  Trash2, 
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  Loader2,
  Building,
  User,
  Filter
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "@/contexts/LocationContext"
import {useTranslations} from 'next-intl'  

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
  loans: Array<{
    loan_id: number
    loan_amount: number
    loan_date: string
    due_date: string
    status: string
  }>
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("current") // Default to current location
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false)
  const [isViewCustomerDialogOpen, setIsViewCustomerDialogOpen] = useState(false)
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  const { profile, loading: authLoading } = useAuth()
  const t = useTranslations('customers')
  const { locations, currentLocation, isLoading: locationLoading } = useLocation()

  // Get the user's location from their profile
  const userLocationId = profile?.location_id

  // Fetch customers data
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query based on user role and location
      let customersQuery = supabase.from("customers").select(`
        *,
        locations(name)
      `)

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

      if (loansError) throw new Error(`Loans error: ${loansError.message}`)

      // Transform customers data
      const transformedCustomers = customersData?.map(customer => ({
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

      setCustomers(transformedCustomers)

      // Fetch or create walk-in customer for the user's location
      if (userLocationId) {
        // Get location name for the walk-in customer
        const locationName = profile?.location?.name || "Unknown Location"
        await ensureWalkInCustomer(userLocationId, locationName)
      }
    } catch (err) {
      console.error("Error loading customers:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Ensure walk-in customer exists for each location
  const ensureWalkInCustomer = async (locationId: number, locationName: string) => {
    try {
      // Check if walk-in customer already exists for this location
      const { data: existingWalkIn, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("first_name", "Walk-in")
        .eq("last_name", "Customer")
        .eq("location_id", locationId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        throw fetchError
      }

      if (existingWalkIn) {
        // Store the walk-in customer in state
        setWalkInCustomers(prev => ({
          ...prev,
          [locationId]: {
            id: existingWalkIn.customer_id.toString(),
            firstName: existingWalkIn.first_name,
            lastName: existingWalkIn.last_name,
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
            last_name: "Customer",
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
            firstName: newWalkIn.first_name,
            lastName: newWalkIn.last_name,
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

  useEffect(() => {
    if (!authLoading && !locationLoading && profile) {
      fetchCustomers()
    }
  }, [profile, authLoading, locationLoading, selectedLocation])

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers]

    // Filter out walk-in customers from the main list
    filtered = filtered.filter(customer => 
      !(customer.firstName === "Walk-in" && customer.lastName === "Customer")
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
    if (customer.firstName === "Walk-in" && customer.lastName === "Customer") {
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

    // Non-admin users must have a location_id in their profile
    if (profile?.role !== 'admin' && !userLocationId) {
      toast.error("Your account is not associated with any location")
      return
    }

    setIsSubmitting(true)
    try {
      const customerData: any = {
        first_name: newCustomer.firstName,
        last_name: newCustomer.lastName,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
      }

      // Add location_id from user's profile
      if (userLocationId) {
        customerData.location_id = userLocationId
      }

      const { data, error } = await supabase
        .from("customers")
        .insert([customerData])
        .select()

      if (error) throw error

      toast.success("Customer created successfully!")
      setIsNewCustomerDialogOpen(false)
      setNewCustomer({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: ""
      })
      
      await fetchCustomers()
    } catch (error) {
      console.error("Error creating customer:", error)
      toast.error("Failed to create customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCustomer = async () => {
    if (!editCustomer.firstName || !editCustomer.lastName || !selectedCustomer) {
      toast.error("First name and last name are required")
      return
    }

    setIsSubmitting(true)
    try {
      const updateData: any = {
        first_name: editCustomer.firstName,
        last_name: editCustomer.lastName,
        email: editCustomer.email || null,
        phone: editCustomer.phone || null,
        address: editCustomer.address || null,
      }

      const { error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("customer_id", parseInt(selectedCustomer.id))

      if (error) throw error

      toast.success("Customer updated successfully!")
      setIsEditCustomerDialogOpen(false)
      
      await fetchCustomers()
    } catch (error) {
      console.error("Error updating customer:", error)
      toast.error("Failed to update customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    // Prevent deletion of walk-in customers
    const customer = customers.find(c => c.id === customerId)
    if (customer && customer.firstName === "Walk-in" && customer.lastName === "Customer") {
      toast.error("Walk-in customer cannot be deleted")
      return
    }

    if (!confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("customer_id", parseInt(customerId))

      if (error) throw error

      toast.success("Customer deleted successfully!")
      await fetchCustomers()
    } catch (error) {
      console.error("Error deleting customer:", error)
      toast.error("Failed to delete customer")
    }
  }

  // Get walk-in customer for the user's location
  const getCurrentWalkInCustomer = () => {
    if (!userLocationId) return null
    return walkInCustomers[userLocationId] || null
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
            <pre className="bg-white p-2 rounded mt-2">{error}</pre>
          </details>
          <Button 
            onClick={fetchCustomers} 
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

  const walkInCustomer = getCurrentWalkInCustomer()

  return (
    <main className="container mx-auto p-6 space-y-4">
      <Card className="w-full">
        <CardHeader className="p-6">
            <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('header.title', { count: customers.length })}
              </CardTitle>
              {profile?.role !== 'admin' && profile?.location && (
              <p className="text-sm text-muted-foreground mt-1">
          {t('header.locationContext', { location: profile.location.name })}
              </p>
              )}
            </div>

            <div className="flex gap-2">
              {/* Walk-in Customer Button */}
              {walkInCustomer && (
              <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleViewCustomer(walkInCustomer)}
          className="gap-2"
          title={t('header.buttons.walkInCustomer.title')}
              >
          <User className="h-4 w-4" />
          {t('header.buttons.walkInCustomer.label')}
              </Button>
              )}
              
              <Button 
              size="sm" 
              onClick={() => setIsNewCustomerDialogOpen(true)} 
              className="gap-2"
              title={t('header.buttons.addCustomer.title')}
              >
              <Plus className="h-4 w-4" />
              {t('header.buttons.addCustomer.label')}
              </Button>
            </div>
            </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
          placeholder={t('filters.search.placeholder')}
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
              <SelectValue placeholder={t('filters.location.title')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">
                {t('filters.location.currentLocation', { name: currentLocation?.name || "None" })}
              </SelectItem>
              <SelectItem value="all">{t('filters.location.allLocations')}</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.location_id} value={location.location_id.toString()}>
            {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
              )}

              <Select
          value={selectedStatus}
          onValueChange={(value) => {
            setSelectedStatus(value)
            setCurrentPage(1)
          }}
              >
          <SelectTrigger className="w-[180px]">
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

        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
          <tr className="border-b">
            <th className="text-left p-4 font-medium">{t('table.columns.name')}</th>
            {profile?.role === 'admin' && <th className="text-left p-4 font-medium">{t('table.columns.location')}</th>}
            <th className="text-left p-4 font-medium">{t('table.columns.contact')}</th>
            <th className="text-left p-4 font-medium">{t('table.columns.address')}</th>
            <th className="text-left p-4 font-medium">{t('table.columns.loans')}</th>
            <th className="text-left p-4 font-medium">{t('table.columns.joined')}</th>
            <th className="text-left p-4 font-medium">{t('table.columns.actions')}</th>
          </tr>
              </thead>
              <tbody>
          {paginatedCustomers.map((customer) => (
            <tr key={customer.id} className="border-b hover:bg-gray-50">
              <td className="p-4">
                <div>
            <div className="font-medium">{customer.firstName} {customer.lastName}</div>
            <div className="text-sm text-muted-foreground">{t('table.cells.id')}: #{customer.id}</div>
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
              <DollarSign className="h-3 w-3" />
              <span className="font-medium">{formatCurrency(getTotalLoans(customer))}</span>
            </div>
            {getActiveLoans(customer) > 0 && (
              <Badge variant="destructive" className="text-xs">
                {getActiveLoans(customer)} {t('table.cells.activeLoans')}
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
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditCustomer(customer)}
              title={t('table.actions.edit')}
              disabled={customer.firstName === "Walk-in" && customer.lastName === "Customer"}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteCustomer(customer.id)}
              title={t('table.actions.delete')}
              disabled={customer.firstName === "Walk-in" && customer.lastName === "Customer"}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
                </div>
              </td>
            </tr>
          ))}
              </tbody>
            </table>
          </div>
        

          {filteredCustomers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">{t('table.noResults.title')}</h3>
              <p className="text-sm">
          {searchTerm || selectedStatus !== "all" || (profile?.role === 'admin' && selectedLocation !== "all")
            ? t('table.noResults.withFilters')
            : t('table.noResults.noCustomers')
          }
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
          {t('table.pagination.showing')} {startIndex + 1} {t('table.pagination.to')} {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} {t('table.pagination.of')} {filteredCustomers.length} {t('table.pagination.results')}
              </div>
              <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            {t('table.pagination.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
        <DialogTitle>{t('addnewform.title')}</DialogTitle>
        <DialogDescription>
          {t('addnewform.description')}
          {profile?.location && (
            <p className="mt-1 text-sm text-blue-600">
          {t('addnewform.locationAssociation', { location: profile.location.name })}
            </p>
          )}
        </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t('addnewform.form.firstName')}</Label>
            <Input
          id="firstName"
          value={newCustomer.firstName}
          onChange={(e) => setNewCustomer({...newCustomer, firstName: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t('addnewform.form.lastName')}</Label>
            <Input
          id="lastName"
          value={newCustomer.lastName}
          onChange={(e) => setNewCustomer({...newCustomer, lastName: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2"></div>
          <Label htmlFor="email">{t('addnewform.form.email')}</Label>
          <Input
            id="email"
            type="email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('addnewform.form.phone')}</Label>
          <Input
            id="phone"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t('addnewform.form.address')}</Label>
          <Textarea
            id="address"
            value={newCustomer.address}
            onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
            rows={3}
          />
        </div>
          

          <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setIsNewCustomerDialogOpen(false)}>
          {t('addnewform.buttons.cancel')}
        </Button>
        <Button onClick={handleCreateCustomer} disabled={isSubmitting || !newCustomer.firstName || !newCustomer.lastName}>
          {isSubmitting ? t('addnewform.buttons.creating') : t('addnewform.buttons.create')}
        </Button>
          </div>
        </DialogContent>
        </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
        <DialogTitle>{t('updateform.title')}</DialogTitle>
        <DialogDescription>
          {t('updateform.description')}
        </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"></div>
            <Label htmlFor="editFirstName">{t('updateform.form.firstName')}</Label>
            <Input
          id="editFirstName"
          value={editCustomer.firstName}
          onChange={(e) => setEditCustomer({...editCustomer, firstName: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editLastName">{t('updateform.form.lastName')}</Label>
            <Input
          id="editLastName"
          value={editCustomer.lastName}
          onChange={(e) => setEditCustomer({...editCustomer, lastName: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="editEmail">{t('updateform.form.email')}</Label>
          <Input
            id="editEmail"
            type="email"
            value={editCustomer.email}
            onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="editPhone">{t('updateform.form.phone')}</Label>
          <Input
            id="editPhone"
            value={editCustomer.phone}
            onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="editAddress">{t('updateform.form.address')}</Label>
          <Textarea
            id="editAddress"
            value={editCustomer.address}
            onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})}
            rows={3}
          />
        </div>
          

          <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setIsEditCustomerDialogOpen(false)}>
          {t('updateform.buttons.cancel')}
        </Button>
        <Button onClick={handleUpdateCustomer} disabled={isSubmitting || !editCustomer.firstName || !editCustomer.lastName}>
          {isSubmitting ? t('updateform.buttons.updating') : t('updateform.buttons.update')}
        </Button>
          </div>
        </DialogContent>

      </Dialog>
      {/* View Customer Dialog */}
      <Dialog open={isViewCustomerDialogOpen} onOpenChange={setIsViewCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
        <DialogTitle>{t('customerdetails.dialog.title')}</DialogTitle>
        <DialogDescription>
          {t('customerdetails.dialog.description')}
        </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
          <Label className="text-sm font-medium">{t('customerdetails.dialog.info.fullName')}</Label>
          <p className="text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
            </div>
            <div>
          <Label className="text-sm font-medium">{t('customerdetails.dialog.info.customerId')}</Label>
          <p className="text-sm">#{selectedCustomer.id}</p>
            </div>
            <div>
          <Label className="text-sm font-medium">{t('customerdetails.dialog.info.email')}</Label>
          <p className="text-sm">{selectedCustomer.email}</p>
            </div>
            <div>
          <Label className="text-sm font-medium">{t('customerdetails.dialog.info.phone')}</Label>
          <p className="text-sm">{selectedCustomer.phone}</p>
            </div>
            <div className="col-span-2">
          <Label className="text-sm font-medium">{t('customerdetails.dialog.info.address')}</Label>
          <p className="text-sm">{selectedCustomer.address}</p>
            </div>
            {profile?.role === 'admin' && selectedCustomer.locationName && (
          <div>
            <Label className="text-sm font-medium">{t('customerdetails.dialog.info.location')}</Label>
            <p className="text-sm">{selectedCustomer.locationName}</p>
          </div>
            )}
            <div>
          <Label className="text-sm font-medium">{t('customerdetails.dialog.info.memberSince')}</Label>
          <p className="text-sm">{formatDate(selectedCustomer.createdAt)}</p>
            </div>
            <div>
          <Label className="text-sm font-medium">{t('customerdetails.dialog.info.totalLoans')}</Label>
          <p className="text-sm font-bold">{formatCurrency(getTotalLoans(selectedCustomer))}</p>
            </div>
          </div>

          {/* Loan History */}
          {selectedCustomer.loans.length > 0 && (
            <div className="space-y-2">
          <Label className="text-sm font-medium">{t('customerdetails.dialog.loanHistory.title')}</Label>
          <div className="space-y-2">
            {selectedCustomer.loans.map((loan) => (
              <div key={loan.loan_id} className="flex justify-between items-center p-3 border rounded">
            <div>
              <div className="font-medium">{t('customerdetails.dialog.loanHistory.loanId')} #{loan.loan_id}</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(loan.loan_date)} - {loan.due_date ? formatDate(loan.due_date) : t('customerdetails.dialog.loanHistory.noDueDate')}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">{formatCurrency(loan.loan_amount)}</div>
              <Badge variant={getLoanStatus(loan.status).variant}>
                {getLoanStatus(loan.status).text}
              </Badge>
            </div>
              </div>
            ))}
          </div>
            </div>
          )}

          {selectedCustomer.loans.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{t('customerdetails.dialog.loanHistory.noHistory.message')}</p>
            </div>
          )}
        </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}