"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  DollarSign,
  Package,
  Users,
  X,
  Loader2,
  Filter,
  CheckCircle,
  TrendingUp,
   Download, 
  Eye, 
  MoreVertical, 
  Receipt, 
  Mail, 
  FileText,
  Clock,
  Printer,
  CheckCircle2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "@/contexts/LocationContext"
import { useTranslations } from "next-intl"
import { receiptGenerator, type ReceiptData } from "@/lib/receipt-generator"
import { toast } from "sonner"


// Define types
interface Category {
  category_id: number
  name: string
}

interface Inventory {
  product_id: number
  location_id: number
  quantity: number
  reserved_quantity: number
  updated_at?: string
}

interface Product {
  product_id: number
  name: string
  description: string
  sku: string
  base_price: number
  category_id: number
  category: Category
  inventory: Inventory[]
}

interface Customer {
  customer_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  location_id?: number
}

interface Sale {
  sale_id: number
  customer_id: number
  profile_id: string | null
  sale_date: string
  total_amount: number
  status: string
  customer: Customer
}

interface CartItem {
  product_id: number
  name: string
  price: number
  quantity: number
  stock: number
}

// interface Staff {
//   staff_id: number
//   first_name: string
//   last_name: string
//   email?: string
//   phone?: string
//   role?: string
// }

