"use client"
import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Filter,
  AlertTriangle,
  X,
  RefreshCw,
  Check,
  TruckIcon,
  Building2,
  Package,
  ArrowRightLeft,
  Calendar,
  User,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "@/contexts/LocationContext"
import { useTranslations } from "next-intl"

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

interface Profile {
  id: string
  email?: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  location_id?: bigint
  phone?: string
  hire_date?: string
  is_active?: boolean
  role?: string
}

interface Transfer {
  transfer_id: bigint
  quantity: number
  created_at: string
  product_id: number
  from_location_id: bigint
  to_location_id: bigint
  created_by_profile_id: string
  products: Product | null
  from_location: Location | null
  to_location: Location | null
  profiles: Profile | null
}

interface FilterState {
  product: string
  fromLocation: string
  toLocation: string
  dateRange: { start: string; end: string }
}

export default function TransfersPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  
  // Form states
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null)
  const [formData, setFormData] = useState({
    product_id: "",
    from_location_id: "",
    to_location_id: "",
    quantity: "",
    created_by_profile_id: "",
  })
  
  // Searchable select states
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [productSelectOpen, setProductSelectOpen] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    product: "",
    fromLocation: "",
    toLocation: "",
    dateRange: { start: "", end: "" },
  })
  const [showFilters, setShowFilters] = useState(false)
  
  const { profile, loading: authLoading } = useAuth()
  const { locations: allLocations, isLoading: locationLoading } = useLocation()
  const t= useTranslations('transfers')
  
  // Get the user's location from their profile
  const userLocationId = profile?.location_id

  // Data Fetching Function
  const fetchTransfersData = async () => {
    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id, 
        email, 
        full_name, 
        avatar_url, 
        created_at, 
        updated_at, 
        location_id, 
        phone, 
        hire_date, 
        is_active, 
        role
      `)
    if (profilesError) throw profilesError
    
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
    
    // Fetch transfers with joins
    const { data: transfersData, error: transfersError } = await supabase
      .from("inventory_transfers")
      .select(`
        transfer_id,
        quantity,
        created_at,
        product_id,
        from_location_id,
        to_location_id,
        created_by_profile_id,
        products:product_id (
          product_id, 
          name, 
          sku, 
          base_price, 
          category_id
        ),
        from_location:from_location_id (
          location_id, 
          name, 
          location_type, 
          address
        ),
        to_location:to_location_id (
          location_id, 
          name, 
          location_type, 
          address
        ),
        profiles:created_by_profile_id (
          id, 
          full_name, 
          email, 
          role, 
          created_at, 
          updated_at, 
          location_id, 
          phone, 
          hire_date, 
          is_active, 
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
    if (transfersError) throw transfersError
    
    // Transform transfers data
    const transformedTransfers = (transfersData as any[])?.map(item => ({
      transfer_id: item.transfer_id,
      quantity: item.quantity,
      created_at: item.created_at,
      product_id: item.product_id,
      from_location_id: item.from_location_id,
      to_location_id: item.to_location_id,
      created_by_profile_id: item.created_by_profile_id,
      products: item.products,
      from_location: item.from_location,
      to_location: item.to_location,
      profiles: item.profiles,
    })) || []
    
    return {
      transfers: transformedTransfers,
      profiles: profilesData || [],
      products: productsData || [],
      locations: locationsData || [],
    }
  }

  // React Query for transfers data
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['transfers'],
    queryFn: fetchTransfersData,
    enabled: !authLoading && !locationLoading && !!profile,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  const transfers = data?.transfers || []
  const profiles = data?.profiles || []
  const products = data?.products || []
  const locations = data?.locations || []

  // Mutations
  const createTransferMutation = useMutation({
    mutationFn: async (transferData: any) => {
      // Validate required fields
      if (!transferData.product_id) {
        throw new Error("Please select a product!")
      }
      
      if (!transferData.from_location_id || !transferData.to_location_id) {
        throw new Error("Please select both source and destination locations!")
      }
      
      if (transferData.from_location_id === transferData.to_location_id) {
        throw new Error("Source and destination locations cannot be the same!")
      }
      
      if (!transferData.quantity || isNaN(Number(transferData.quantity)) || Number(transferData.quantity) <= 0) {
        throw new Error("Quantity must be greater than zero!")
      }
      
      if (!transferData.created_by_profile_id) {
        throw new Error("Please select a staff member!")
      }
      
      const insertData = {
        product_id: Number(transferData.product_id),
        from_location_id: BigInt(transferData.from_location_id),
        to_location_id: BigInt(transferData.to_location_id),
        quantity: Number(transferData.quantity),
        created_by_profile_id: transferData.created_by_profile_id,
      }
      
      const { data, error } = await supabase
        .from("inventory_transfers")
        .insert(insertData)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      toast.success("Transfer created successfully!")
      setIsTransferDialogOpen(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error("Failed to create transfer", { description: err.message })
    }
  })

  // Transfer CRUD Functions
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    createTransferMutation.mutate(formData)
  }

  // Delete functionality removed for safety - transfers are permanent records

  const startCreateTransfer = () => {
    setEditingTransfer(null)
    setFormData({
      product_id: "",
      from_location_id: userLocationId?.toString() || "",
      to_location_id: "",
      quantity: "",
      created_by_profile_id: profile?.id || "",
    })
    setProductSearchTerm("")
    setIsTransferDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      product_id: "",
      from_location_id: "",
      to_location_id: "",
      quantity: "",
      created_by_profile_id: "",
    })
    setProductSearchTerm("")
    setEditingTransfer(null)
  }

  // Sorting & Filtering
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  const filteredTransfers = transfers
    .filter((transfer) => {
      const matchesSearch =
        transfer.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.from_location?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.to_location?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesProduct = !filters.product || transfer.product_id?.toString() === filters.product
      const matchesFromLocation = !filters.fromLocation || transfer.from_location_id?.toString() === filters.fromLocation
      const matchesToLocation = !filters.toLocation || transfer.to_location_id?.toString() === filters.toLocation
      
      let matchesDateRange = true
      if (filters.dateRange.start && filters.dateRange.end) {
        const transferDate = new Date(transfer.created_at)
        const startDate = new Date(filters.dateRange.start)
        const endDate = new Date(filters.dateRange.end)
        matchesDateRange = transferDate >= startDate && transferDate <= endDate
      }
      
      return matchesSearch && matchesProduct && matchesFromLocation && matchesToLocation && matchesDateRange
    })
    .sort((a, b) => {
      if (!sortConfig) return 0
      
      let aValue: any, bValue: any
      switch (sortConfig.key) {
        case "date":
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        case "product":
          aValue = a.products?.name || ""
          bValue = b.products?.name || ""
          break
        case "fromLocation":
          aValue = a.from_location?.name || ""
          bValue = b.from_location?.name || ""
          break
        case "toLocation":
          aValue = a.to_location?.name || ""
          bValue = b.to_location?.name || ""
          break
        case "quantity":
          aValue = a.quantity
          bValue = b.quantity
          break
        case "staff":
          aValue = a.profiles?.full_name || ""
          bValue = b.profiles?.full_name || ""
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
      product: "",
      fromLocation: "",
      toLocation: "",
      dateRange: { start: "", end: "" },
    })
    setSearchTerm("")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Statistics Functions
  const getTotalTransfers = () => transfers.length
  const getTotalQuantity = () => transfers.reduce((sum, transfer) => sum + transfer.quantity, 0)
  const getUniqueProducts = () => new Set(transfers.map(t => t.product_id)).size
  const getRecentTransfers = () => {
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    return transfers.filter(t => new Date(t.created_at) >= sevenDaysAgo).length
  }

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
  )

  const instructions = (t.raw("form.instructions") as string[]) ?? []
  const userLocationIdString = userLocationId ? userLocationId.toString() : undefined
  const userLocationName = userLocationIdString
    ? locations.find((location) => location.location_id?.toString() === userLocationIdString)?.name
    : undefined

  if (loading || authLoading || locationLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">{t("loading")}</p>
        </div>
      </div>
    )
  }

  if (profile?.role !== "admin" && !userLocationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md p-8 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-bold mb-2">{t("noLocation.title")}</h2>
          <p className="text-gray-600">{t("noLocation.description")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Premium Sticky Header */}
      <header className="bg-white border-b-2 border-teal-200 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <TruckIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
                  {t("page.title")}
                </h1>
                {profile?.role !== "admin" && userLocationName ? (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {t("page.descriptionSuffix", { location: userLocationName })}
                  </p>
                ) : null}
              </div>
            </div>
            <Badge className="bg-gradient-to-br from-teal-50 to-emerald-100 text-teal-700 border-2 border-teal-300 px-4 py-2 text-sm font-semibold">
              {getTotalTransfers()} Transfers
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 ">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">{t("error.title")}</p>
                  <p className="text-sm text-red-700 mt-1">{t("error.description")}</p>
                  {!!error && <p className="text-xs text-red-500 mt-2">{error instanceof Error ? error.message : String(error)}</p>}
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Transfers */}
            <Card className="border-2 border-teal-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-teal-500 to-teal-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <ArrowRightLeft className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-teal-100">Total Transfers</p>
                  <div className="text-3xl font-black text-white mt-2">
                    {getTotalTransfers()}
                  </div>
                  <p className="text-xs text-teal-100 mt-3 font-medium">
                    All time transfers
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total Quantity Moved */}
            <Card className="border-2 border-emerald-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-emerald-100">Total Quantity</p>
                  <div className="text-3xl font-black text-white mt-2">
                    {getTotalQuantity().toLocaleString()}
                  </div>
                  <p className="text-xs text-emerald-100 mt-3 font-medium">
                    Units transferred
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Unique Products */}
            <Card className="border-2 border-green-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-green-500 to-green-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-100">Unique Products</p>
                  <div className="text-3xl font-black text-white mt-2">
                    {getUniqueProducts()}
                  </div>
                  <p className="text-xs text-green-100 mt-3 font-medium">
                    Products transferred
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transfers */}
            <Card className="border-2 border-slate-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-slate-500 to-slate-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">Recent Transfers</p>
                  <div className="text-3xl font-black text-white mt-2">
                    {getRecentTransfers()}
                  </div>
                  <p className="text-xs text-slate-100 mt-3 font-medium">
                    Last 7 days
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
                      {(filters.product ||
                        filters.fromLocation ||
                        filters.toLocation ||
                        filters.dateRange.start ||
                        filters.dateRange.end) && (
                        <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                          !
                        </Badge>
                      )}
                    </Button>
                    <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={startCreateTransfer}
                          className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md text-white"
                        >
                          <Plus className="h-4 w-4" />
                          {t("actions.newTransfer")}
                        </Button>
                      </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 -m-6 mb-4 p-6 rounded-t-lg">
                    <DialogTitle className="text-white text-xl">{t("dialog.title")}</DialogTitle>
                    <DialogDescription className="text-teal-100">{t("dialog.description")}</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateTransfer}>
                    <div className="space-y-6">
                      {/* Product Selection - Enhanced */}
                      <div className="space-y-2">
                        <Label htmlFor="product" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-600" />
                          {t("form.product")} <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            className={`w-full justify-between h-12 border-2 ${
                              formData.product_id 
                                ? 'border-green-300 bg-green-50/50' 
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                            onClick={() => setProductSelectOpen(!productSelectOpen)}
                          >
                            {formData.product_id ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                                  <Package className="h-3 w-3 text-purple-600" />
                                </div>
                                <span className="font-medium">
                                  {products.find((p) => p.product_id.toString() === formData.product_id)?.name ||
                                    t("form.productPlaceholder")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500">{t("form.productPlaceholder")}</span>
                            )}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                          {productSelectOpen && (
                            <div className="absolute z-10 mt-1 w-full rounded-lg border-2 border-blue-200 bg-white shadow-xl">
                              <Command>
                                <CommandInput
                                  placeholder={t("form.productSearch")}
                                  value={productSearchTerm}
                                  onValueChange={setProductSearchTerm}
                                  className="border-b"
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    <div className="py-6 text-center">
                                      <Package className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                      <p className="text-sm text-gray-500">{t("form.noProducts")}</p>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {filteredProducts.map((product) => (
                                      <CommandItem
                                        key={product.product_id}
                                        value={product.product_id.toString()}
                                        onSelect={() => {
                                          setFormData({ ...formData, product_id: product.product_id.toString() })
                                          setProductSelectOpen(false)
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            formData.product_id === product.product_id.toString()
                                              ? "opacity-100 text-green-600"
                                              : "opacity-0"
                                          }`}
                                        />
                                        <div className="flex items-center gap-3 flex-1">
                                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                                            <Package className="h-4 w-4 text-purple-600" />
                                          </div>
                                          <div className="flex-1">
                                            <div className="font-medium">{product.name}</div>
                                            {product.sku && (
                                              <div className="text-xs text-gray-500 font-mono">SKU: {product.sku}</div>
                                            )}
                                          </div>
                                          {product.base_price && (
                                            <div className="text-sm text-gray-600">${product.base_price}</div>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Transfer Flow - Visual */}
                      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                          Transfer Details
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          {/* From Location */}
                          <div className="space-y-2">
                            <Label htmlFor="from_location" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-orange-600" />
                              {t("form.fromLocation")} <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={formData.from_location_id}
                              onValueChange={(value) => setFormData({ ...formData, from_location_id: value })}
                            >
                              <SelectTrigger className={`h-12 border-2 ${
                                formData.from_location_id 
                                  ? 'border-green-300 bg-green-50/50' 
                                  : 'border-gray-200'
                              }`}>
                                <SelectValue placeholder={t("form.fromLocationPlaceholder")} />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.map((location) => (
                                  <SelectItem 
                                    key={location.location_id} 
                                    value={location.location_id.toString()}
                                    disabled={formData.to_location_id === location.location_id.toString()}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-orange-600" />
                                      {location.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Arrow Indicator */}
                          <div className="flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                                <ArrowRightLeft className="h-6 w-6 text-white" />
                              </div>
                              <div className="px-3 py-1 bg-white rounded-full border-2 border-blue-200">
                                <Input
                                  id="quantity"
                                  type="number"
                                  min="1"
                                  placeholder="0"
                                  value={formData.quantity}
                                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                  required
                                  className="w-20 h-8 text-center font-bold text-lg border-none p-0"
                                />
                              </div>
                              <span className="text-xs text-gray-500 font-medium">units</span>
                            </div>
                          </div>

                          {/* To Location */}
                          <div className="space-y-2">
                            <Label htmlFor="to_location" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-green-600" />
                              {t("form.toLocation")} <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={formData.to_location_id}
                              onValueChange={(value) => setFormData({ ...formData, to_location_id: value })}
                            >
                              <SelectTrigger className={`h-12 border-2 ${
                                formData.to_location_id 
                                  ? 'border-green-300 bg-green-50/50' 
                                  : 'border-gray-200'
                              }`}>
                                <SelectValue placeholder={t("form.toLocationPlaceholder")} />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.map((location) => (
                                  <SelectItem 
                                    key={location.location_id} 
                                    value={location.location_id.toString()}
                                    disabled={formData.from_location_id === location.location_id.toString()}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-green-600" />
                                      {location.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Validation Warning */}
                        {formData.from_location_id && formData.to_location_id && 
                         formData.from_location_id === formData.to_location_id && (
                          <div className="mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-red-900">Invalid Transfer</p>
                              <p className="text-xs text-red-700 mt-1">
                                Source and destination locations must be different
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Staff Member */}
                      <div className="space-y-2">
                        <Label htmlFor="staff" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <User className="h-4 w-4 text-purple-600" />
                          {t("form.staff")} <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.created_by_profile_id}
                          onValueChange={(value) => setFormData({ ...formData, created_by_profile_id: value })}
                        >
                          <SelectTrigger className={`h-12 border-2 ${
                            formData.created_by_profile_id 
                              ? 'border-green-300 bg-green-50/50' 
                              : 'border-gray-200'
                          }`}>
                            <SelectValue placeholder={t("form.staffPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                                    <User className="h-3 w-3 text-purple-600" />
                                  </div>
                                  {profile.full_name || profile.email || t("table.unknown.staff")}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Instructions */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                              {t("form.instructionsTitle")}
                            </h4>
                            <ul className="text-sm text-gray-700 space-y-1.5">
                              {instructions.map((instruction, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-amber-600 font-bold">•</span>
                                  <span>{instruction}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="pt-6 border-t-2 border-teal-100 mt-6">
                      <div className="flex items-center justify-between w-full">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsTransferDialogOpen(false)
                            resetForm()
                          }}
                          className="border-2 border-teal-200 hover:bg-teal-50"
                        >
                          <X className="h-4 w-4 mr-2" />
                          {t("actions.cancel")}
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            createTransferMutation.isPending ||
                            !formData.product_id ||
                            !formData.from_location_id ||
                            !formData.to_location_id ||
                            !formData.quantity ||
                            !formData.created_by_profile_id ||
                            formData.from_location_id === formData.to_location_id
                          }
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {createTransferMutation.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              {t("actions.creating")}
                            </>
                          ) : (
                            <>
                              <TruckIcon className="h-4 w-4 mr-2" />
                              {t("actions.create")}
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
                  </div>
                </div>

                {showFilters && (
                  <div className="p-6 bg-gradient-to-br from-teal-50/50 to-emerald-50/30 border-b border-teal-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <Filter className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
                          <p className="text-xs text-gray-500">Refine your transfer search</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters} 
                        className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Product Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Package className="h-4 w-4 text-teal-600" />
                          {t("filters.product.label")}
                        </Label>
                        <Select
                          value={filters.product}
                          onValueChange={(value) => setFilters((prev) => ({ ...prev, product: value === "all" ? "" : value }))}
                        >
                          <SelectTrigger className={`border-2 ${
                            filters.product ? 'border-teal-300 bg-teal-50/50' : 'border-teal-200'
                          } focus:ring-teal-500`}>
                      <SelectValue placeholder={t("filters.product.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          {t("filters.product.all")}
                        </div>
                      </SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.product_id} value={product.product_id.toString()}>
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3 text-purple-600" />
                            {product.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.product && (
                    <div className="flex items-center gap-1 text-xs text-purple-600">
                      <Check className="h-3 w-3" />
                      <span>Filter active</span>
                    </div>
                  )}
                </div>

                {/* From Location Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    {t("filters.fromLocation.label")}
                  </Label>
                  <Select
                    value={filters.fromLocation}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, fromLocation: value === "all" ? "" : value }))
                    }
                  >
                    <SelectTrigger className={`border-2 ${
                      filters.fromLocation ? 'border-orange-300 bg-orange-50/50' : 'border-gray-200'
                    }`}>
                      <SelectValue placeholder={t("filters.fromLocation.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          {t("filters.fromLocation.all")}
                        </div>
                      </SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.location_id} value={location.location_id.toString()}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-orange-600" />
                            {location.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.fromLocation && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <Check className="h-3 w-3" />
                      <span>Filter active</span>
                    </div>
                  )}
                </div>

                {/* To Location Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-green-600" />
                    {t("filters.toLocation.label")}
                  </Label>
                  <Select
                    value={filters.toLocation}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, toLocation: value === "all" ? "" : value }))
                    }
                  >
                    <SelectTrigger className={`border-2 ${
                      filters.toLocation ? 'border-green-300 bg-green-50/50' : 'border-gray-200'
                    }`}>
                      <SelectValue placeholder={t("filters.toLocation.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          {t("filters.toLocation.all")}
                        </div>
                      </SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.location_id} value={location.location_id.toString()}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-green-600" />
                            {location.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.toLocation && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="h-3 w-3" />
                      <span>Filter active</span>
                    </div>
                  )}
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    {t("filters.dateRange.label")}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      type="date"
                      placeholder={t("filters.dateRange.start")}
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value },
                        }))
                      }
                      className={`border-2 ${
                        filters.dateRange.start ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'
                      }`}
                    />
                    <Input
                      type="date"
                      placeholder={t("filters.dateRange.end")}
                      value={filters.dateRange.end}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value },
                        }))
                      }
                      className={`border-2 ${
                        filters.dateRange.end ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'
                      }`}
                    />
                  </div>
                  {(filters.dateRange.start || filters.dateRange.end) && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Check className="h-3 w-3" />
                      <span>Filter active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Filters Summary */}
              {(filters.product || filters.fromLocation || filters.toLocation || filters.dateRange.start || filters.dateRange.end) && (
                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                      {filters.product && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">
                          <Package className="h-3 w-3 mr-1" />
                          {products.find(p => p.product_id.toString() === filters.product)?.name}
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, product: "" }))}
                            className="ml-1 hover:text-purple-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {filters.fromLocation && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200">
                          <Building2 className="h-3 w-3 mr-1" />
                          From: {locations.find(l => l.location_id.toString() === filters.fromLocation)?.name}
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, fromLocation: "" }))}
                            className="ml-1 hover:text-orange-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {filters.toLocation && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          To: {locations.find(l => l.location_id.toString() === filters.toLocation)?.name}
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, toLocation: "" }))}
                            className="ml-1 hover:text-green-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {(filters.dateRange.start || filters.dateRange.end) && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200">
                          <Calendar className="h-3 w-3 mr-1" />
                          {filters.dateRange.start && filters.dateRange.end 
                            ? `${filters.dateRange.start} to ${filters.dateRange.end}`
                            : filters.dateRange.start 
                            ? `From ${filters.dateRange.start}`
                            : `Until ${filters.dateRange.end}`
                          }
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, dateRange: { start: "", end: "" } }))}
                            className="ml-1 hover:text-blue-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {filteredTransfers.length} {filteredTransfers.length === 1 ? 'result' : 'results'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50 border-b-2 border-teal-200">
                      <TableHead className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600" onClick={() => requestSort("date")}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {t("table.columns.date")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600"
                        onClick={() => requestSort("product")}
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {t("table.columns.product")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600"
                        onClick={() => requestSort("fromLocation")}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {t("table.columns.from")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600"
                        onClick={() => requestSort("toLocation")}
                      >
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4" />
                          {t("table.columns.to")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600"
                        onClick={() => requestSort("quantity")}
                      >
                        {t("table.columns.quantity")}
                      </TableHead>
                      <TableHead
                        className="font-semibold text-gray-700 cursor-pointer hover:text-teal-600"
                        onClick={() => requestSort("staff")}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t("table.columns.staff")}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">{t("table.columns.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-4 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mb-4">
                            <TruckIcon className="h-10 w-10 text-teal-600" />
                          </div>
                          <p className="text-lg font-semibold text-gray-700 mb-2">{t("table.noTransfers")}</p>
                          <Button 
                            onClick={startCreateTransfer} 
                            className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Transfer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransfers.map((transfer) => (
                      <TableRow
                        key={transfer.transfer_id.toString()}
                        className="border-b transition-all duration-200 hover:bg-teal-50/50"
                      >
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-teal-600" />
                            </div>
                            {formatDate(transfer.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center">
                              <Package className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{transfer.products?.name || t("table.unknown.product")}</p>
                              {transfer.products?.sku && (
                                <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {transfer.products.sku}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{transfer.from_location?.name || t("table.unknown.location")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4 text-teal-500" />
                            <span className="font-medium text-gray-700">{transfer.to_location?.name || t("table.unknown.location")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xl text-teal-600">{transfer.quantity}</span>
                            <span className="text-xs text-gray-500">units</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-teal-600" />
                            </div>
                            <span className="text-gray-700">
                              {transfer.profiles?.full_name ||
                                transfer.profiles?.email ||
                                t("table.unknown.staff")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700 border-teal-200">
                              Permanent Record
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  )
}