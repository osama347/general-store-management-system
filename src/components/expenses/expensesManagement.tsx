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
  Plus, 
  Eye, 
  Edit, 
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
  FileText,
  BarChart3
} from "lucide-react"
import { toast } from "sonner"

interface Expense {
  id: string
  type: string
  amount: number
  date: string
  description: string
}

interface ExpensesManagementProps {
  expenses: Expense[]
}

export default function ExpensesManagement({ expenses }: ExpensesManagementProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [isNewExpenseDialogOpen, setIsNewExpenseDialogOpen] = useState(false)
  const [isViewExpenseDialogOpen, setIsViewExpenseDialogOpen] = useState(false)
  const [isEditExpenseDialogOpen, setIsEditExpenseDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [newExpense, setNewExpense] = useState({
    type: "",
    amount: 0,
    description: ""
  })

  const [editExpense, setEditExpense] = useState({
    type: "",
    amount: 0,
    description: ""
  })

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses]

    if (searchTerm) {
      filtered = filtered.filter(
        (expense) =>
          expense.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((expense) => expense.type === selectedType)
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [expenses, searchTerm, selectedType])

  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage)

  const expenseTypes = useMemo(() => {
    const uniqueTypes = new Set(expenses.map(expense => expense.type))
    return Array.from(uniqueTypes).sort()
  }, [expenses])

  const expenseStats = useMemo(() => {
    const totalExpenses = expenses.length
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const avgAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0
    const thisMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      const now = new Date()
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
    })
    const thisMonthAmount = thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)

    return {
      totalExpenses,
      totalAmount,
      avgAmount,
      thisMonthAmount
    }
  }, [expenses])

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

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsViewExpenseDialogOpen(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense)
    setEditExpense({
      type: expense.type,
      amount: expense.amount,
      description: expense.description
    })
    setIsEditExpenseDialogOpen(true)
  }

  const handleCreateExpense = async () => {
    if (!newExpense.type || newExpense.amount <= 0) {
      toast.error("Expense type and amount are required")
      return
    }

    setIsSubmitting(true)
    try {
      toast.success("Expense created successfully!")
      setIsNewExpenseDialogOpen(false)
      setNewExpense({
        type: "",
        amount: 0,
        description: ""
      })
    } catch (error) {
      toast.error("Failed to create expense")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateExpense = async () => {
    if (!editExpense.type || editExpense.amount <= 0) {
      toast.error("Expense type and amount are required")
      return
    }

    setIsSubmitting(true)
    try {
      toast.success("Expense updated successfully!")
      setIsEditExpenseDialogOpen(false)
    } catch (error) {
      toast.error("Failed to update expense")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenseStats.totalExpenses}</div>
            <p className="text-xs text-muted-foreground">Expense records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(expenseStats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Total spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(expenseStats.thisMonthAmount)}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(expenseStats.avgAmount)}</div>
            <p className="text-xs text-muted-foreground">Per expense</p>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full">
        <CardHeader className="p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Expenses Management
            </CardTitle>

            <Button size="sm" onClick={() => setIsNewExpenseDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search expenses by type or description..."
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
                value={selectedType}
                onValueChange={(value) => {
                  setSelectedType(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <Badge variant="outline">{expense.type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-red-600">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDate(expense.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px] truncate">
                      {expense.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewExpense(expense)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditExpense(expense)}
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
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} results
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

      <Dialog open={isNewExpenseDialogOpen} onOpenChange={setIsNewExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Fill in the expense details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Expense Type *</Label>
              <Input
                id="type"
                value={newExpense.type}
                onChange={(e) => setNewExpense({...newExpense, type: e.target.value})}
                placeholder="e.g., Utilities, Rent, Supplies"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                rows={3}
                placeholder="Additional details about the expense"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsNewExpenseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExpense} disabled={isSubmitting || !newExpense.type || newExpense.amount <= 0}>
              {isSubmitting ? "Creating..." : "Create Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditExpenseDialogOpen} onOpenChange={setIsEditExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the expense details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editType">Expense Type *</Label>
              <Input
                id="editType"
                value={editExpense.type}
                onChange={(e) => setEditExpense({...editExpense, type: e.target.value})}
                placeholder="e.g., Utilities, Rent, Supplies"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAmount">Amount *</Label>
              <Input
                id="editAmount"
                type="number"
                value={editExpense.amount}
                onChange={(e) => setEditExpense({...editExpense, amount: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={editExpense.description}
                onChange={(e) => setEditExpense({...editExpense, description: e.target.value})}
                rows={3}
                placeholder="Additional details about the expense"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditExpenseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateExpense} disabled={isSubmitting || !editExpense.type || editExpense.amount <= 0}>
              {isSubmitting ? "Updating..." : "Update Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewExpenseDialogOpen} onOpenChange={setIsViewExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>
              Expense information
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Expense ID</Label>
                  <p className="text-sm">#{selectedExpense.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm">
                    <Badge variant="outline">{selectedExpense.type}</Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm font-bold text-red-600">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p className="text-sm">{formatDate(selectedExpense.date)}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm">{selectedExpense.description}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

