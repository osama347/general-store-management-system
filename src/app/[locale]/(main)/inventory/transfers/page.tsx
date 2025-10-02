"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
  Trash2,
  Edit,
  AlertTriangle,
  X,
  RefreshCw,
  Check,
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
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  
  // Form states
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Data Fetching Functions
  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select(`
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
      if (error) throw error
      setProfiles(data || [])
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to load profiles", { description: err.message })
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

 const fetchTransfers = async () => {
  try {
    // Use a join query to get all related data in one request
    const { data, error } = await supabase
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
    
    if (error) throw error
    
    // Transform the data to ensure type compatibility
    const transformedData = (data as any[])?.map(item => ({
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
    
    setTransfers(transformedData)
  } catch (err: any) {
    setError(err.message)
    toast.error("Failed to load transfer history", { description: err.message })
  }
}

  // Transfer CRUD Functions
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Validate required fields
      if (!formData.product_id) {
        toast.error("Please select a product!")
        setIsSubmitting(false)
        return
      }
      
      if (!formData.from_location_id || !formData.to_location_id) {
        toast.error("Please select both source and destination locations!")
        setIsSubmitting(false)
        return
      }
      
      if (formData.from_location_id === formData.to_location_id) {
        toast.error("Source and destination locations cannot be the same!")
        setIsSubmitting(false)
        return
      }
      
      if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
        toast.error("Quantity must be greater than zero!")
        setIsSubmitting(false)
        return
      }
      
      if (!formData.created_by_profile_id) {
        toast.error("Please select a staff member!")
        setIsSubmitting(false)
        return
      }
      
      const transferData = {
        product_id: Number(formData.product_id),
        from_location_id: BigInt(formData.from_location_id),
        to_location_id: BigInt(formData.to_location_id),
        quantity: Number(formData.quantity),
        created_by_profile_id: formData.created_by_profile_id,
      }
      
      const { data, error } = await supabase
        .from("inventory_transfers")
        .insert(transferData)
        .select()
        .single()
      
      if (error) throw error
      
      toast.success("Transfer created successfully!")
      setIsTransferDialogOpen(false)
      resetForm()
      await fetchTransfers()
    } catch (err: any) {
      toast.error("Failed to create transfer", { description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTransfer = async (transferId: bigint) => {
    if (!confirm("Are you sure you want to delete this transfer? This action cannot be undone.")) {
      return
    }
    
    try {
      const { error } = await supabase.from("inventory_transfers").delete().eq("transfer_id", transferId)
      
      if (error) throw error
      
      toast.success("Transfer deleted successfully!")
      await fetchTransfers()
    } catch (err: any) {
      toast.error("Failed to delete transfer", { description: err.message })
    }
  }

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

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
  )

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchProfiles(),
          fetchProducts(),
          fetchLocations(),
          fetchTransfers(),
        ])
      } catch (err) {
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    
    if (!authLoading && !locationLoading) {
      loadData()
    }
  }, [authLoading, locationLoading, profile])
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">{t("error.title")}</p>
                <p className="text-sm text-red-700 mt-1">{t("error.description")}</p>
                {!!error && <p className="text-xs text-red-500 mt-2">{error}</p>}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t("page.title")}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("page.description")}
                {profile?.role !== "admin" && userLocationName && (
                  <span className="ml-1">{t("page.descriptionSuffix", { location: userLocationName })}</span>
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={startCreateTransfer}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("actions.newTransfer")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t("dialog.title")}</DialogTitle>
                    <DialogDescription>{t("dialog.description")}</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateTransfer}>
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
                        <TabsTrigger value="details">{t("tabs.details")}</TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="product" className="text-sm font-medium">
                              {t("form.product")}
                            </Label>
                            <div className="relative">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => setProductSelectOpen(!productSelectOpen)}
                              >
                                {formData.product_id
                                  ? products.find((p) => p.product_id.toString() === formData.product_id)?.name ||
                                    t("form.productPlaceholder")
                                  : t("form.productPlaceholder")}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                              {productSelectOpen && (
                                <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md">
                                  <Command>
                                    <CommandInput
                                      placeholder={t("form.productSearch")}
                                      value={productSearchTerm}
                                      onValueChange={setProductSearchTerm}
                                    />
                                    <CommandList>
                                      <CommandEmpty>{t("form.noProducts")}</CommandEmpty>
                                      <CommandGroup>
                                        {filteredProducts.map((product) => (
                                          <CommandItem
                                            key={product.product_id}
                                            value={product.product_id.toString()}
                                            onSelect={() => {
                                              setFormData({ ...formData, product_id: product.product_id.toString() })
                                              setProductSelectOpen(false)
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                formData.product_id === product.product_id.toString()
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            />
                                            <div>
                                              <div className="font-medium">{product.name}</div>
                                              {product.sku && (
                                                <div className="text-sm text-gray-500">SKU: {product.sku}</div>
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

                          <div className="space-y-2">
                            <Label htmlFor="quantity" className="text-sm font-medium">
                              {t("form.quantity")}
                            </Label>
                            <Input
                              id="quantity"
                              type="number"
                              min="1"
                              placeholder="0"
                              value={formData.quantity}
                              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="from_location" className="text-sm font-medium">
                              {t("form.fromLocation")}
                            </Label>
                            <Select
                              value={formData.from_location_id}
                              onValueChange={(value) => setFormData({ ...formData, from_location_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("form.fromLocationPlaceholder")} />
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
                            <Label htmlFor="to_location" className="text-sm font-medium">
                              {t("form.toLocation")}
                            </Label>
                            <Select
                              value={formData.to_location_id}
                              onValueChange={(value) => setFormData({ ...formData, to_location_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("form.toLocationPlaceholder")} />
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
                        </div>
                      </TabsContent>

                      <TabsContent value="details" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="staff" className="text-sm font-medium">
                              {t("form.staff")}
                            </Label>
                            <Select
                              value={formData.created_by_profile_id}
                              onValueChange={(value) => setFormData({ ...formData, created_by_profile_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("form.staffPlaceholder")} />
                              </SelectTrigger>
                              <SelectContent>
                                {profiles.map((profile) => (
                                  <SelectItem key={profile.id} value={profile.id}>
                                    {profile.full_name || profile.email || t("table.unknown.staff")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">{t("form.instructionsTitle")}</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {instructions.map((instruction, index) => (
                                <li key={index}>• {instruction}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <DialogFooter className="pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsTransferDialogOpen(false)
                          resetForm()
                        }}
                      >
                        {t("actions.cancel")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          !formData.product_id ||
                          !formData.from_location_id ||
                          !formData.to_location_id ||
                          !formData.quantity ||
                          !formData.created_by_profile_id
                        }
                        className="bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        {isSubmitting ? t("actions.creating") : t("actions.create")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={t("search.placeholder")}
                  className="pl-10 border-gray-200 bg-gray-50 focus:bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-gray-200 text-gray-600"
            >
              <Filter className="h-4 w-4 mr-2" />
              {t("filters.toggle")}
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
          </div>

          {showFilters && (
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("filters.product.label")}</Label>
                  <Select
                    value={filters.product}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, product: value === "all" ? "" : value }))}
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder={t("filters.product.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.product.all")}</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.product_id} value={product.product_id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("filters.fromLocation.label")}</Label>
                  <Select
                    value={filters.fromLocation}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, fromLocation: value === "all" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder={t("filters.fromLocation.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.fromLocation.all")}</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.location_id} value={location.location_id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("filters.toLocation.label")}</Label>
                  <Select
                    value={filters.toLocation}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, toLocation: value === "all" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder={t("filters.toLocation.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.toLocation.all")}</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.location_id} value={location.location_id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("filters.dateRange.label")}</Label>
                  <div className="flex gap-2">
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
                      className="border-gray-200"
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
                      className="border-gray-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                  {t("filters.clear")}
                </Button>
              </div>
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
                  <TableRow className="border-gray-100">
                    <TableHead className="font-medium text-gray-700 cursor-pointer" onClick={() => requestSort("date")}>
                      {t("table.columns.date")}
                    </TableHead>
                    <TableHead
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("product")}
                    >
                      {t("table.columns.product")}
                    </TableHead>
                    <TableHead
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("fromLocation")}
                    >
                      {t("table.columns.from")}
                    </TableHead>
                    <TableHead
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("toLocation")}
                    >
                      {t("table.columns.to")}
                    </TableHead>
                    <TableHead
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("quantity")}
                    >
                      {t("table.columns.quantity")}
                    </TableHead>
                    <TableHead
                      className="font-medium text-gray-700 cursor-pointer"
                      onClick={() => requestSort("staff")}
                    >
                      {t("table.columns.staff")}
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 text-right">{t("table.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {t("table.noTransfers")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransfers.map((transfer) => (
                      <TableRow
                        key={transfer.transfer_id.toString()}
                        className="border-gray-100 hover:bg-gray-50"
                      >
                        <TableCell className="font-medium">{formatDate(transfer.created_at)}</TableCell>
                        <TableCell>{transfer.products?.name || t("table.unknown.product")}</TableCell>
                        <TableCell>{transfer.from_location?.name || t("table.unknown.location")}</TableCell>
                        <TableCell>{transfer.to_location?.name || t("table.unknown.location")}</TableCell>
                        <TableCell className="font-medium">{transfer.quantity}</TableCell>
                        <TableCell>
                          {transfer.profiles?.full_name ||
                            transfer.profiles?.email ||
                            t("table.unknown.staff")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransfer(transfer.transfer_id)}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}