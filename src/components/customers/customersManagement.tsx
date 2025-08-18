"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Filter, 
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
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  createdAt: string
  loans: Array<{
    loan_id: number
    loan_amount: number
    loan_date: string
    due_date: string
    status: string
  }>
}

interface CustomersManagementProps {
  customers: Customer[]
}

export default function CustomersManagement({ customers }: CustomersManagementProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false)
  const [isViewCustomerDialogOpen, setIsViewCustomerDialogOpen] = useState(false)
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
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

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers]

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
      currency: "USD",
    }).format(amount)
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsViewCustomerDialogOpen(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEditCustomer({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address
    })
    setIsEditCustomerDialogOpen(true)
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.firstName || !newCustomer.lastName) {
      toast.error("First name and last name are required")
      return
    }

    setIsSubmitting(true)
    try {
      // In a real app, you'd submit this to your API
      toast.success("Customer created successfully!")
      setIsNewCustomerDialogOpen(false)
      setNewCustomer({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: ""
      })
    } catch (error) {
      toast.error("Failed to create customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCustomer = async () => {
    if (!editCustomer.firstName || !editCustomer.lastName) {
      toast.error("First name and last name are required")
      return
    }

    setIsSubmitting(true)
    try {
      // In a real app, you'd submit this to your API
      toast.success("Customer updated successfully!")
      setIsEditCustomerDialogOpen(false)
    } catch (error) {
      toast.error("Failed to update customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getLoanStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', variant: 'warning' as const }
      case 'paid':
        return { text: 'Paid', variant: 'success' as const }
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

  return (
    <>
      <Card className="w-full">
        <CardHeader className="p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Customers Management
            </CardTitle>

            <Button size="sm" onClick={() => setIsNewCustomerDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search customers by name, email, or phone..."
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
                value={selectedStatus}
                onValueChange={(value) => {
                  setSelectedStatus(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="with_loans">With Loans</SelectItem>
                  <SelectItem value="no_loans">No Loans</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Loans</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                      <div className="text-sm text-muted-foreground">ID: #{customer.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.email !== "N/A" && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone !== "N/A" && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.address !== "N/A" ? (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3" />
                        <span className="max-w-[200px] truncate">{customer.address}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No address</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-medium">{formatCurrency(getTotalLoans(customer))}</span>
                      </div>
                      {getActiveLoans(customer) > 0 && (
                        <Badge variant="warning" className="text-xs">
                          {getActiveLoans(customer)} active loans
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDate(customer.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewCustomer(customer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCustomer(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
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
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Fill in the customer details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer({...newCustomer, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer({...newCustomer, lastName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsNewCustomerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} disabled={isSubmitting || !newCustomer.firstName || !newCustomer.lastName}>
              {isSubmitting ? "Creating..." : "Create Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name *</Label>
                <Input
                  id="editFirstName"
                  value={editCustomer.firstName}
                  onChange={(e) => setEditCustomer({...editCustomer, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name *</Label>
                <Input
                  id="editLastName"
                  value={editCustomer.lastName}
                  onChange={(e) => setEditCustomer({...editCustomer, lastName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editCustomer.email}
                onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                value={editCustomer.phone}
                onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAddress">Address</Label>
              <Textarea
                id="editAddress"
                value={editCustomer.address}
                onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditCustomerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer} disabled={isSubmitting || !editCustomer.firstName || !editCustomer.lastName}>
              {isSubmitting ? "Updating..." : "Update Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={isViewCustomerDialogOpen} onOpenChange={setIsViewCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Customer information and loan history
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Full Name</Label>
                  <p className="text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Customer ID</Label>
                  <p className="text-sm">#{selectedCustomer.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm">{selectedCustomer.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm">{selectedCustomer.phone}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm">{selectedCustomer.address}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Member Since</Label>
                  <p className="text-sm">{formatDate(selectedCustomer.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Loans</Label>
                  <p className="text-sm font-bold">{formatCurrency(getTotalLoans(selectedCustomer))}</p>
                </div>
              </div>

              {/* Loan History */}
              {selectedCustomer.loans.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Loan History</Label>
                  <div className="space-y-2">
                    {selectedCustomer.loans.map((loan) => (
                      <div key={loan.loan_id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">Loan #{loan.loan_id}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(loan.loan_date)} - {loan.due_date ? formatDate(loan.due_date) : 'No due date'}
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
                  <p>No loan history</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

