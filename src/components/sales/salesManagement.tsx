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
  DollarSign, 
  ShoppingCart,
  Calendar,
  User,
  Building,
  Warehouse,
  X,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { useStaff } from "@/contexts/StaffContext"

interface Sale {
  id: string
  date: string
  totalAmount: number
  warehouse: string
  store: string
  staff: string
  staffRole: string
}

interface Product {
  id: string
  name: string
  sku: string
  price: number
  category: string
}

interface Staff {
  id: string
  name: string
  role: string
}

interface Warehouse {
  id: string
  name: string
  location: string
}

interface Store {
  id: string
  name: string
  location: string
}

interface SaleItem {
  sale_item_id: number
  sale_id: number
  product_id: number
  quantity: number
  unit_price: number
  products: {
    name: string
    sku: string
  }
}

interface SalesManagementProps {
  sales: Sale[]
  products: Product[]
  staff: Staff[]
  warehouses: Warehouse[]
  stores: Store[]
  saleItems: SaleItem[]
}

export default function SalesManagement({ 
  sales, 
  products, 
  staff, 
  warehouses, 
  stores, 
  saleItems 
}: SalesManagementProps) {
  const { currentStaff } = useStaff()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all")
  const [selectedStore, setSelectedStore] = useState<string>("all")
  const [isNewSaleDialogOpen, setIsNewSaleDialogOpen] = useState(false)
  const [isViewSaleDialogOpen, setIsViewSaleDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newSale, setNewSale] = useState({
    warehouse: "",
    store: "",
    staff: currentStaff?.staff_id || "",
    items: [] as Array<{ productId: string; quantity: number; unitPrice: number }>
  })

  // Update newSale.staff when currentStaff changes
  useMemo(() => {
    if (currentStaff) {
      setNewSale(prev => ({ ...prev, staff: currentStaff.staff_id }))
    }
  }, [currentStaff])

  const itemsPerPage = 10
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = sale.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.store.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesWarehouse = selectedWarehouse === "all" || sale.warehouse === selectedWarehouse
      const matchesStore = selectedStore === "all" || sale.store === selectedStore
      return matchesSearch && matchesWarehouse && matchesStore
    })
  }, [sales, searchTerm, selectedWarehouse, selectedStore])

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage)
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const addItemToSale = () => {
    setNewSale(prev => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, unitPrice: 0 }]
    }))
  }

  const removeItemFromSale = (index: number) => {
    setNewSale(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateSaleItem = (index: number, field: string, value: string | number) => {
    setNewSale(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleCreateSale = async () => {
    if (!newSale.warehouse || !newSale.staff || newSale.items.length === 0) {
      toast.error("Please fill in all required fields and add at least one item")
      return
    }

    if (!currentStaff) {
      toast.error("Staff information not available")
      return
    }

    setIsSubmitting(true)
    try {
      // In a real app, you'd submit this to your API with currentStaff.staff_id
      toast.success(`Sale created successfully by ${currentStaff.first_name} ${currentStaff.last_name}!`)
      setIsNewSaleDialogOpen(false)
      setNewSale({
        warehouse: "",
        store: "",
        staff: currentStaff.staff_id,
        items: []
      })
    } catch (error) {
      toast.error("Failed to create sale")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSaleItems = (saleId: string) => {
    return saleItems.filter(item => item.sale_id.toString() === saleId)
  }

  const calculateTotal = (items: Array<{ quantity: number; unitPrice: number }>) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="p-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Sales Management
            </CardTitle>

            <Button size="sm" onClick={() => setIsNewSaleDialogOpen(true)} className="gap-2 h-8">
              <Plus className="h-3.5 w-3.5" />
              New Sale
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search sales by staff, warehouse, or store..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 h-9"
              />
            </div>

            <div className="flex gap-2">
              <Select
                value={selectedWarehouse}
                onValueChange={(value) => {
                  setSelectedWarehouse(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.name}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedStore}
                onValueChange={(value) => {
                  setSelectedStore(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.name}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {new Date(sale.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        ${sale.totalAmount.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>{sale.warehouse}</TableCell>
                    <TableCell>{sale.store}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{sale.staff}</span>
                        <Badge variant="outline" className="text-xs">
                          {sale.staffRole}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSale(sale)
                          setIsViewSaleDialogOpen(true)
                        }}
                        className="h-7 px-2"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} results
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Sale Dialog */}
      <Dialog open={isNewSaleDialogOpen} onOpenChange={setIsNewSaleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Sale</DialogTitle>
            <DialogDescription>
              {currentStaff ? (
                <span>Creating sale for <strong>{currentStaff.first_name} {currentStaff.last_name}</strong> ({currentStaff.role})</span>
              ) : (
                "Please wait while loading staff information..."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="warehouse">Warehouse *</Label>
                <Select
                  value={newSale.warehouse}
                  onValueChange={(value) => setNewSale(prev => ({ ...prev, warehouse: value }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.name}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="store">Store (Optional)</Label>
                <Select
                  value={newSale.store}
                  onValueChange={(value) => setNewSale(prev => ({ ...prev, store: value }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Store</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.name}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Sale Items *</Label>
              <div className="space-y-2 mt-2">
                {newSale.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={item.productId}
                      onValueChange={(value) => {
                        const product = products.find(p => p.id === value)
                        updateSaleItem(index, "productId", value)
                        if (product) {
                          updateSaleItem(index, "unitPrice", product.price)
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1 h-9">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${product.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateSaleItem(index, "quantity", parseInt(e.target.value) || 0)}
                      className="w-20 h-9"
                      min="1"
                    />

                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => updateSaleItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="w-24 h-9"
                      step="0.01"
                      min="0"
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItemFromSale(index)}
                      className="h-9 w-9 p-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItemToSale}
                  className="gap-2 h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                Total: ${calculateTotal(newSale.items).toFixed(2)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsNewSaleDialogOpen(false)}
                  className="h-9"
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateSale} disabled={isSubmitting || newSale.items.length === 0} className="h-9">
                  {isSubmitting ? "Creating..." : "Create Sale"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Sale Dialog */}
      <Dialog open={isViewSaleDialogOpen} onOpenChange={setIsViewSaleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              Sale ID: {selectedSale?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="font-medium">{new Date(selectedSale.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total Amount</Label>
                  <p className="font-medium">${selectedSale.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Warehouse</Label>
                  <p className="font-medium">{selectedSale.warehouse}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Store</Label>
                  <p className="font-medium">{selectedSale.store || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Staff</Label>
                  <p className="font-medium">{selectedSale.staff}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <p className="font-medium">{selectedSale.staffRole}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Sale Items</Label>
                <div className="mt-2 space-y-2">
                  {getSaleItems(selectedSale.id).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{item.products.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Qty: {item.quantity}</p>
                        <p className="text-xs text-muted-foreground">${item.unit_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