export default function MinimalistPOSPage() {
  const t = useTranslations("sales")
  const { currentLocation } = useLocation()
  const { profile } = useAuth() 
  const supabase = createClient()
  const queryClient = useQueryClient()

  // UI State
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
  })
  const [salesSearchTerm, setSalesSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" })
  const [statusFilter, setStatusFilter] = useState("all")
  const [completedSale, setCompletedSale] = useState<Sale | null>(null)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)

  // Fetch POS data with React Query
  const fetchPOSData = async () => {
    if (!currentLocation) throw new Error("No location selected")

    // Fetch products with categories and inventory
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(*),
        inventory(*)
      `)

    if (productsError) throw productsError

    // Fetch customers filtered by current location
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("*")
      .eq('location_id', currentLocation.location_id)

    if (customersError) throw customersError

    // Fetch sales with customer info
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select(`*,customers(*)`)
      .order("sale_date", { ascending: false })

    if (salesError) throw salesError

    // Fetch categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("name")

    if (categoriesError) throw categoriesError

    // Filter products by current location
    const filteredProducts = (productsData || []).filter(product => {
      return product.inventory && product.inventory.some((inv: any) => 
        inv.location_id === currentLocation.location_id
      )
    })

    return {
      products: filteredProducts,
      customers: customersData || [],
      sales: salesData || [],
      categories: categoriesData?.map((c: any) => c.name) || []
    }
  }

  // React Query for POS data
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['pos-data', currentLocation?.location_id],
    queryFn: fetchPOSData,
    enabled: !!currentLocation,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  const products = data?.products || []
  const customers = data?.customers || []
  const sales = data?.sales || []
  const categories = data?.categories || []

  // Mutation for creating customer
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: typeof newCustomer) => {
      if (!currentLocation?.location_id) throw new Error("No location selected")
      
      const { data, error } = await supabase
        .from("customers")
        .insert([{ ...customerData, location_id: currentLocation.location_id }])
        .select()
        .single()

      if (error) throw error
      return data as Customer
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['pos-data'] })
      setSelectedCustomer(customer)
      setNewCustomer({ first_name: "", last_name: "", email: "", phone: "", address: "" })
      setIsNewCustomerOpen(false)
      toast.success("Customer created successfully")
    },
    onError: (error) => {
      console.error("Error creating customer:", error)
      toast.error("Failed to create customer")
    }
  })

  // Mutation for completing checkout
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error("No customer selected")
      if (!profile?.id || !currentLocation) throw new Error("Missing profile or location")

      // Create sale record
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert([{
          customer_id: selectedCustomer.customer_id,
          profile_id: profile.id,
          location_id: currentLocation.location_id,
          sale_date: new Date().toISOString(),
          total_amount: cartTotal,
          status: "Completed",
        }])
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cartItems.map((item) => ({
        sale_id: saleData.sale_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: Number(item.price) * item.quantity,
      }))

      const { error: saleItemsError } = await supabase.from("sale_items").insert(saleItems)
      if (saleItemsError) throw saleItemsError

      // Update inventory quantities
      for (const item of cartItems) {
        const product = products.find((p) => p.product_id === item.product_id)
        if (product?.inventory) {
          const locationInventory = product.inventory.find((inv: any) => inv.location_id === currentLocation.location_id)
          
          if (locationInventory) {
            const { error: updateError } = await supabase
              .from("inventory")
              .update({ quantity: locationInventory.quantity - item.quantity })
              .eq("product_id", item.product_id)
              .eq("location_id", currentLocation.location_id)

            if (updateError) throw updateError
          }
        }
      }

      return { saleData, customer: selectedCustomer }
    },
    onSuccess: ({ saleData, customer }) => {
      queryClient.invalidateQueries({ queryKey: ['pos-data'] })
      
      const newSale: Sale = {
        sale_id: saleData.sale_id,
        customer_id: customer.customer_id,
        profile_id: profile!.id,
        sale_date: saleData.sale_date,
        total_amount: saleData.total_amount,
        status: saleData.status,
        customer: customer,
      }
      
      setCompletedSale(newSale)
      setCartItems([])
      setSelectedCustomer(null)
      setIsCheckoutOpen(false)
      setIsSuccessDialogOpen(true)
      toast.success("Sale completed successfully!")
    },
    onError: (error: any) => {
      console.error("Error processing sale:", error)
      toast.error(`Failed to process sale: ${error.message}`)
    }
  })

  // Filter sales based on search, status, and date
  const filteredSales = sales.filter((sale) => {
    const matchesSearch = 
      sale.sale_id.toString().includes(salesSearchTerm) ||
      (sale.customer?.first_name && sale.customer.first_name.toLowerCase().includes(salesSearchTerm.toLowerCase())) ||
      (sale.customer?.last_name && sale.customer.last_name.toLowerCase().includes(salesSearchTerm.toLowerCase())) ||
      (sale.customer?.email && sale.customer.email.toLowerCase().includes(salesSearchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter
    
    let matchesDate = true
    if (dateFilter.from) {
      const fromDate = new Date(dateFilter.from)
      const saleDate = new Date(sale.sale_date)
      matchesDate = matchesDate && saleDate >= fromDate
    }
    if (dateFilter.to) {
      const toDate = new Date(dateFilter.to)
      toDate.setHours(23, 59, 59)
      const saleDate = new Date(sale.sale_date)
      matchesDate = matchesDate && saleDate <= toDate
    }
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || product.category?.name === categoryFilter
    return matchesSearch && matchesCategory
  })

  const addToCart = (product: Product) => {
  // Calculate stock only for the current location
  const locationInventory = product.inventory?.filter(
    (inv) => currentLocation && inv.location_id === currentLocation.location_id
  ) || []
  
  const totalStock = locationInventory.reduce((sum, inv) => sum + inv.quantity, 0)

  setCartItems((prev) => {
    const existing = prev.find((item) => item.product_id === product.product_id)
    if (existing) {
      if (existing.quantity < totalStock) {
        return prev.map((item) =>
          item.product_id === product.product_id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return prev
    }
    return [
      ...prev,
      {
        product_id: product.product_id,
        name: product.name,
        price: Number(product.base_price),
        quantity: 1,
        stock: totalStock,
      },
    ]
  })
}

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      setCartItems((prev) => prev.filter((item) => item.product_id !== productId))
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.product_id === productId ? { ...item, quantity: Math.min(newQuantity, item.stock) } : item,
        ),
      )
    }
  }

  const removeFromCart = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.product_id !== productId))
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleCreateCustomer = async () => {
    if (!currentLocation?.location_id) {
      toast.error("Please select a location first")
      return
    }
    createCustomerMutation.mutate(newCustomer)
  }

  const handlePrintReceipt = async (sale: Sale) => {
    try {
      toast.loading("Generating receipt...")
      
      // Fetch sale items with product details
      const { data: saleItems, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
          *,
          products (
            name,
            sku
          )
        `)
        .eq("sale_id", sale.sale_id)

      if (itemsError) throw itemsError

      // Prepare receipt data
      const receiptData: ReceiptData = {
        sale_id: sale.sale_id,
        sale_date: sale.sale_date,
        total_amount: Number(sale.total_amount),
        status: sale.status,
        customer: {
          first_name: sale.customer?.first_name || "Walk-in",
          last_name: sale.customer?.last_name || "Customer",
          email: sale.customer?.email,
          phone: sale.customer?.phone,
        },
        staff: profile ? {
          full_name: profile.full_name || profile.email || "Staff",
          email: profile.email,
        } : undefined,
        location: currentLocation ? {
          name: currentLocation.name,
          address: currentLocation.address || undefined,
        } : undefined,
        items: (saleItems || []).map((item: any) => ({
          product_name: item.products?.name || "Unknown Product",
          sku: item.products?.sku,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
        })),
      }

      // Generate and print receipt
      receiptGenerator.printReceipt(receiptData)
      toast.dismiss()
      toast.success("Receipt opened in new tab")
    } catch (error) {
      console.error("Error printing receipt:", error)
      toast.dismiss()
      toast.error("Failed to generate receipt")
    }
  }


  const handleCheckout = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer first")
      return
    }
    if (!profile?.id || !currentLocation) return
    
    checkoutMutation.mutate()
  }

  const clearCart = () => {
    setCartItems([])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AF", {
      style: "currency",
      currency: "AFN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto" />
          <p className="text-slate-600 font-medium">{t("loading")}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-slate-800 font-medium">{t("somethingwentwrong")}</p>
          <p className="text-slate-600 text-sm">{error instanceof Error ? error.message : String(error)}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['pos-data'] })} variant="outline" className="bg-white">
            {t('tryAgain')}
          </Button>
        </div>
      </div>
    )
  }
  if (!currentLocation) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-slate-600 font-medium">{t("nolocationselected")}</p>
        <p className="text-slate-600">{t("pleaseselectalocation")}</p>
      </div>
    </div>
  )
}

  return (
    <div className="min-h-screen ">
      {/* Professional Header */}
      <header className="bg-white border-b-2 border-teal-200 shadow-md sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 tracking-tight">{t('pointofsale')}</h1>
                <p className="text-slate-600 text-sm font-medium">{currentLocation?.name || t('processtransactions')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg border-2 border-teal-300 shadow-sm">
                  <Package className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-semibold text-teal-900">{products.length}</span>
                  <span className="text-xs text-teal-600 font-semibold">{t('products')}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border-2 border-emerald-300 shadow-sm">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">{customers.length}</span>
                  <span className="text-xs text-emerald-600 font-semibold">{t('customers')}</span>
                </div>
              </div>
              <Badge variant="outline" className="px-3 py-1.5 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-300 shadow-sm">
                <Clock className="h-3 w-3 mr-1.5" />
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <Tabs defaultValue="pos" className="space-y-6">
          {/* Modern Tab Navigation */}
          <TabsList className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-lg inline-flex">
            <TabsTrigger 
              value="pos" 
              className="px-8 py-3 text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {t('tabs.terminal')}
            </TabsTrigger>
            <TabsTrigger 
              value="sales" 
              className="px-8 py-3 text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {t('tabs.history')}
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="px-8 py-3 text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {t('tabs.analytics')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pos" className="space-y-0">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Product Selection - Professional Layout */}
              <div className="xl:col-span-2 space-y-5">
                {/* Enhanced Search and Filter Bar */}
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative group">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-slate-600 transition-colors" />
                      <Input
                        placeholder={t("searchplaceholder") }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 py-3.5 bg-slate-50 border-slate-200 text-base focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent rounded-xl font-medium"
                      />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 z-10" />
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-56 pl-11 py-3.5 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 rounded-xl font-medium">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-200 shadow-xl rounded-xl">
                          <SelectItem value="all" className="font-medium">{t('availableProducts.allcategories')}</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category} className="font-medium">
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Product Grid - Premium Cards */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{t('products')}</h3>
                        <p className="text-slate-500 text-sm mt-0.5">{filteredProducts.length} {t('availableProducts.availableProducts')}</p>
                      </div>
                      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="p-5">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-20">
                          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <Package className="h-10 w-10 text-slate-400" />
                          </div>
                          <p className="text-slate-700 font-semibold text-lg">{t('availableProducts.noproductsfound')}</p>
                          <p className="text-slate-500 text-sm mt-2">{t('availableProducts.tryadjusting')}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                          {filteredProducts.map((product) => {
                            // Calculate stock only for current location
                            const locationInventory = product.inventory?.filter(
                              (inv: any) => currentLocation && inv.location_id === currentLocation.location_id
                            ) || []
                            const totalStock = locationInventory.reduce((sum: number, inv: any) => sum + inv.quantity, 0)
                            const inCart = cartItems.find(item => item.product_id === product.product_id)
                            const isLowStock = totalStock > 0 && totalStock <= 10
                            
                            return (
                              <div
                                key={product.product_id}
                                className="group relative bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 hover:shadow-xl transition-all duration-300 border-2 border-slate-100 hover:border-slate-300"
                              >
                                {/* Stock Badge - Top Right */}
                                <Badge 
                                  variant={totalStock > 10 ? "secondary" : totalStock > 0 ? "outline" : "destructive"} 
                                  className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 ${
                                    totalStock > 10 
                                      ? "bg-green-100 text-green-700 border-green-200" 
                                      : isLowStock 
                                        ? "bg-orange-100 text-orange-700 border-orange-200"
                                        : "bg-red-100 text-red-700 border-red-200"
                                  }`}
                                >
                                  {totalStock} {t('availableProducts.left')}
                                </Badge>
                                
                                {/* Product Icon */}
                                <div className="w-14 h-14 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                                  <Package className="h-7 w-7 text-white" />
                                </div>
                                
                                {/* Product Info */}
                                <div className="space-y-2.5 mb-4">
                                  <h4 className="font-bold text-slate-900 line-clamp-2 leading-tight text-base">
                                    {product.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded inline-block">
                                    {product.sku}
                                  </p>
                                  <div className="pt-1">
                                    <span className="text-2xl font-bold text-slate-900 tracking-tight">
                                      {formatCurrency(Number(product.base_price))}
                                    </span>
                                  </div>
                                </div>

                                {/* Add to Cart Button */}
                                <Button
                                  onClick={() => addToCart(product)}
                                  disabled={totalStock === 0}
                                  className={`w-full ${
                                    inCart 
                                      ? "bg-green-600 hover:bg-green-700" 
                                      : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                                  } text-white border-0 rounded-xl py-3 font-semibold disabled:opacity-50 shadow-md transition-all`}
                                >
                                  {inCart ? (
                                    <>
                                      <CheckCircle2 className="h-5 w-5 mr-2" />
                                      {t('availableProducts.addmore')}
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-5 w-5 mr-2" />
                                      {t('availableProducts.addtocart')}
                                    </>
                                  )}
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Cart and Checkout Sidebar - Premium Design */}
              <div className="xl:col-span-1 space-y-5 h-fit sticky top-24">
              
                {/* Customer Selection - Enhanced */}
<div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
      <User className="h-5 w-5 text-white" />
    </div>
    <h3 className="font-bold text-slate-900 text-base">{t('customer.label')}</h3>
  </div>

  {selectedCustomer ? (
    <div className="space-y-3">
      <div className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border-2 border-teal-200">
        <p className="font-bold text-slate-900 text-base">
          {selectedCustomer.first_name} {selectedCustomer.last_name}
        </p>
        {selectedCustomer.email && selectedCustomer.email !== 'walkin@example.com' && (
          <p className="text-sm text-slate-700 mt-1.5 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {selectedCustomer.email}
          </p>
        )}
        {selectedCustomer.phone && selectedCustomer.phone !== '000-000-0000' && (
          <p className="text-sm text-slate-700 mt-1">{selectedCustomer.phone}</p>
        )}
      </div>
      <Button
        variant="outline"
        onClick={() => setSelectedCustomer(null)}
        className="w-full border-slate-300 hover:bg-slate-50 font-semibold"
      >
        <User className="h-4 w-4 mr-2" />
       {t('customer.changeCustomer')}
      </Button>
    </div>
  ) : (
    <div className="space-y-4">
      {/* Walk-in Customer Quick Select - Enhanced */}
      {customers.find(c => c.first_name.toLowerCase() === 'walk-in') && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Quick Select</Label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <Button
              onClick={() => {
                const walkInCustomer = customers.find(c => c.first_name.toLowerCase() === 'walk-in')
                if (walkInCustomer) setSelectedCustomer(walkInCustomer)
              }}
              className="relative w-full bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 hover:from-teal-700 hover:via-emerald-700 hover:to-green-700 text-white h-12 font-bold shadow-lg hover:shadow-xl rounded-xl transition-all duration-300 border-2 border-white/20"
            >
              <span className="text-base font-bold flex items-center justify-center gap-2">
                🚶 Walk-in Customer
              </span>
            </Button>
          </div>
        </div>
      )}
      
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-slate-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            Or
          </span>
        </div>
      </div>
      
      {/* Regular Customers Dropdown - Enhanced */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-slate-700">Registered Customers</Label>
        <Select
          onValueChange={(value) => {
            const customer = customers.find((c) => c.customer_id.toString() === value)
            if (customer) setSelectedCustomer(customer)
          }}
        >
          <SelectTrigger className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-500 focus:border-transparent h-12 font-medium rounded-xl shadow-sm">
            <SelectValue placeholder={t('customer.selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="border-2 border-slate-200 shadow-xl rounded-xl">
            {customers
              .filter(c => c.first_name.toLowerCase() !== 'walk-in')
              .map((customer) => (
                <SelectItem key={customer.customer_id} value={customer.customer_id.toString()} className="font-medium">
                  {customer.first_name} {customer.last_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      
      <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full border-slate-300 hover:bg-slate-50 font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            {t('customer.addNew')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{t('customer.addNew')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">{t('customer.addcustomerform.formFields.firstname')}</Label>
                <Input
                  id="firstName"
                  value={newCustomer.first_name}
                  onChange={(e) =>
                    setNewCustomer((prev) => ({ ...prev, first_name: e.target.value }))
                  }
                  className="bg-slate-50 border-0 focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">{t('customer.addcustomerform.formFields.lastname')}</Label>
                <Input
                  id="lastName"
                  value={newCustomer.last_name}
                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, last_name: e.target.value }))}
                  className="bg-slate-50 border-0 focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">{t('customer.addcustomerform.formFields.email')}</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-slate-50 border-0 focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-slate-700">{t('customer.addcustomerform.formFields.phone')}</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                className="bg-slate-50 border-0 focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-slate-700">{t('customer.addcustomerform.formFields.address')}</Label>
              <Input
                id="address"
                value={newCustomer.address || ""}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, address: e.target.value }))}
                className="bg-slate-50 border-0 focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <Button onClick={handleCreateCustomer} className="w-full bg-slate-900 hover:bg-slate-800">
              {t('customer.addNew')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )}
</div>

                {/* Staff Selection - Enhanced */}
               <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center shadow-md">
      <Users className="h-5 w-5 text-white" />
    </div>
    <h3 className="font-bold text-slate-900 text-base">{t('staff.title')}</h3>
  </div>

  {profile && profile.id && (
    <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200">
      <p className="font-bold text-slate-900 text-base">
        {profile.full_name || "Staff Member"}
      </p>
      {profile.role && (
        <Badge className="mt-2 bg-emerald-600 text-white border-0 font-semibold">{profile.role}</Badge>
      )}
    </div>
  )}
</div>


                {/* Shopping Cart - Premium Design */}
                <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
                  <div className="p-5 bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">{t('cart.title')}</h3>
                          <p className="text-sm text-white/90 font-medium">{cartItemCount} {t('cart.items')}</p>
                        </div>
                      </div>
                      {cartItems.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearCart} 
                          className="text-white hover:bg-white/20 hover:text-white font-semibold"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {cartItems.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <ShoppingCart className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-700 font-bold text-base">{t('cart.empty')}</p>
                        <p className="text-slate-500 text-sm mt-2">{t('cart.addproductstostart')}</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        {cartItems.map((item) => (
                          <div key={item.product_id} className="flex items-center gap-3 p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-slate-100 hover:border-slate-200 transition-all">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 truncate text-sm">{item.name}</p>
                              <p className="text-sm text-slate-600 font-semibold mt-1">{formatCurrency(Number(item.price))}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Total: {formatCurrency(Number(item.price) * item.quantity)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                className="h-9 w-9 p-0 border-2 border-slate-300 hover:bg-slate-100 rounded-lg"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                max={item.stock}
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0
                                  if (value > 0 && value <= item.stock) {
                                    updateQuantity(item.product_id, value)
                                  } else if (value > item.stock) {
                                    updateQuantity(item.product_id, item.stock)
                                  }
                                }}
                                className="h-9 w-16 text-center font-bold text-base border-2 border-slate-300 rounded-lg p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                                className="h-9 w-9 p-0 border-2 border-slate-300 hover:bg-slate-100 rounded-lg disabled:opacity-40"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.product_id)}
                                className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg ml-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Checkout Section - Premium Design */}
                  {cartItems.length > 0 && (
                    <div className="p-5 bg-gradient-to-br from-slate-50 to-white border-t-2 border-slate-200">
                      <div className="space-y-4">
                        {/* Subtotal and Items */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 font-medium">{t('cart.items')}</span>
                            <span className="font-semibold text-slate-900">{cartItemCount}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t-2 border-dashed border-slate-200">
                            <span className="text-lg font-bold text-slate-900">{t('cart.total')}</span>
                            <span className="text-2xl font-black text-slate-900">{formatCurrency(cartTotal)}</span>
                          </div>
                        </div>

                        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                          <DialogTrigger asChild>
                            <Button
                              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all rounded-xl"
                              disabled={cartItems.length === 0 || !selectedCustomer || !profile?.id}
                            >
                              <CreditCard className="h-5 w-5 mr-2" />
                              {t('cart.proceedpayment')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg border-0 shadow-xl">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-semibold">{t('cart.completetransaction')}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-lg">
                                  <h4 className="font-semibold text-slate-900 mb-3">{t('cart.ordersummary')}</h4>
                                  <div className="space-y-2">
                                    {cartItems.map((item) => (
                                      <div key={item.product_id} className="flex justify-between text-sm">
                                        <span className="text-slate-700">
                                          {item.name} × {item.quantity}
                                        </span>
                                        <span className="font-medium text-slate-900">
                                          {formatCurrency(Number(item.price) * item.quantity)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <Separator className="my-3" />
                                  <div className="flex justify-between">
                                    <span className="font-semibold text-slate-900">{t('cart.total')}</span>
                                    <span className="text-lg font-bold text-slate-900">{formatCurrency(cartTotal)}</span>
                                  </div>
                                </div>

                                {/* In the checkout dialog */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg border-2 border-teal-200">
                                  <p className="text-xs text-teal-600 mb-1 font-semibold">{t('cart.customer')}</p>
                                  <p className="font-bold text-slate-900">
                                    {selectedCustomer && `${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
                                  </p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border-2 border-emerald-200">
                                  <p className="text-xs text-emerald-600 mb-1 font-semibold">{t('cart.staff')}</p>
                                  <p className="font-bold text-slate-900">
                                    {profile?.full_name} 
                                  </p>
                                </div>
                              </div>
                              </div>

                              <Button onClick={handleCheckout} className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 py-3 text-base text-white font-bold shadow-lg">
                                {t('cart.confirmpayment')}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Success Dialog with Receipt Option */}
            <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
              <DialogContent className="sm:max-w-md border-0 shadow-2xl">
                <DialogHeader>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-slate-900">
                      Sale Completed!
                    </DialogTitle>
                    <p className="text-slate-600 mt-2">
                      Transaction processed successfully
                    </p>
                  </div>
                </DialogHeader>
                
                {completedSale && (
                  <div className="space-y-4 py-4">
                    {/* Sale Summary */}
                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-5 border-2 border-teal-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Sale ID</p>
                          <p className="text-lg font-bold text-slate-900">#{completedSale.sale_id}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold">
                          {completedSale.status}
                        </Badge>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Customer</span>
                          <span className="font-semibold text-slate-900">
                            {completedSale.customer?.first_name} {completedSale.customer?.last_name}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Date</span>
                          <span className="font-semibold text-slate-900">
                            {new Date(completedSale.sale_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t-2 border-dashed border-teal-200">
                          <span className="text-base font-bold text-slate-900">Total Amount</span>
                          <span className="text-2xl font-black text-teal-600">
                            {formatCurrency(Number(completedSale.total_amount))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button
                        onClick={() => {
                          handlePrintReceipt(completedSale)
                          setIsSuccessDialogOpen(false)
                          setCompletedSale(null)
                        }}
                        className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all rounded-xl"
                      >
                        <Printer className="h-5 w-5 mr-2" />
                        Print Receipt
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            handlePrintReceipt(completedSale)
                          }}
                          className="border-2 border-teal-300 hover:bg-teal-50 hover:border-teal-400 font-semibold"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsSuccessDialogOpen(false)
                            setCompletedSale(null)
                          }}
                          className="border-2 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 font-semibold"
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Sales History Tab - Redesigned */}
          <TabsContent value="sales" className="space-y-6">
  <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
    <div className="p-6 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-md">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{t('saleshistory.title')}</h3>
            <p className="text-slate-500 text-sm mt-0.5">{sales.length} {t('saleshistory.totalSales')}</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-slate-600" />
            <Input
              placeholder="Search sales..."
              className="pl-10 w-full sm:w-72 h-11 border-2 border-slate-200 focus:border-teal-500 rounded-xl font-medium"
              value={salesSearchTerm}
              onChange={(e) => setSalesSearchTerm(e.target.value)}
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 border-2 border-slate-200 hover:border-slate-300 rounded-xl font-semibold">
                <Filter className="h-4 w-4" />
                {t('saleshistory.filters')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">{t('saleshistory.daterange')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="from-date" className="text-xs">{t('saleshistory.from')}</Label>
                      <Input 
                        id="from-date" 
                        type="date" 
                        className="h-8 text-sm"
                        value={dateFilter.from}
                        onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="to-date" className="text-xs">{t('saleshistory.to')}</Label>
                      <Input 
                        id="to-date" 
                        type="date" 
                        className="h-8 text-sm"
                        value={dateFilter.to}
                        onChange={(e) => setDateFilter({...dateFilter, to: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">{t('saleshistory.status')}</h4>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('saleshistory.allstatuses')}</SelectItem>
                      <SelectItem value="Completed">{t('saleshistory.completed')}</SelectItem>
                      <SelectItem value="Pending">{t('saleshistory.pending')}</SelectItem>
                      <SelectItem value="Cancelled">{t('saleshistory.canceled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSalesSearchTerm("")
                      setDateFilter({ from: "", to: "" })
                      setStatusFilter("all")
                    }}
                  >
                    {t('saleshistory.reset')}
                  </Button>
                  <Button size="sm" onClick={() => document.body.click()}>
                    {t('saleshistory.apply')}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" className="gap-2 h-11 border-2 border-slate-200 hover:border-slate-300 rounded-xl font-semibold">
            <Download className="h-4 w-4" />
            {t('saleshistory.export')}  
          </Button>
        </div>
      </div>
    </div>

    <div className="divide-y-2 divide-slate-100">
      {filteredSales.length === 0 ? (
        <div className="p-20 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <DollarSign className="h-10 w-10 text-slate-400" />
          </div>
          <p className="text-slate-700 font-bold text-lg">{t('saleshistory.notransactions')}</p>
          <p className="text-slate-500 text-sm mt-2">{t('saleshistory.tryadjusting')}</p>
        </div>
      ) : (
        <>
          {/* Sales Summary Cards - Premium Design */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gradient-to-br from-slate-50 to-white">
            <div className="bg-white p-5 rounded-2xl border-2 border-teal-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600 font-semibold">{t('saleshistory.totalSales')}</p>
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-teal-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(
                  filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0)
                )}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600 font-semibold">{t('saleshistory.transactions')}</p>
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{filteredSales.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-2 border-teal-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600 font-semibold">{t('saleshistory.averagesale')}</p>
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(
                  filteredSales.length > 0 
                    ? filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0) / filteredSales.length
                    : 0
                )}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-2 border-green-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600 font-semibold">{t('saleshistory.completed')}</p>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">
                {filteredSales.filter(sale => sale.status === "Completed").length}
              </p>
            </div>
          </div>
          
          {/* Sales List - Card Design */}
          <div className="p-5 space-y-4">
          {filteredSales.map((sale) => (
            <div key={sale.sale_id} className="p-5 bg-gradient-to-br from-white to-slate-50 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-base">
                        {sale.customer?.first_name} {sale.customer?.last_name}
                      </p>
                      <Badge 
                        variant={sale.status === "Completed" ? "secondary" : "outline"}
                        className={`text-xs font-bold ${
                          sale.status === "Completed" 
                            ? "bg-green-100 text-green-700 border-green-300" 
                            : sale.status === "Pending" 
                              ? "bg-yellow-100 text-yellow-700 border-yellow-300" 
                              : "bg-red-100 text-red-700 border-red-300"
                        }`}
                      >
                        {sale.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(sale.sale_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    {sale.customer?.email && sale.customer.email !== 'walkin@example.com' && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        {sale.customer.email}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="text-right bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl p-3 border-2 border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold mb-1">AMOUNT</p>
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(Number(sale.total_amount))}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">ID: #{sale.sale_id}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 px-4 border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 font-semibold rounded-xl">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md border-0 shadow-xl">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-semibold">{t("saleshistory.saledetails.title")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-xs text-slate-500">{t("saleshistory.saledetails.saleId")}</p>
                              <p className="font-medium">#{sale.sale_id}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs text-slate-500">{t("saleshistory.saledetails.date")}</p>
                              <p className="font-medium">
                                {new Date(sale.sale_date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500">{t("saleshistory.saledetails.customer")}</p>
                            <p className="font-medium">
                              {sale.customer?.first_name} {sale.customer?.last_name}
                            </p>
                            {sale.customer?.email && sale.customer.email !== 'walkin@example.com' && (
                              <p className="text-sm text-slate-600">{sale.customer.email}</p>
                            )}
                            {sale.customer?.phone && sale.customer.phone !== '000-000-0000' && (
                              <p className="text-sm text-slate-600">{sale.customer.phone}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500">{t("saleshistory.saledetails.status")}</p>
                            <Badge 
                              variant={sale.status === "Completed" ? "secondary" : "outline"}
                              className={`text-xs ${
                                sale.status === "Completed" 
                                  ? "bg-green-100 text-green-800 border-0" 
                                  : sale.status === "Pending" 
                                    ? "bg-yellow-100 text-yellow-800 border-0" 
                                    : "bg-red-100 text-red-800 border-0"
                              }`}
                            >
                              {sale.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3 pt-2">
                            <div className="flex justify-between">
                              <span className="font-medium">{t("saleshistory.saledetails.totalamount")}</span>
                              <span className="font-bold text-lg">{formatCurrency(Number(sale.total_amount))}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-2 pt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePrintReceipt(sale)}
                            >
                              <Receipt className="mr-2 h-4 w-4" />
                              {t("saleshistory.saledetails.printreciept")}
                            </Button>
                            <Button size="sm">
                              {t("saleshistory.saledetails.viewfulldetails")}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintReceipt(sale)}
                      className="h-10 px-4 border-2 border-slate-300 hover:border-slate-800 hover:bg-slate-800 hover:text-white font-semibold rounded-xl transition-all"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-2 border-slate-300 hover:border-slate-400 rounded-xl">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-2">
                        <DropdownMenuItem onClick={() => handlePrintReceipt(sale)} className="font-medium">
                          <Receipt className="mr-2 h-4 w-4" />
                          {t("saleshistory.saledetails.printreciept")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="font-medium">
                          <Mail className="mr-2 h-4 w-4" />
                          {t("saleshistory.saledetails.emailreciept")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="font-medium">
                          <FileText className="mr-2 h-4 w-4" />
                          {t("saleshistory.saledetails.viewfulldetails")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
          
          {/* Pagination */}
          {filteredSales.length > 0 && (
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing 1 to {Math.min(10, filteredSales.length)} of {filteredSales.length} results
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    {t('saleshistory.previous')}
                  </Button>
                  <Button variant="outline" size="sm">
                   {t('saleshistory.next')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  </div>
</TabsContent>

          {/* Analytics Tab - Premium Design */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-2 border-teal-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardContent className="p-0">
                  <div className="p-6 bg-gradient-to-br from-teal-600 to-emerald-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white/90">{t("Analytics.revenue")}</p>
                    <p className="text-3xl font-black text-white mt-2">
                      {formatCurrency(
                        sales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0)
                      )}
                    </p>
                    <p className="text-xs text-white/90 mt-2 font-medium">{t("Analytics.alltime")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardContent className="p-0">
                  <div className="p-6 bg-gradient-to-br from-emerald-600 to-green-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white/90">{t("Analytics.transactions")}</p>
                    <p className="text-3xl font-black text-white mt-2">{sales.length}</p>
                    <p className="text-xs text-white/90 mt-2 font-medium">{t("Analytics.completedSales")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardContent className="p-0">
                  <div className="p-6 bg-gradient-to-br from-teal-600 to-emerald-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white/90">{t("Analytics.activeCustomers")}</p>
                    <p className="text-3xl font-black text-white mt-2">{customers.length}</p>
                    <p className="text-xs text-white/90 mt-2 font-medium">{t("Analytics.registeredUsers")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics - Enhanced */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{t("Analytics.insights")}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border-2 border-teal-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">{t("Analytics.avgTransaction")}</p>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {sales.length > 0 
                      ? formatCurrency(
                          sales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0) / sales.length
                        )
                      : formatCurrency(0)
                    }
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">{t("Analytics.productsInStock")}</p>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {products.reduce((sum, product) => {
                      const totalStock = product.inventory?.reduce((invSum: number, inv: any) => invSum + inv.quantity, 0) || 0
                      return sum + totalStock
                    }, 0)} <span className="text-xl text-slate-600">units</span>
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}