"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  RefreshCw,
  Filter,
  Package,
  AlertTriangle,
  X,
} from "lucide-react"

const supabase = createClient()

// Interfaces - Updated to match schema
interface Product {
  product_id: number
  name: string
  sku?: string
  base_price?: number
  category_id: number
}

interface Location {
  location_id: bigint
  name: string
  location_type: string
  address?: string
}

interface InventoryRow {
  product_id: number
  location_id: bigint
  quantity: number
  reserved_quantity: number
  products: Product | null
  locations: Location | null
}

interface Category {
  category_id: number
  name: string
  description?: string
}

interface FilterState {
  category: string
  locationType: string
  stockLevel: string
  priceRange: { min: string; max: string }
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  
  // Form states
  const [productId, setProductId] = useState<string>("")
  const [locationId, setLocationId] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("")
  const [showInventoryForm, setShowInventoryForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [categories, setCategories] = useState<Category[]>([])
  const [filters, setFilters] = useState<FilterState>({
    category: "",
    locationType: "",
    stockLevel: "",
    priceRange: { min: "", max: "" },
  })
  const [showFilters, setShowFilters] = useState(false)

  // Data Fetching Functions
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("category_id, name, description")
      if (error) throw error
      setCategories(data || [])
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to load categories", { description: err.message })
    }
  }

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase.from("inventory").select(`
          product_id,
          location_id,
          quantity,
          reserved_quantity,
          products ( product_id, name, sku, base_price, category_id ),
          locations ( location_id, name, location_type, address )
        `)
      if (error) throw error
      setInventory(data?.map((item:any) => ({
        product_id: item.product_id,
        location_id: item.location_id,
        quantity: item.quantity,
        reserved_quantity: item.reserved_quantity,
        products: item.products,
        locations: item.locations,
      })) || [])
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to load inventory", { description: err.message })
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("product_id, name, sku, base_price, category_id")
      if (error) throw error
      setProducts(data || [])
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to load products", { description: err.message })
    }
  }

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase.from("locations").select("location_id, name, location_type, address")
      if (error) throw error
      setLocations(data || [])
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to load locations", { description: err.message })
    }
  }

  // Inventory Function
  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
        toast.error("Quantity must be greater than zero!")
        return
      }
      const { error } = await supabase.rpc("add_inventory", {
        p_product_id: Number(productId),
        p_location_id: BigInt(locationId), // Changed to BigInt to match schema
        p_quantity: Number(quantity),
      })
      if (error) throw error
      toast.success("Inventory added successfully!")
      setProductId("")
      setLocationId("")
      setQuantity("")
      setShowInventoryForm(false)
      await fetchInventory()
    } catch (err: any) {
      toast.error("Failed to add inventory", { description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Sorting & Filtering
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  const getProductName = (item: InventoryRow) => item.products?.name || ""
  const getLocationName = (item: InventoryRow) => item.locations?.name || ""

  const filteredInventory = inventory
    .filter((item) => {
      const matchesSearch =
        getProductName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getLocationName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !filters.category || item.products?.category_id?.toString() === filters.category
      const matchesLocationType = !filters.locationType || item.locations?.location_type === filters.locationType
      let matchesStockLevel = true
      if (filters.stockLevel === "low") {
        matchesStockLevel = item.quantity < 10
      } else if (filters.stockLevel === "critical") {
        matchesStockLevel = item.quantity < 5
      } else if (filters.stockLevel === "in-stock") {
        matchesStockLevel = item.quantity >= 10
      }
      const matchesPriceRange =
        (!filters.priceRange.min || (item.products?.base_price || 0) >= Number.parseFloat(filters.priceRange.min)) &&
        (!filters.priceRange.max || (item.products?.base_price || 0) <= Number.parseFloat(filters.priceRange.max))
      return matchesSearch && matchesCategory && matchesLocationType && matchesStockLevel && matchesPriceRange
    })
    .sort((a, b) => {
      if (!sortConfig) return 0
      let aValue: any, bValue: any
      switch (sortConfig.key) {
        case "product":
          aValue = getProductName(a)
          bValue = getProductName(b)
          break
        case "location":
          aValue = getLocationName(a)
          bValue = getLocationName(b)
          break
        case "quantity":
          aValue = a.quantity
          bValue = b.quantity
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
      category: "",
      locationType: "",
      stockLevel: "",
      priceRange: { min: "", max: "" },
    })
    setSearchTerm("")
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchInventory(),
          fetchProducts(),
          fetchLocations(),
          fetchCategories(),
        ])
      } catch (err) {
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredAndSortedInventory = filteredInventory.sort((a, b) => {
    if (!sortConfig) return 0
    let aValue: any, bValue: any
    switch (sortConfig.key) {
      case "product":
        aValue = a.products?.name || ""
        bValue = b.products?.name || ""
        break
      case "sku":
        aValue = a.products?.sku || ""
        bValue = b.products?.sku || ""
        break
      case "location":
        aValue = a.locations?.name || ""
        bValue = b.locations?.name || ""
        break
      case "type":
        aValue = a.locations?.location_type || ""
        bValue = b.locations?.location_type || ""
        break
      case "stock":
        aValue = a.quantity
        bValue = b.quantity
        break
      case "price":
        aValue = a.products?.base_price || 0
        bValue = b.products?.base_price || 0
        break
      default:
        return 0
    }
    if (aValue < bValue) {
      return sortConfig.direction === "ascending" ? -1 : 1
    }
    if (aValue > bValue) {
      return sortConfig.direction === "ascending" ? 1 : -1
    }
    return 0
  })

  return (
    <div className="min-h-screen bg-gray-50/30">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-light text-gray-900 tracking-tight">Inventory Management</h1>
              <p className="text-sm text-gray-500 font-normal">Monitor and manage your stock levels</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  fetchInventory()
                  toast.success("Data refreshed")
                }}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setShowInventoryForm(!showInventoryForm)}
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Unable to load data</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Products</p>
                    <p className="text-2xl font-light text-gray-900 mt-2">{inventory.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                    <p className="text-2xl font-light text-gray-900 mt-2">
                      {inventory.filter((item) => item.quantity < 10).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Locations</p>
                    <p className="text-2xl font-light text-gray-900 mt-2">{locations.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Add Stock Form */}
        {showInventoryForm && (
          <Card className="border-0 shadow-sm bg-white mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-gray-900">Add New Stock</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInventoryForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Product</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.product_id} value={product.product_id.toString()}>
                          {product.name} {product.sku && `(${product.sku})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Location</Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Select location" />
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Quantity</Label>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="border-gray-200"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleAddInventory}
                  disabled={isSubmitting || !productId || !locationId || !quantity}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {isSubmitting ? "Adding..." : "Add Stock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Search and Filters */}
        <Card className="border-0 shadow-sm bg-white mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search products, SKUs, locations..."
                    className="pl-10 border-gray-200 bg-gray-50 focus:bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="border-gray-200 text-gray-600 hover:text-gray-900"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {(filters.category ||
                  filters.locationType ||
                  filters.stockLevel ||
                  filters.priceRange.min ||
                  filters.priceRange.max) && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                    !
                  </Badge>
                )}
              </Button>
            </div>
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Category</Label>
                    <Select
                      value={filters.category}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, category: value === "all" ? "" : value }))
                      }
                    >
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.category_id} value={cat.category_id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Location Type</Label>
                    <Select
                      value={filters.locationType}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, locationType: value === "all" ? "" : value }))
                      }
                    >
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                        <SelectItem value="store">Store</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Stock Level</Label>
                    <Select
                      value={filters.stockLevel}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, stockLevel: value === "all" ? "" : value }))
                      }
                    >
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="All levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All levels</SelectItem>
                        <SelectItem value="low">Low Stock (&lt; 10)</SelectItem>
                        <SelectItem value="medium">Medium Stock (10-50)</SelectItem>
                        <SelectItem value="high">High Stock (&gt; 50)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Price Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.priceRange.min}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            priceRange: { ...prev.priceRange, min: e.target.value },
                          }))
                        }
                        className="border-gray-200"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.priceRange.max}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            priceRange: { ...prev.priceRange, max: e.target.value },
                          }))
                        }
                        className="border-gray-200"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        category: "",
                        locationType: "",
                        stockLevel: "",
                        priceRange: { min: "", max: "" },
                      })
                    }
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear all filters
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Inventory Table */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-100">
                      <TableHead 
                        className="font-medium text-gray-700 cursor-pointer"
                        onClick={() => requestSort("product")}
                      >
                        Product
                      </TableHead>
                      <TableHead 
                        className="font-medium text-gray-700 cursor-pointer"
                        onClick={() => requestSort("sku")}
                      >
                        SKU
                      </TableHead>
                      <TableHead 
                        className="font-medium text-gray-700 cursor-pointer"
                        onClick={() => requestSort("location")}
                      >
                        Location
                      </TableHead>
                      <TableHead 
                        className="font-medium text-gray-700 cursor-pointer"
                        onClick={() => requestSort("type")}
                      >
                        Type
                      </TableHead>
                      <TableHead 
                        className="font-medium text-gray-700 cursor-pointer"
                        onClick={() => requestSort("stock")}
                      >
                        Stock
                      </TableHead>
                      <TableHead 
                        className="font-medium text-gray-700 cursor-pointer"
                        onClick={() => requestSort("price")}
                      >
                        Price
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedInventory.map((item, index) => (
                      <TableRow key={index} className="border-gray-50 hover:bg-gray-50/50">
                        <TableCell className="font-medium text-gray-900">
                          {item.products?.name || "Unknown Product"}
                        </TableCell>
                        <TableCell className="text-gray-600">{item.products?.sku || "—"}</TableCell>
                        <TableCell className="text-gray-600">
                          {item.locations?.name || "Unknown Location"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.locations?.location_type === "warehouse" ? "secondary" : "outline"}
                            className="capitalize"
                          >
                            {item.locations?.location_type || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${item.quantity < 10 ? "text-red-600" : item.quantity < 50 ? "text-amber-600" : "text-green-600"}`}
                            >
                              {item.quantity}
                            </span>
                            {item.quantity < 10 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {item.products?.base_price ? `$${item.products.base_price.toFixed(2)}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}