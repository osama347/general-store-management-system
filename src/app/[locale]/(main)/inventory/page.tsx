"use client"
import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  Boxes,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Building2,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "@/contexts/LocationContext"

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
  products: Product
  locations: Location
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
  const supabase = createClient()
  const queryClient = useQueryClient()
  const t = useTranslations("inventory")
  const { profile, loading: authLoading } = useAuth()
  const { currentLocation, locations: allLocations, isLoading: locationLoading } = useLocation()
  
  // UI State
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  const [productId, setProductId] = useState<string>("")
  const [locationId, setLocationId] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("")
  const [showInventoryForm, setShowInventoryForm] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    category: "",
    locationType: "",
    stockLevel: "",
    priceRange: { min: "", max: "" },
  })
  const [showFilters, setShowFilters] = useState(false)
  
  const userLocationId = profile?.location_id
  const effectiveLocationId = profile?.role === 'admin' ? currentLocation?.location_id : userLocationId

  // Fetch inventory data with React Query
  const fetchInventoryData = async () => {
    // Fetch categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("category_id, name, description")
    if (categoriesError) throw categoriesError

    // Fetch products
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("product_id, name, sku, base_price, category_id")
    if (productsError) throw productsError

    // Fetch locations
    const { data: locationsData, error: locationsError } = await supabase
      .from("locations")
      .select("location_id, name, location_type, address")
    if (locationsError) throw locationsError

    // Fetch inventory with location filter
    let inventoryQuery = supabase.from("inventory").select(`
      product_id,
      location_id,
      quantity,
      reserved_quantity,
      products:product_id ( product_id, name, sku, base_price, category_id ),
      locations:location_id ( location_id, name, location_type, address )
    `)
    
    if (effectiveLocationId) {
      inventoryQuery = inventoryQuery.eq('location_id', effectiveLocationId)
    }

    const { data: inventoryData, error: inventoryError } = await inventoryQuery
    if (inventoryError) throw inventoryError
    
    // Transform the data to match our interface
    const transformedInventory = (inventoryData || []).map((item: any) => ({
      product_id: item.product_id,
      location_id: item.location_id,
      quantity: item.quantity,
      reserved_quantity: item.reserved_quantity,
      products: Array.isArray(item.products) ? item.products[0] : item.products,
      locations: Array.isArray(item.locations) ? item.locations[0] : item.locations,
    }))

    return {
      inventory: transformedInventory,
      products: productsData || [],
      locations: locationsData || [],
      categories: categoriesData || [],
    }
  }

  // React Query for inventory data
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['inventory', effectiveLocationId],
    queryFn: fetchInventoryData,
    enabled: !authLoading && !locationLoading && !!profile,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  const inventory = data?.inventory || []
  const products = data?.products || []
  const locations = data?.locations || []
  const categories = data?.categories || []

  // Statistics calculations
  const getTotalItems = () => {
    return inventory.reduce((sum, item) => sum + item.quantity, 0)
  }

  const getLowStockCount = () => {
    return inventory.filter(item => item.quantity < 50 && item.quantity >= 10).length
  }

  const getCriticalStockCount = () => {
    return inventory.filter(item => item.quantity < 10).length
  }

  const getTotalValue = () => {
    return inventory.reduce((sum, item) => {
      return sum + (item.quantity * (item.products?.base_price || 0))
    }, 0)
  }

  // Mutations
  const addInventoryMutation = useMutation({
    mutationFn: async ({ productId, locationId, quantity }: { productId: string; locationId: string; quantity: string }) => {
      if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
        throw new Error("Quantity must be greater than zero!")
      }
      
      // Determine location to use based on user role
      let targetLocationId: string
      
      if (profile?.role === 'admin') {
        // Admin users: use selected location or currentLocation
        targetLocationId = locationId || currentLocation?.location_id?.toString() || ""
      } else {
        // Non-admin users: use their profile location
        targetLocationId = userLocationId?.toString() || ""
      }
      
      if (!targetLocationId) {
        throw new Error("No location selected. Please select a location first.")
      }
      
      const { error } = await supabase.rpc("add_inventory", {
        p_product_id: Number(productId),
        p_location_id: BigInt(targetLocationId),
        p_quantity: Number(quantity),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success("Inventory added successfully!")
      setProductId("")
      setLocationId("")
      setQuantity("")
      setShowInventoryForm(false)
    },
    onError: (err: Error) => {
      toast.error("Failed to add inventory", { description: err.message })
    }
  })

  // Inventory Function
  const handleAddInventory = async () => {
    addInventoryMutation.mutate({ productId, locationId, quantity })
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
    <div className="flex flex-col min-h-screen">
      {/* Premium Sticky Header */}
      <header className="bg-white border-b-2 border-teal-200 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Boxes className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
                  {t("page.title")}
                </h1>
                {(profile?.role === 'admin' && currentLocation) || profile?.location ? (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {profile?.role === 'admin' && currentLocation ? currentLocation.name : profile?.location?.name}
                  </p>
                ) : null}
              </div>
            </div>
            <Badge className="bg-gradient-to-br from-teal-50 to-emerald-100 text-teal-700 border-2 border-teal-300 px-4 py-2 text-sm font-semibold">
              {getTotalItems()} Items in Stock
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 ">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">{t("alerts.loadFailed")}</p>
                  <p className="text-sm text-red-700 mt-1">{error instanceof Error ? error.message : String(error)}</p>
                </div>
              </div>
            </div>
          )}

          {/* KPI Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total SKUs Card */}
            <Card className="border-2 border-teal-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-teal-500 to-teal-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-teal-100">Total SKUs</p>
                  <div className="text-3xl font-black text-white mt-2">
                    {inventory.length}
                  </div>
                  <p className="text-xs text-teal-100 mt-3 font-medium">
                    Unique product-location pairs
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Card */}
            <Card className="border-2 border-emerald-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-emerald-100">Low Stock</p>
                  <div className="text-3xl font-black text-white mt-2">
                    {getLowStockCount()}
                  </div>
                  <p className="text-xs text-emerald-100 mt-3 font-medium">
                    Items below 50 units
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Critical Stock Card */}
            <Card className="border-2 border-red-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-red-500 to-red-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-red-100">Critical Stock</p>
                  <div className="text-3xl font-black text-white mt-2">
                    {getCriticalStockCount()}
                  </div>
                  <p className="text-xs text-red-100 mt-3 font-medium">
                    Items below 10 units
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total Value Card */}
            <Card className="border-2 border-green-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-green-500 to-green-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-100">Total Value</p>
                  <div className="text-3xl font-black text-white mt-2">
                    ${getTotalValue().toFixed(0)}
                  </div>
                  <p className="text-xs text-green-100 mt-3 font-medium">
                    Inventory worth at base price
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Card */}
          <Card className="border-2 border-teal-100 shadow-lg bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 border-b border-teal-100">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder={t("page.searchPlaceholder")}
                        className="pl-10 border-2 border-teal-200 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="border-2 border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {t("page.filtersToggle")}
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
                    <Button
                      size="sm"
                      onClick={() => setShowInventoryForm(!showInventoryForm)}
                      className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md text-white"
                    >
                      <Plus className="h-4 w-4" />
                      {t("actions.addStock")}
                    </Button>
                  </div>
                </div>
              </div>

              {showFilters && (
                <div className="p-6 bg-gradient-to-br from-teal-50/50 to-emerald-50/30 border-b border-teal-100">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t("filters.category.label")}</Label>
                      <Select
                        value={filters.category}
                        onValueChange={(value) =>
                          setFilters((prev) => ({ ...prev, category: value === "all" ? "" : value }))
                        }
                      >
                        <SelectTrigger className="border-2 border-teal-200 bg-white focus:ring-teal-500">
                          <SelectValue placeholder={t("filters.category.all")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("filters.category.all")}</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.category_id} value={cat.category_id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t("filters.locationType.label")}</Label>
                      <Select
                        value={filters.locationType}
                        onValueChange={(value) =>
                          setFilters((prev) => ({ ...prev, locationType: value === "all" ? "" : value }))
                        }
                      >
                        <SelectTrigger className="border-2 border-teal-200 bg-white focus:ring-teal-500">
                          <SelectValue placeholder={t("filters.locationType.all")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("filters.locationType.all")}</SelectItem>
                          <SelectItem value="warehouse">{t("filters.locationType.warehouse")}</SelectItem>
                          <SelectItem value="store">{t("filters.locationType.store")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t("filters.stockLevel.label")}</Label>
                      <Select
                        value={filters.stockLevel}
                        onValueChange={(value) =>
                          setFilters((prev) => ({ ...prev, stockLevel: value === "all" ? "" : value }))
                        }
                      >
                        <SelectTrigger className="border-2 border-teal-200 bg-white focus:ring-teal-500">
                          <SelectValue placeholder={t("filters.stockLevel.all")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("filters.stockLevel.all")}</SelectItem>
                          <SelectItem value="low">{t("filters.stockLevel.low")}</SelectItem>
                          <SelectItem value="medium">{t("filters.stockLevel.medium")}</SelectItem>
                          <SelectItem value="high">{t("filters.stockLevel.high")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t("filters.priceRange.label")}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder={t("filters.priceRange.min")}
                          value={filters.priceRange.min}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              priceRange: { ...prev.priceRange, min: e.target.value },
                            }))
                          }
                          className="border-2 border-teal-200 bg-white focus:border-teal-500"
                        />
                        <Input
                          type="number"
                          placeholder={t("filters.priceRange.max")}
                          value={filters.priceRange.max}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              priceRange: { ...prev.priceRange, max: e.target.value },
                            }))
                          }
                          className="border-2 border-teal-200 bg-white focus:border-teal-500"
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
                      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t("page.clearFilters")}
                    </Button>
                  </div>
                </div>
              )}

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
                      <TableRow className="bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50 border-b-2 border-teal-200">
                        <TableHead className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors" onClick={() => requestSort("product")}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {t("table.columns.product")}
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors" onClick={() => requestSort("location")}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {t("table.columns.location")}
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors" onClick={() => requestSort("type")}>
                          {t("table.columns.type")}
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors" onClick={() => requestSort("stock")}>
                          <div className="flex items-center gap-2">
                            <Boxes className="h-4 w-4" />
                            Stock Level
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600 transition-colors" onClick={() => requestSort("price")}>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Unit Price
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <DollarSign className="h-4 w-4" />
                            Stock Value
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedInventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-16">
                            <div className="flex flex-col items-center justify-center text-gray-500">
                              <div className="p-4 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full w-20 h-20 mb-4 flex items-center justify-center">
                                <Boxes className="h-10 w-10 text-teal-600" />
                              </div>
                              <p className="text-lg font-semibold text-gray-700">No inventory items found</p>
                              <p className="text-sm text-gray-500 mt-2">Start by adding stock to your inventory</p>
                              <Button
                                onClick={() => setShowInventoryForm(true)}
                                className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Stock
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAndSortedInventory.map((item, index) => {
                          const stockValue = item.quantity * (item.products?.base_price || 0)
                          const isLowStock = item.quantity < 50 && item.quantity >= 10
                          const isCritical = item.quantity < 10
                          
                          return (
                            <TableRow 
                              key={index} 
                              className={`border-b transition-all duration-200 ${
                                isCritical 
                                  ? 'hover:bg-red-50/50 bg-red-50/20' 
                                  : isLowStock
                                  ? 'hover:bg-emerald-50/50 bg-emerald-50/20'
                                  : 'hover:bg-teal-50/50'
                              }`}
                            >
                              <TableCell className="font-semibold text-gray-900">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <Package className="h-5 w-5 text-teal-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{item.products?.name || t("table.unknownProduct")}</p>
                                    {item.products?.sku && (
                                      <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {item.products.sku}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-teal-400" />
                                  <span className="font-medium">{item.locations?.name || t("table.unknownLocation")}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={item.locations?.location_type === "warehouse" ? "secondary" : "outline"}
                                  className="capitalize font-medium border-teal-200"
                                >
                                  {item.locations?.location_type === "warehouse"
                                    ? t("filters.locationType.warehouse")
                                    : item.locations?.location_type === "store"
                                    ? t("filters.locationType.store")
                                    : t("table.unknownType")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col">
                                    <span
                                      className={`font-bold text-2xl leading-none ${
                                        isCritical
                                          ? "text-red-600"
                                          : isLowStock
                                          ? "text-emerald-600"
                                          : "text-teal-600"
                                      }`}
                                    >
                                      {item.quantity}
                                    </span>
                                    <span className="text-xs text-gray-500 mt-1">units</span>
                                  </div>
                                  {isCritical && (
                                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 border border-red-200 rounded-lg">
                                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                                      <span className="text-xs font-semibold text-red-700">Critical</span>
                                    </div>
                                  )}
                                  {isLowStock && !isCritical && (
                                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 border border-emerald-200 rounded-lg">
                                      <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                                      <span className="text-xs font-semibold text-emerald-700">Low</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900">
                                    {item.products?.base_price ? `$${item.products.base_price.toFixed(2)}` : "—"}
                                  </span>
                                  <span className="text-xs text-gray-500 mt-0.5">per unit</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-teal-700">
                                    ${stockValue.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-500 mt-0.5">total value</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Add Stock Dialog */}
      <Dialog open={showInventoryForm} onOpenChange={setShowInventoryForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 -m-6 mb-4 p-6 rounded-t-lg">
            <DialogTitle className="text-xl flex items-center gap-2 text-white">
              <Package className="h-5 w-5" />
              {t("dialog.addTitle")}
            </DialogTitle>
            <DialogDescription className="text-teal-100">{t("dialog.description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t("dialog.fields.product")}</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="border-2 border-teal-200 focus:ring-teal-500">
                  <SelectValue placeholder={t("dialog.placeholders.product")} />
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
              <Label className="text-sm font-medium text-gray-700">{t("dialog.fields.location")}</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="border-2 border-teal-200 focus:ring-teal-500">
                  <SelectValue placeholder={t("dialog.placeholders.location")} />
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
              <Label className="text-sm font-medium text-gray-700">{t("dialog.fields.quantity")}</Label>
              <Input
                type="number"
                placeholder={t("dialog.placeholders.quantity")}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="border-2 border-teal-200 focus:border-teal-500 focus:ring-teal-500"
                min="0"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowInventoryForm(false)} disabled={addInventoryMutation.isPending} className="border-2 border-teal-200 hover:bg-teal-50">
              {t("actions.cancel")}
            </Button>
            <Button
              onClick={handleAddInventory}
              disabled={addInventoryMutation.isPending || !productId || !locationId || !quantity}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            >
              {addInventoryMutation.isPending ? t("actions.adding") : t("actions.addStock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}