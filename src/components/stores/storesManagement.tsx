"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Building,
  MapPin,
  Package,
  BarChart3,
  Store,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

interface StoreInventory {
  productId: string
  productName: string
  sku: string
  quantity: number
}

interface Store {
  id: string
  name: string
  location: string
  totalProducts: number
  totalQuantity: number
  inventory: StoreInventory[]
}

interface StoresManagementProps {
  stores: Store[]
}

export default function StoresManagement({ stores }: StoresManagementProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewStoreDialogOpen, setIsNewStoreDialogOpen] = useState(false)
  const [isViewStoreDialogOpen, setIsViewStoreDialogOpen] = useState(false)
  const [isEditStoreDialogOpen, setIsEditStoreDialogOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [newStore, setNewStore] = useState({
    name: "",
    location: ""
  })

  const [editStore, setEditStore] = useState({
    name: "",
    location: ""
  })

  const filteredStores = useMemo(() => {
    let filtered = [...stores]

    if (searchTerm) {
      filtered = filtered.filter(
        (store) =>
          store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          store.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [stores, searchTerm])

  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredStores.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedStores = filteredStores.slice(startIndex, startIndex + itemsPerPage)

  const storeStats = useMemo(() => {
    const totalStores = stores.length
    const totalProducts = stores.reduce((sum, store) => sum + store.totalProducts, 0)
    const totalInventory = stores.reduce((sum, store) => sum + store.totalQuantity, 0)
    const avgProductsPerStore = totalStores > 0 ? totalProducts / totalStores : 0

    return {
      totalStores,
      totalProducts,
      totalInventory,
      avgProductsPerStore
    }
  }, [stores])

  const handleViewStore = (store: Store) => {
    setSelectedStore(store)
    setIsViewStoreDialogOpen(true)
  }

  const handleEditStore = (store: Store) => {
    setSelectedStore(store)
    setEditStore({
      name: store.name,
      location: store.location
    })
    setIsEditStoreDialogOpen(true)
  }

  const handleCreateStore = async () => {
    if (!newStore.name) {
      toast.error("Store name is required")
      return
    }

    setIsSubmitting(true)
    try {
      toast.success("Store created successfully!")
      setIsNewStoreDialogOpen(false)
      setNewStore({
        name: "",
        location: ""
      })
    } catch (error) {
      toast.error("Failed to create store")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStore = async () => {
    if (!editStore.name) {
      toast.error("Store name is required")
      return
    }

    setIsSubmitting(true)
    try {
      toast.success("Store updated successfully!")
      setIsEditStoreDialogOpen(false)
    } catch (error) {
      toast.error("Failed to update store")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInventoryStatus = (quantity: number) => {
    if (quantity === 0) return { text: "Out of Stock", variant: "destructive" as const }
    if (quantity < 10) return { text: "Low Stock", variant: "outline" as const }
    return { text: "In Stock", variant: "default" as const }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storeStats.totalStores}</div>
            <p className="text-xs text-muted-foreground">Store locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storeStats.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all stores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storeStats.totalInventory.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Products/Store</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storeStats.avgProductsPerStore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Per store</p>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full">
        <CardHeader className="p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Stores Management
            </CardTitle>

            <Button size="sm" onClick={() => setIsNewStoreDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Store
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search stores by name or location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{store.name}</div>
                      <div className="text-sm text-muted-foreground">ID: #{store.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3" />
                      {store.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-3 w-3" />
                      <span className="font-medium">{store.totalProducts}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{store.totalQuantity.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">units</div>
                  </TableCell>
                  <TableCell>
                    {store.totalProducts === 0 ? (
                      <Badge variant="destructive">No Products</Badge>
                    ) : store.totalQuantity === 0 ? (
                      <Badge variant="outline">Out of Stock</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewStore(store)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStore(store)}
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
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStores.length)} of {filteredStores.length} results
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

      <Dialog open={isNewStoreDialogOpen} onOpenChange={setIsNewStoreDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Store</DialogTitle>
            <DialogDescription>
              Fill in the store details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name *</Label>
              <Input
                id="name"
                value={newStore.name}
                onChange={(e) => setNewStore({...newStore, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Textarea
                id="location"
                value={newStore.location}
                onChange={(e) => setNewStore({...newStore, location: e.target.value})}
                rows={3}
                placeholder="Store address or location description"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsNewStoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStore} disabled={isSubmitting || !newStore.name}>
              {isSubmitting ? "Creating..." : "Create Store"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditStoreDialogOpen} onOpenChange={setIsEditStoreDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
            <DialogDescription>
              Update the store details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Store Name *</Label>
              <Input
                id="editName"
                value={editStore.name}
                onChange={(e) => setEditStore({...editStore, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editLocation">Location</Label>
              <Textarea
                id="editLocation"
                value={editStore.location}
                onChange={(e) => setEditStore({...editStore, location: e.target.value})}
                rows={3}
                placeholder="Store address or location description"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditStoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStore} disabled={isSubmitting || !editStore.name}>
              {isSubmitting ? "Updating..." : "Update Store"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewStoreDialogOpen} onOpenChange={setIsViewStoreDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Store Details</DialogTitle>
            <DialogDescription>
              Store information and inventory
            </DialogDescription>
          </DialogHeader>

          {selectedStore && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Store Name</Label>
                  <p className="text-sm font-medium">{selectedStore.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Store ID</Label>
                  <p className="text-sm">#{selectedStore.id}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm">{selectedStore.location}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedStore.totalProducts}</div>
                  <div className="text-sm text-muted-foreground">Products</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedStore.totalQuantity.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Units</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedStore.totalProducts > 0 ? (selectedStore.totalQuantity / selectedStore.totalProducts).toFixed(1) : "0"}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Units/Product</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Inventory Details</Label>
                
                {selectedStore.inventory.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedStore.inventory.map((item) => (
                      <div key={item.productId} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{item.quantity.toLocaleString()} units</div>
                          <Badge variant={getInventoryStatus(item.quantity).variant}>
                            {getInventoryStatus(item.quantity).text}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>No inventory items</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
