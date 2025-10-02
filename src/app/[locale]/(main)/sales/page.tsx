"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  FileText 
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "@/contexts/LocationContext"
import { useTranslations } from "next-intl"


// Define types
interface Category {
  category_id: number
  name: string
}

interface Inventory {
  inventory_id: number
  product_id: number
  quantity: number
  location_id: number
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
}

interface Sale {
  sale_id: number
  customer_id: number
  profile_id: number
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
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
const WALK_IN_CUSTOMER_ID = 1;
const { profile } = useAuth()

 
  

  

  // Initialize Supabase client

  const supabase = createClient()
  const filteredSales = sales.filter((sale) => {
  // Search filter
  const matchesSearch = 
    sale.sale_id.toString().includes(salesSearchTerm) ||
    (sale.customer?.first_name && sale.customer.first_name.toLowerCase().includes(salesSearchTerm.toLowerCase())) ||
    (sale.customer?.last_name && sale.customer.last_name.toLowerCase().includes(salesSearchTerm.toLowerCase())) ||
    (sale.customer?.email && sale.customer.email.toLowerCase().includes(salesSearchTerm.toLowerCase()))
  
  // Status filter
  const matchesStatus = statusFilter === "all" || sale.status === statusFilter
  
  // Date filter
  let matchesDate = true
  if (dateFilter.from) {
    const fromDate = new Date(dateFilter.from)
    const saleDate = new Date(sale.sale_date)
    matchesDate = matchesDate && saleDate >= fromDate
  }
  if (dateFilter.to) {
    const toDate = new Date(dateFilter.to)
    toDate.setHours(23, 59, 59) // End of the day
    const saleDate = new Date(sale.sale_date)
    matchesDate = matchesDate && saleDate <= toDate
  }
  
  return matchesSearch && matchesStatus && matchesDate
})

  useEffect(() => {
  if (currentLocation) {
    fetchData()
  }
}, [currentLocation])

