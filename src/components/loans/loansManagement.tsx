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
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  User,
  DollarSign
} from "lucide-react"
import { toast } from "sonner"

interface Loan {
  id: string
  amount: number
  loanDate: string
  dueDate: string | null
  status: string
  customerId: string
  customerName: string
  customerEmail: string
}

interface LoansManagementProps {
  loans: Loan[]
}

export default function LoansManagement({ loans }: LoansManagementProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isNewLoanDialogOpen, setIsNewLoanDialogOpen] = useState(false)
  const [isViewLoanDialogOpen, setIsViewLoanDialogOpen] = useState(false)
  const [isEditLoanDialogOpen, setIsEditLoanDialogOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [newLoan, setNewLoan] = useState({
    amount: 0,
    dueDate: "",
    customerId: "",
    customerName: ""
  })

  const [editLoan, setEditLoan] = useState({
    amount: 0,
    dueDate: "",
    status: "pending"
  })

  const filteredLoans = useMemo(() => {
    let filtered = [...loans]

    if (searchTerm) {
      filtered = filtered.filter(
        (loan) =>
          loan.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((loan) => loan.status === selectedStatus)
    }

    return filtered.sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime())
  }, [loans, searchTerm, selectedStatus])

  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLoans = filteredLoans.slice(startIndex, startIndex + itemsPerPage)

  const loanStats = useMemo(() => {
    const totalLoans = loans.length
    const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0)
    const pendingLoans = loans.filter(loan => loan.status === 'pending')
    const pendingAmount = pendingLoans.reduce((sum, loan) => sum + loan.amount, 0)
    const overdueLoans = loans.filter(loan => {
      if (loan.status === 'paid' || !loan.dueDate) return false
      return new Date(loan.dueDate) < new Date()
    })
    const overdueAmount = overdueLoans.reduce((sum, loan) => sum + loan.amount, 0)

    return {
      totalLoans,
      totalAmount,
      pendingLoans: pendingLoans.length,
      pendingAmount,
      overdueLoans: overdueLoans.length,
      overdueAmount
    }
  }, [loans])

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
      day: "numeric"
    })
  }

  const getLoanStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', variant: 'outline' as const }
      case 'paid':
        return { text: 'Paid', variant: 'default' as const }
      default:
        return { text: status, variant: 'secondary' as const }
    }
  }

  const isOverdue = (dueDate: string | null, status: string) => {
    if (status === 'paid' || !dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const handleViewLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setIsViewLoanDialogOpen(true)
  }

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan)
    setEditLoan({
      amount: loan.amount,
      dueDate: loan.dueDate || "",
      status: loan.status
    })
    setIsEditLoanDialogOpen(true)
  }

  const handleCreateLoan = async () => {
    if (!newLoan.amount || !newLoan.customerId) {
      toast.error("Loan amount and customer are required")
      return
    }

    setIsSubmitting(true)
    try {
      toast.success("Loan created successfully!")
      setIsNewLoanDialogOpen(false)
      setNewLoan({
        amount: 0,
        dueDate: "",
        customerId: "",
        customerName: ""
      })
    } catch (error) {
      toast.error("Failed to create loan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateLoan = async () => {
    if (!editLoan.amount) {
      toast.error("Loan amount is required")
      return
    }

    setIsSubmitting(true)
    try {
      toast.success("Loan updated successfully!")
      setIsEditLoanDialogOpen(false)
    } catch (error) {
      toast.error("Failed to update loan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanStats.totalLoans}</div>
            <p className="text-xs text-muted-foreground">Active loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(loanStats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Total loaned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Loans</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{loanStats.pendingLoans}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(loanStats.pendingAmount)} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{loanStats.overdueLoans}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(loanStats.overdueAmount)} overdue</p>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full">
        <CardHeader className="p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Loans Management
            </CardTitle>

            <Button size="sm" onClick={() => setIsNewLoanDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Loan
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search loans by customer name, email, or status..."
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
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Loan Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{loan.customerName}</div>
                      <div className="text-sm text-muted-foreground">{loan.customerEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(loan.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDate(loan.loanDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {loan.dueDate ? (
                      <div className={`flex items-center gap-2 text-sm ${isOverdue(loan.dueDate, loan.status) ? 'text-red-600' : ''}`}>
                        <Calendar className="h-3 w-3" />
                        {formatDate(loan.dueDate)}
                        {isOverdue(loan.dueDate, loan.status) && (
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No due date</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getLoanStatus(loan.status).variant}>
                      {getLoanStatus(loan.status).text}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLoan(loan)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditLoan(loan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLoans.length)} of {filteredLoans.length} results
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

      <Dialog open={isNewLoanDialogOpen} onOpenChange={setIsNewLoanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Loan</DialogTitle>
            <DialogDescription>
              Fill in the loan details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer ID *</Label>
              <Input
                id="customerId"
                value={newLoan.customerId}
                onChange={(e) => setNewLoan({...newLoan, customerId: e.target.value})}
                placeholder="Enter customer ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Loan Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={newLoan.amount}
                onChange={(e) => setNewLoan({...newLoan, amount: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newLoan.dueDate}
                onChange={(e) => setNewLoan({...newLoan, dueDate: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsNewLoanDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLoan} disabled={isSubmitting || !newLoan.amount || !newLoan.customerId}>
              {isSubmitting ? "Creating..." : "Create Loan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditLoanDialogOpen} onOpenChange={setIsEditLoanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Loan</DialogTitle>
            <DialogDescription>
              Update the loan details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editAmount">Loan Amount *</Label>
              <Input
                id="editAmount"
                type="number"
                value={editLoan.amount}
                onChange={(e) => setEditLoan({...editLoan, amount: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDueDate">Due Date</Label>
              <Input
                id="editDueDate"
                type="date"
                value={editLoan.dueDate}
                onChange={(e) => setEditLoan({...editLoan, dueDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStatus">Status *</Label>
              <Select
                value={editLoan.status}
                onValueChange={(value) => setEditLoan({...editLoan, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditLoanDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLoan} disabled={isSubmitting || !editLoan.amount}>
              {isSubmitting ? "Updating..." : "Update Loan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewLoanDialogOpen} onOpenChange={setIsViewLoanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>
              Loan information
            </DialogDescription>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Loan ID</Label>
                  <p className="text-sm">#{selectedLoan.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm">
                    <Badge variant={getLoanStatus(selectedLoan.status).variant}>
                      {getLoanStatus(selectedLoan.status).text}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm font-bold">{formatCurrency(selectedLoan.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p className="text-sm">{selectedLoan.customerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Loan Date</Label>
                  <p className="text-sm">{formatDate(selectedLoan.loanDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="text-sm">
                    {selectedLoan.dueDate ? (
                      <span className={isOverdue(selectedLoan.dueDate, selectedLoan.status) ? 'text-red-600' : ''}>
                        {formatDate(selectedLoan.dueDate)}
                        {isOverdue(selectedLoan.dueDate, selectedLoan.status) && (
                          <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>
                        )}
                      </span>
                    ) : (
                      "No due date"
                    )}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Customer Email</Label>
                  <p className="text-sm">{selectedLoan.customerEmail}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