 const fetchData = async () => {
  try {
    setLoading(true)
    setError(null)

    // Fetch products with categories and inventory
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(*),
        inventory(*)
      `)

    if (productsError) {
      console.error("Products error:", productsError)
      throw productsError
    }

    // Fetch customers
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("*")

    if (customersError) {
      console.error("Customers error:", customersError)
      throw customersError
    }

    // Fetch sales with customer info
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select(`
        *,
        customers(*)
      `)
      .order("sale_date", { ascending: false })

    if (salesError) {
      console.error("Sales error:", salesError)
      throw salesError
    }

    // Fetch categories
const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("name")

    if (categoriesError) {
      console.error("Categories error:", categoriesError)
      throw categoriesError
    }

    // Filter products by current location
    const filteredProducts = (productsData || []).filter(product => {
      // Check if product has inventory for the current location
      return product.inventory && product.inventory.some((inv: any) => 
        currentLocation && inv.location_id === currentLocation.location_id
      )
    })

    setProducts(filteredProducts)
    setCustomers(customersData || [])
    setSales(salesData || [])
    setCategories(categoriesData?.map((c: any) => c.name) || [])
    
  } catch (error: any) {
    console.error("Error fetching data:", error)
    setError(error.message || "Failed to fetch data")
  } finally {
    setLoading(false)
  }
}

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
  try {
    const { data, error } = await supabase
      .from("customers")
      .insert([newCustomer])
      .select()
      .single()

    if (error) throw error

    const customer: Customer = data
    setSelectedCustomer(customer)
    setCustomers((prev) => [...prev, customer])
    setNewCustomer({ 
      first_name: "", 
      last_name: "", 
      email: "", 
      phone: "",
      address: "" 
    })
    setIsNewCustomerOpen(false)
  } catch (error) {
    console.error("Error creating customer:", error)
    setError("Failed to create customer")
  }
}


const handleCheckout = async () => {
  // Use the selected customer or default to walk-in customer
  const customerId = selectedCustomer ? selectedCustomer.customer_id : WALK_IN_CUSTOMER_ID;
  
  if (!profile?.id || !currentLocation) return

  try {
    // Create sale record
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          customer_id: customerId,
          profile_id: profile.id,
          sale_date: new Date().toISOString(),
          total_amount: cartTotal,
          status: "Completed",
        },
      ])
      .select()
      .single()

    if (saleError) {
      console.error("Sale creation error:", saleError)
      throw saleError
    }

    // Create sale items
    const saleItems = cartItems.map((item) => ({
      sale_id: saleData.sale_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: Number(item.price) * item.quantity,
    }))

    const { error: saleItemsError } = await supabase.from("sale_items").insert(saleItems)
    if (saleItemsError) {
      console.error("Sale items error:", saleItemsError)
      throw saleItemsError
    }

    // Update inventory quantities - only for current location
    for (const item of cartItems) {
      const product = products.find((p) => p.product_id === item.product_id)
      if (product?.inventory) {
        // Find inventory for current location
        const locationInventory = product.inventory.find(
          inv => inv.location_id === currentLocation.location_id
        )
        
        if (locationInventory) {
          const { error: updateError } = await supabase
            .from("inventory")
            .update({
              quantity: locationInventory.quantity - item.quantity,
            })
            .eq("inventory_id", locationInventory.inventory_id)

          if (updateError) {
            console.error("Inventory update error:", updateError)
            throw updateError
          }
        }
      }
    }

    // Reset after successful sale
    setCartItems([])
    setSelectedCustomer(null)

    setIsCheckoutOpen(false)

    // Refresh data
    fetchData()
  } catch (error: any) {
    console.error("Error processing sale:", error)
    setError(`Failed to process sale: ${error.message}`)
  }
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
          <p className="text-slate-600 text-sm">{error}</p>
          <Button onClick={fetchData} variant="outline" className="bg-white">
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
    <div className="min-h-screen bg-slate-50">
      {/* Minimal Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('pointofsale')}</h1>
              <p className="text-slate-600 text-sm mt-1">{t('processtransactions')}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0">
                {products.length} {t('products')}
              </Badge>
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0">
                {customers.length} {t('customers')}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="pos" className="space-y-8">
          {/* Simplified Tab Navigation */}
          <TabsList className="bg-white p-1 rounded-xl border shadow-sm">
            <TabsTrigger 
              value="pos" 
              className="px-6 py-3 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg transition-all"
            >
              {t('tabs.terminal')}
            </TabsTrigger>
            <TabsTrigger 
              value="sales" 
              className="px-6 py-3 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg transition-all"
            >
              {t('tabs.history')}
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="px-6 py-3 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg transition-all"
            >
              {t('tabs.analytics')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pos" className="space-y-0">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* Product Selection - Clean and Spacious */}
              <div className="xl:col-span-8 space-y-6">
                {/* Search and Filter Bar */}
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                      <Input
                        placeholder={t("searchplaceholder") }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 py-3 bg-slate-50 border-0 text-base focus:bg-white focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-48 pl-10 py-3 bg-slate-50 border-0 focus:bg-white focus:ring-2 focus:ring-slate-900">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="border-0 shadow-lg">
                          <SelectItem value="all">{t('availableProducts.allcategories')}</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Product Grid - Minimalist Cards */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">{t('products')}</h3>
                    <p className="text-slate-600 text-sm mt-1">{filteredProducts.length} {t('availableProducts.availableProducts')}</p>
                  </div>
                  
                  <ScrollArea className="h-[600px]">
                    <div className="p-6">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-16">
                          <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-600 font-medium">{t('availableProducts.noproductsfound')}</p>
                          <p className="text-slate-500 text-sm mt-1">{t('availableProducts.tryadjusting')}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredProducts.map((product) => {
                            const totalStock = product.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0
                            const inCart = cartItems.find(item => item.product_id === product.product_id)
                            
                            return (
                              <div
                                key={product.product_id}
                                className="group relative bg-slate-50 rounded-xl p-4 hover:bg-white hover:shadow-md transition-all duration-200 border hover:border-slate-200"
                              >
                                {/* Product Icon */}
                                <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center mb-4 group-hover:bg-slate-300 transition-colors">
                                  <Package className="h-6 w-6 text-slate-600" />
                                </div>
                                
                                {/* Product Info */}
                                <div className="space-y-2 mb-4">
                                  <h4 className="font-semibold text-slate-900 line-clamp-2 leading-snug">
                                    {product.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 font-mono">{product.sku}</p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-slate-900">
                                      {formatCurrency(Number(product.base_price))}
                                    </span>
                                    <Badge 
                                      variant={totalStock > 10 ? "secondary" : totalStock > 0 ? "outline" : "destructive"} 
                                      className="text-xs border-0"
                                    >
                                      {totalStock} {t('availableProducts.left')}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Add to Cart Button */}
                                <Button
                                  onClick={() => addToCart(product)}
                                  disabled={totalStock === 0}
                                  className="w-full bg-slate-900 hover:bg-slate-800 text-white border-0 rounded-lg py-2.5 font-medium disabled:opacity-50"
                                >
                                  {inCart ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {t('availableProducts.addmore')}
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-2" />
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

              {/* Cart and Checkout Sidebar */}
              <div className="xl:col-span-4 space-y-6">
              
                {/* Customer Selection */}
<div className="bg-white rounded-xl p-6 shadow-sm border">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
      <User className="h-4 w-4 text-slate-600" />
    </div>
    <h3 className="font-semibold text-slate-900">{t('customer.label')}</h3>
  </div>

  {selectedCustomer ? (
    <div className="space-y-3">
      <div className="p-4 bg-slate-50 rounded-lg">
        <p className="font-semibold text-slate-900">
          {selectedCustomer.first_name} {selectedCustomer.last_name}
        </p>
        {selectedCustomer.email && selectedCustomer.email !== 'walkin@example.com' && (
          <p className="text-sm text-slate-600 mt-1">{selectedCustomer.email}</p>
        )}
        {selectedCustomer.phone && selectedCustomer.phone !== '000-000-0000' && (
          <p className="text-sm text-slate-600">{selectedCustomer.phone}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setSelectedCustomer(null)}
          className="flex-1 border-slate-200 hover:bg-slate-50"
        >
         {t('customer.changeCustomer')}
        </Button>
        <Button
          variant="outline"
          onClick={() => setSelectedCustomer(null)}
          className="border-slate-200 hover:bg-slate-50"
        >
          Walk-in
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      <Select
        onValueChange={(value) => {
          if (value === "walkin") {
            setSelectedCustomer(null); // Will use default walk-in customer
          } else {
            const customer = customers.find((c) => c.customer_id.toString() === value)
            if (customer) setSelectedCustomer(customer)
          }
        }}
      >
        <SelectTrigger className="bg-slate-50 border-0 focus:bg-white focus:ring-2 focus:ring-slate-900">
          <SelectValue placeholder={t('customer.selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent className="border-0 shadow-lg">
          <SelectItem value="walkin">🚶 Walk-in Customer</SelectItem>
          {customers.map((customer) => (
            <SelectItem key={customer.customer_id} value={customer.customer_id.toString()}>
              {customer.first_name} {customer.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50">
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

                {/* Staff Selection */}
               <div className="bg-white rounded-xl p-6 shadow-sm border">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
      <Users className="h-4 w-4 text-slate-600" />
    </div>
    <h3 className="font-semibold text-slate-900">{t('staff.title')}</h3>
  </div>

  {profile && profile.id && (
    <div className="p-4 bg-slate-50 rounded-lg">
      <p className="font-semibold text-slate-900">
        {profile.full_name || "Staff Member"}
      </p>
      {profile.role && (
        <p className="text-sm text-slate-600 mt-1">{profile.role}</p>
      )}
    </div>
  )}
</div>


                {/* Shopping Cart */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{t('cart.title')}</h3>
                          <p className="text-sm text-slate-600">{cartItemCount} {t('cart.items')}</p>
                        </div>
                      </div>
                      {cartItems.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearCart} className="text-slate-500 hover:text-slate-700">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {cartItems.length === 0 ? (
                      <div className="p-8 text-center">
                        <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">{t('cart.empty')}</p>
                        <p className="text-slate-500 text-sm mt-1">{t('cart.addproductstostart')}</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        {cartItems.map((item) => (
                          <div key={item.product_id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{item.name}</p>
                              <p className="text-sm text-slate-600">{formatCurrency(Number(item.price))}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                className="h-8 w-8 p-0 border-slate-200"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-semibold w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                                className="h-8 w-8 p-0 border-slate-200"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.product_id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Checkout Section */}
                  {cartItems.length > 0 && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-slate-900">{t('cart.total')}</span>
                          <span className="text-xl font-bold text-slate-900">{formatCurrency(cartTotal)}</span>
                        </div>

                        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                          <DialogTrigger asChild>
                            <Button
                              className="w-full bg-slate-900 hover:bg-slate-800 py-3 text-base font-medium"
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
  <div className="p-3 bg-slate-50 rounded-lg">
    <p className="text-xs text-slate-600 mb-1">{t('cart.customer')}</p>
    <p className="font-medium text-slate-900">
      {selectedCustomer 
        ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` 
        : "Walk-in Customer"}
    </p>
  </div>
  <div className="p-3 bg-slate-50 rounded-lg">
    <p className="text-xs text-slate-600 mb-1">{t('cart.staff')}</p>
    <p className="font-medium text-slate-900">
      {profile?.full_name} 
    </p>
  </div>
</div>
                              </div>

                              <Button onClick={handleCheckout} className="w-full bg-slate-900 hover:bg-slate-800 py-3 text-base">
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
          </TabsContent>

          {/* Sales History Tab */}
          <TabsContent value="sales" className="space-y-6">
  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
    <div className="p-6 border-b border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">{t('saleshistory.title')}</h3>
          <p className="text-slate-600 text-sm mt-1">{sales.length} {t('saleshistory.totalSales')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search sales..."
              className="pl-9 w-full sm:w-64"
              value={salesSearchTerm}
              onChange={(e) => setSalesSearchTerm(e.target.value)}
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
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
          
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            {t('saleshistory.export')}  
          </Button>
        </div>
      </div>
    </div>

    <div className="divide-y divide-slate-100">
      {filteredSales.length === 0 ? (
        <div className="p-12 text-center">
          <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">{t('saleshistory.notransactions')}</p>
          <p className="text-slate-500 text-sm mt-1">{t('saleshistory.tryadjusting')}</p>
        </div>
      ) : (
        <>
          {/* Sales Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50">
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-slate-600">{t('saleshistory.totalSales')}</p>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(
                  filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0)
                )}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-slate-600">{t('saleshistory.transactions')}</p>
              <p className="text-xl font-bold text-slate-900">{filteredSales.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-slate-600">{t('saleshistory.averagesale')}</p>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(
                  filteredSales.length > 0 
                    ? filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0) / filteredSales.length
                    : 0
                )}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-slate-600">{t('saleshistory.completed')}</p>
              <p className="text-xl font-bold text-slate-900">
                {filteredSales.filter(sale => sale.status === "Completed").length}
              </p>
            </div>
          </div>
          
          {/* Sales List */}
          {filteredSales.map((sale) => (
            <div key={sale.sale_id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {sale.customer?.first_name} {sale.customer?.last_name}
                      </p>
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
                    <p className="text-sm text-slate-600">
                      {new Date(sale.sale_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    {sale.customer?.email && sale.customer.email !== 'walkin@example.com' && (
                      <p className="text-xs text-slate-500 mt-1">{sale.customer.email}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(Number(sale.total_amount))}</p>
                    <p className="text-xs text-slate-500">ID: #{sale.sale_id}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
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
                            <Button variant="outline" size="sm">
                              {t("saleshistory.saledetails.printreciept")}
                            </Button>
                            <Button size="sm">
                              {t("saleshistory.saledetails.viewfulldetails")}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Receipt className="mr-2 h-4 w-4" />
                          {t("saleshistory.saledetails.printreciept")}

                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          {t("saleshistory.saledetails.emailreciept")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-600">{t("Analytics.revenue")}</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {formatCurrency(
                          sales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0)
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{t("Analytics.alltime")}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-600">{t("Analytics.transactions")}</p>
                      <p className="text-2xl font-bold text-slate-900">{sales.length}</p>
                      <p className="text-xs text-slate-500">{t("Analytics.completedSales")}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-600">{t("Analytics.activeCustomers")}</p>
                      <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
                      <p className="text-xs text-slate-500">{t("Analytics.registeredUsers")}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-slate-900 mb-4">{t("Analytics.insights")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">{t("Analytics.avgTransaction")}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {sales.length > 0 
                      ? formatCurrency(
                          sales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount), 0) / sales.length
                        )
                      : formatCurrency(0)
                    }
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">{t("Analytics.productsInStock")}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {products.reduce((sum, product) => {
                      const totalStock = product.inventory?.reduce((invSum, inv) => invSum + inv.quantity, 0) || 0
                      return sum + totalStock
                    }, 0)} units
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