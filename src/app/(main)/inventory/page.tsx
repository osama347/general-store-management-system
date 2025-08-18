// components/InventoryManagement.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Plus, 
  Warehouse,
  Store,
  ArrowRight,
  AlertTriangle,
  Package,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Filter
} from "lucide-react"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

interface Product {
  product_id: number
  name: string
  sku: string
  base_price: number
  categories: { name: string }[]
}

interface GeneralInventory {
  inventory_id: number
  product_id: number
  quantity: number
  reserved_quantity: number
  available_quantity: number
  created_at: string
  updated_at: string
}

interface WarehouseInventoryItem {
  product_id: number
  warehouse_id: number
  quantity: number
  warehouses: {
    name: string
    location: string
  }
}

interface StoreInventoryItem {
  product_id: number
  store_id: number
  quantity: number
  stores: {
    name: string
    location: string
  }
}

interface InventoryDistribution {
  product_id: number
  product_name: string
  sku: string
  total_quantity: number
  reserved_quantity: number
  available_quantity: number
  warehouse_quantity: number
  store_quantity: number
  distributed_quantity: number
  remaining_quantity: number
}

interface Warehouse {
  warehouse_id: number
  name: string
  location: string
}

interface Store {
  store_id: number
  name: string
  location: string
}

interface InventoryTransfer {
  transfer_id: number
  product_id: number
  from_warehouse_id: number
  to_store_id: number
  quantity: number
  transfer_date: string
}

interface TransferResult {
  success: boolean
  message: string
  transfer_id: number | null
}

export default function InventoryManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [generalInventory, setGeneralInventory] = useState<GeneralInventory[]>([])
  const [warehouseInventory, setWarehouseInventory] = useState<WarehouseInventoryItem[]>([])
  const [storeInventory, setStoreInventory] = useState<StoreInventoryItem[]>([])
  const [inventoryDistribution, setInventoryDistribution] = useState<InventoryDistribution[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  
  // Form states
  const [isAddInventoryDialogOpen, setIsAddInventoryDialogOpen] = useState(false)
  const [isDistributeDialogOpen, setIsDistributeDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [addInventoryForm, setAddInventoryForm] = useState({
    productId: "",
    quantity: 1
  })
  
  const [distributeForm, setDistributeForm] = useState({
    productId: "",
    warehouseId: "none",
    storeId: "none",
    warehouseQuantity: 0,
    storeQuantity: 0
  })
  
  const [transferForm, setTransferForm] = useState({
    productId: "",
    fromWarehouseId: "",
    toStoreId: "",
    quantity: 1
  })
  
  const supabase = createClient()
  
  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          product_id,
          name,
          sku,
          base_price,
          categories (name)
        `)
      
      if (productsError) throw productsError
      
      // Fetch general inventory
      const { data: generalInventoryData, error: generalInventoryError } = await supabase
        .from("general_inventory")
        .select("*")
      
      if (generalInventoryError) throw generalInventoryError
      
      // Fetch warehouse inventory
      const { data: warehouseInventoryData, error: warehouseInventoryError } = await supabase
        .from("inventory")
        .select(`
          product_id,
          warehouse_id,
          quantity,
          warehouses (name, location)
        `)
      
      if (warehouseInventoryError) throw warehouseInventoryError
      
      // Fetch store inventory
      const { data: storeInventoryData, error: storeInventoryError } = await supabase
        .from("store_inventory")
        .select(`
          product_id,
          store_id,
          quantity,
          stores (name, location)
        `)
      
      if (storeInventoryError) throw storeInventoryError
      
      // Fetch inventory distribution view
      const { data: distributionData, error: distributionError } = await supabase
        .from("inventory_distribution_view")
        .select("*")
      
      if (distributionError) throw distributionError
      
      // Fetch transfers
      const { data: transfersData, error: transfersError } = await supabase
        .from("inventory_transfers")
        .select("*")
        .order("transfer_date", { ascending: false })
      
      if (transfersError) throw transfersError
      
      // Fetch warehouses and stores
      const [warehousesData, storesData] = await Promise.all([
        supabase.from("warehouses").select("*"),
        supabase.from("stores").select("*")
      ])
      
      if (warehousesData.error) throw warehousesData.error
      if (storesData.error) throw storesData.error
      
      // Set state with fetched data
      setProducts(productsData || [])
      setGeneralInventory(generalInventoryData || [])
      setWarehouseInventory(warehouseInventoryData || [])
      setStoreInventory(storeInventoryData || [])
      setInventoryDistribution(distributionData || [])
      setTransfers(transfersData || [])
      setWarehouses(warehousesData.data || [])
      setStores(storesData.data || [])
      
    } catch (err) {
      console.error("Error fetching inventory data:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast.error("Failed to load inventory data")
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    fetchData()
  }, [])
  
  const handleAddInventory = async () => {
    if (!addInventoryForm.productId || addInventoryForm.quantity <= 0) {
      toast.error("Please fill in all required fields")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Check if inventory record already exists for this product
      const { data: existingInventory, error: fetchError } = await supabase
        .from("general_inventory")
        .select("*")
        .eq("product_id", parseInt(addInventoryForm.productId))
        .single()
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }
      
      if (existingInventory) {
        // Update existing inventory
        const { error } = await supabase
          .from("general_inventory")
          .update({
            quantity: existingInventory.quantity + addInventoryForm.quantity,
            available_quantity: existingInventory.available_quantity + addInventoryForm.quantity
          })
          .eq("inventory_id", existingInventory.inventory_id)
        
        if (error) throw error
      } else {
        // Create new inventory record
        const { error } = await supabase
          .from("general_inventory")
          .insert({
            product_id: parseInt(addInventoryForm.productId),
            quantity: addInventoryForm.quantity,
            reserved_quantity: 0,
            available_quantity: addInventoryForm.quantity
          })
        
        if (error) throw error
      }
      
      toast.success("Inventory added successfully!")
      setIsAddInventoryDialogOpen(false)
      setAddInventoryForm({
        productId: "",
        quantity: 1
      })
      
      // Refresh data
      await fetchData()
    } catch (error) {
      console.error("Error adding inventory:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to add inventory"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleDistributeInventory = async () => {
    if (!distributeForm.productId || 
        (distributeForm.warehouseId === "none" && distributeForm.storeId === "none") ||
        (distributeForm.warehouseId !== "none" && distributeForm.warehouseQuantity <= 0) ||
        (distributeForm.storeId !== "none" && distributeForm.storeQuantity <= 0)) {
      toast.error("Please fill in all required fields")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      console.log("Distribute form data:", distributeForm)
      
      // Get the general inventory for this product
      const { data: generalInv, error: generalInvError } = await supabase
        .from("general_inventory")
        .select("*")
        .eq("product_id", parseInt(distributeForm.productId))
        .single()
      
      if (generalInvError) {
        console.error("Error fetching general inventory:", generalInvError)
        throw generalInvError
      }
      
      if (!generalInv) {
        throw new Error("No general inventory found for this product")
      }
      
      console.log("General inventory:", generalInv)
      
      // Calculate total quantity to distribute
      const totalToDistribute = (distributeForm.warehouseQuantity || 0) + (distributeForm.storeQuantity || 0)
      
      // Check if we have enough available quantity
      if (totalToDistribute > generalInv.available_quantity) {
        throw new Error(`Not enough available inventory. Available: ${generalInv.available_quantity}, Requested: ${totalToDistribute}`)
      }
      
      // Update general inventory to reserve the quantity
      const { error: reserveError } = await supabase
        .from("general_inventory")
        .update({
          reserved_quantity: generalInv.reserved_quantity + totalToDistribute,
          available_quantity: generalInv.available_quantity - totalToDistribute
        })
        .eq("inventory_id", generalInv.inventory_id)
      
      if (reserveError) {
        console.error("Error reserving inventory:", reserveError)
        throw reserveError
      }
      
      // Distribute to warehouse if specified
      if (distributeForm.warehouseId !== "none" && distributeForm.warehouseQuantity > 0) {
        console.log("Distributing to warehouse:", distributeForm.warehouseId, "quantity:", distributeForm.warehouseQuantity)
        
        // Check if warehouse inventory record exists
        const { data: existingWarehouseInv, error: fetchWarehouseError } = await supabase
          .from("inventory")
          .select("*")
          .eq("product_id", parseInt(distributeForm.productId))
          .eq("warehouse_id", parseInt(distributeForm.warehouseId))
          .single()
        
        if (fetchWarehouseError && fetchWarehouseError.code !== 'PGRST116') {
          console.error("Error fetching warehouse inventory:", fetchWarehouseError)
          throw fetchWarehouseError
        }
        
        if (existingWarehouseInv) {
          // Update existing warehouse inventory
          const { error } = await supabase
            .from("inventory")
            .update({
              quantity: existingWarehouseInv.quantity + distributeForm.warehouseQuantity
            })
            .eq("product_id", parseInt(distributeForm.productId))
            .eq("warehouse_id", parseInt(distributeForm.warehouseId))
          
          if (error) {
            console.error("Error updating warehouse inventory:", error)
            throw error
          }
        } else {
          // Create new warehouse inventory record
          const { error } = await supabase
            .from("inventory")
            .insert({
              product_id: parseInt(distributeForm.productId),
              warehouse_id: parseInt(distributeForm.warehouseId),
              quantity: distributeForm.warehouseQuantity
            })
          
          if (error) {
            console.error("Error creating warehouse inventory:", error)
            throw error
          }
        }
      }
      
      // Distribute to store if specified
      if (distributeForm.storeId !== "none" && distributeForm.storeQuantity > 0) {
        console.log("Distributing to store:", distributeForm.storeId, "quantity:", distributeForm.storeQuantity)
        
        // Check if store inventory record exists
        const { data: existingStoreInv, error: fetchStoreError } = await supabase
          .from("store_inventory")
          .select("*")
          .eq("product_id", parseInt(distributeForm.productId))
          .eq("store_id", parseInt(distributeForm.storeId))
          .single()
        
        if (fetchStoreError && fetchStoreError.code !== 'PGRST116') {
          console.error("Error fetching store inventory:", fetchStoreError)
          throw fetchStoreError
        }
        
        if (existingStoreInv) {
          // Update existing store inventory
          const { error } = await supabase
            .from("store_inventory")
            .update({
              quantity: existingStoreInv.quantity + distributeForm.storeQuantity
            })
            .eq("product_id", parseInt(distributeForm.productId))
            .eq("store_id", parseInt(distributeForm.storeId))
          
          if (error) {
            console.error("Error updating store inventory:", error)
            throw error
          }
        } else {
          // Create new store inventory record
          const { error } = await supabase
            .from("store_inventory")
            .insert({
              product_id: parseInt(distributeForm.productId),
              store_id: parseInt(distributeForm.storeId),
              quantity: distributeForm.storeQuantity
            })
          
          if (error) {
            console.error("Error creating store inventory:", error)
            throw error
          }
        }
      }
      
      // Update general inventory to reflect the distribution
      const { error: finalUpdateError } = await supabase
        .from("general_inventory")
        .update({
          reserved_quantity: generalInv.reserved_quantity,
          quantity: generalInv.quantity - totalToDistribute
        })
        .eq("inventory_id", generalInv.inventory_id)
      
      if (finalUpdateError) {
        console.error("Error finalizing distribution:", finalUpdateError)
        throw finalUpdateError
      }
      
      toast.success("Inventory distributed successfully!")
      setIsDistributeDialogOpen(false)
      setDistributeForm({
        productId: "",
        warehouseId: "none",
        storeId: "none",
        warehouseQuantity: 0,
        storeQuantity: 0
      })
      
      // Refresh data
      await fetchData()
    } catch (error) {
      console.error("Error distributing inventory:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to distribute inventory"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleTransferInventory = async () => {
    if (!transferForm.productId || !transferForm.fromWarehouseId || !transferForm.toStoreId || transferForm.quantity <= 0) {
      toast.error("Please fill in all required fields")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      console.log("Transfer form data:", transferForm)
      
      // Parse the form values to ensure they're numbers
      const productId = parseInt(transferForm.productId)
      const fromWarehouseId = parseInt(transferForm.fromWarehouseId)
      const toStoreId = parseInt(transferForm.toStoreId)
      const quantity = parseInt(transferForm.quantity.toString())
      
      console.log("Parsed transfer data:", { productId, fromWarehouseId, toStoreId, quantity })
      
      // Validate the parsed values
      if (isNaN(productId) || isNaN(fromWarehouseId) || isNaN(toStoreId) || isNaN(quantity)) {
        throw new Error("Invalid input values. Please check your selections.")
      }
      
      // Check if the warehouse has enough inventory
      const { data: warehouseInv, error: warehouseError } = await supabase
        .from("inventory")
        .select("*")
        .eq("product_id", productId)
        .eq("warehouse_id", fromWarehouseId)
        .single()
      
      if (warehouseError) {
        console.error("Error fetching warehouse inventory:", warehouseError)
        throw warehouseError
      }
      
      if (!warehouseInv) {
        throw new Error("No inventory found for this product in the selected warehouse")
      }
      
      if (warehouseInv.quantity < quantity) {
        throw new Error(`Not enough inventory in warehouse. Available: ${warehouseInv.quantity}, Requested: ${quantity}`)
      }
      
      // Use the RPC function to create the transfer
      const { data: transferResult, error: transferError } = await supabase.rpc('create_inventory_transfer', {
        p_product_id: productId,
        p_from_warehouse_id: fromWarehouseId,
        p_to_store_id: toStoreId,
        p_quantity: quantity
      }) as { data: TransferResult | null, error: any }
      
      if (transferError) {
        console.error("Error creating transfer:", transferError)
        throw transferError
      }
      
      console.log("Transfer result:", transferResult)
      
      // Check if the transfer was successful
      if (transferResult && transferResult.success) {
        toast.success(`Transfer completed successfully! Transfer ID: ${transferResult.transfer_id}`)
      } else {
        throw new Error(transferResult?.message || "Failed to create transfer")
      }
      
      setIsTransferDialogOpen(false)
      setTransferForm({
        productId: "",
        fromWarehouseId: "",
        toStoreId: "",
        quantity: 1
      })
      
      // Refresh data
      await fetchData()
    } catch (error) {
      console.error("Error creating transfer:", error)
      let errorMessage = "Failed to create transfer"
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as any).message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract a meaningful error message from the error object
        try {
          errorMessage = JSON.stringify(error)
        } catch (e) {
          errorMessage = "Unknown error occurred"
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const getStockStatus = (quantity: number, type: 'general' | 'distributed' = 'general') => {
    if (quantity === 0) return { text: "Out of Stock", variant: "destructive" as const }
    if (type === 'general' && quantity < 10) return { text: "Low Stock", variant: "warning" as const }
    if (type === 'distributed' && quantity < 5) return { text: "Low Stock", variant: "warning" as const }
    return { text: "In Stock", variant: "success" as const }
  }
  
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
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }
  
  // Calculate statistics
  const inventoryStats = {
    totalProducts: products.length,
    totalItems: generalInventory.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: generalInventory.reduce((sum, item) => {
      const product = products.find(p => p.product_id === item.product_id)
      return sum + (item.quantity * (product?.base_price || 0))
    }, 0),
    distributedItems: generalInventory.reduce((sum, item) => {
      const distribution = inventoryDistribution.find(d => d.product_id === item.product_id)
      return sum + (distribution?.distributed_quantity || 0)
    }, 0),
    remainingItems: generalInventory.reduce((sum, item) => {
      const distribution = inventoryDistribution.find(d => d.product_id === item.product_id)
      return sum + (distribution?.remaining_quantity || 0)
    }, 0),
    lowStockItems: generalInventory.filter(item => item.available_quantity < 10).length,
    outOfStockItems: generalInventory.filter(item => item.available_quantity === 0).length,
    totalWarehouses: warehouses.length,
    totalStores: stores.length
  }
  
  // Get unique categories
  const categories = [...new Set(products.map(product => product.categories?.[0]?.name || "Uncategorized"))].sort()
  
  // Filter inventory distribution
  const filteredDistribution = inventoryDistribution
    .filter(item => {
      const matchesSearch = searchTerm === "" || 
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      
      const product = products.find(p => p.product_id === item.product_id)
      const productCategory = product?.categories?.[0]?.name || "Uncategorized"
      const matchesCategory = selectedCategory === "all" || productCategory === selectedCategory
      
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => b.total_quantity - a.total_quantity)
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <Button disabled>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">Failed to load inventory data. Please try again.</p>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your inventory distribution across warehouses and stores
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddInventoryDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Inventory
          </Button>
          <Button onClick={() => setIsDistributeDialogOpen(true)} variant="outline" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Distribute Inventory
          </Button>
          <Button onClick={() => setIsTransferDialogOpen(true)} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Transfer Stock
          </Button>
          <Button onClick={fetchData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(inventoryStats.totalValue)} value</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distributed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.distributedItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((inventoryStats.distributedItems / inventoryStats.totalItems) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inventoryStats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">{inventoryStats.outOfStockItems} out of stock</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General Inventory</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>
        
        {/* General Inventory Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Total Quantity</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generalInventory.map((item) => {
                    const product = products.find(p => p.product_id === item.product_id)
                    return (
                      <TableRow key={item.inventory_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product?.name || "Unknown Product"}</div>
                            <div className="text-sm text-muted-foreground">ID: #{item.product_id}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{product?.sku || "N/A"}</TableCell>
                        <TableCell className="font-medium">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{item.reserved_quantity.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{item.available_quantity.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStockStatus(item.available_quantity).variant}>
                            {getStockStatus(item.available_quantity).text}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Inventory Distribution</CardTitle>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Total Quantity</TableHead>
                    <TableHead>Distributed</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Distribution</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistribution.map((item) => {
                    const product = products.find(p => p.product_id === item.product_id)
                    const distributionPercentage = item.total_quantity > 0 
                      ? Math.round((item.distributed_quantity / item.total_quantity) * 100) 
                      : 0
                    
                    return (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-muted-foreground">ID: #{item.product_id}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.total_quantity.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{item.distributed_quantity.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{item.remaining_quantity.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={distributionPercentage} className="h-2 w-20" />
                            <span className="text-sm">{distributionPercentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStockStatus(item.remaining_quantity).variant}>
                            {getStockStatus(item.remaining_quantity).text}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Warehouses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  Warehouses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {warehouses.map((warehouse) => {
                    // Use a different variable name to avoid conflict
                    const warehouseInvItems = warehouseInventory.filter(
                      item => item.warehouse_id === warehouse.warehouse_id
                    )
                    
                    const totalItems = warehouseInvItems.reduce(
                      (sum, item) => sum + item.quantity, 0
                    )
                    
                    return (
                      <div key={warehouse.warehouse_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{warehouse.name}</h3>
                            <p className="text-sm text-muted-foreground">{warehouse.location}</p>
                          </div>
                          <Badge variant="outline">
                            {warehouseInvItems.length} products
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold mb-2">
                          {totalItems.toLocaleString()} items
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {warehouseInvItems
                            .sort((a, b) => b.quantity - a.quantity)
                            .slice(0, 5)
                            .map((item) => {
                              const product = products.find(p => p.product_id === item.product_id)
                              return (
                                <div key={`${item.product_id}-${item.warehouse_id}`} className="flex justify-between text-sm">
                                  <span className="truncate max-w-[70%]">{product?.name || "Unknown Product"}</span>
                                  <span className="font-medium">{item.quantity.toLocaleString()}</span>
                                </div>
                              )
                            })}
                        </div>
                        {warehouseInvItems.length > 5 && (
                          <div className="text-xs text-muted-foreground">
                            +{warehouseInvItems.length - 5} more products
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Stores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Stores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stores.map((store) => {
                    // Use a different variable name to avoid conflict
                    const storeInvItems = storeInventory.filter(
                      item => item.store_id === store.store_id
                    )
                    
                    const totalItems = storeInvItems.reduce(
                      (sum, item) => sum + item.quantity, 0
                    )
                    
                    return (
                      <div key={store.store_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{store.name}</h3>
                            <p className="text-sm text-muted-foreground">{store.location}</p>
                          </div>
                          <Badge variant="outline">
                            {storeInvItems.length} products
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold mb-2">
                          {totalItems.toLocaleString()} items
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {storeInvItems
                            .sort((a, b) => b.quantity - a.quantity)
                            .slice(0, 5)
                            .map((item) => {
                              const product = products.find(p => p.product_id === item.product_id)
                              return (
                                <div key={`${item.product_id}-${item.store_id}`} className="flex justify-between text-sm">
                                  <span className="truncate max-w-[70%]">{product?.name || "Unknown Product"}</span>
                                  <span className="font-medium">{item.quantity.toLocaleString()}</span>
                                </div>
                              )
                            })}
                        </div>
                        {storeInvItems.length > 5 && (
                          <div className="text-xs text-muted-foreground">
                            +{storeInvItems.length - 5} more products
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>From Warehouse</TableHead>
                    <TableHead>To Store</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => {
                    const product = products.find(p => p.product_id === transfer.product_id)
                    const warehouse = warehouses.find(w => w.warehouse_id === transfer.from_warehouse_id)
                    const store = stores.find(s => s.store_id === transfer.to_store_id)
                    
                    return (
                      <TableRow key={transfer.transfer_id}>
                        <TableCell className="font-medium">#{transfer.transfer_id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product?.name || "Unknown Product"}</div>
                            <div className="text-sm text-muted-foreground">{product?.sku || "N/A"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{warehouse?.name || "Unknown"}</div>
                            <div className="text-sm text-muted-foreground">{warehouse?.location || "N/A"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{store?.name || "Unknown"}</div>
                            <div className="text-sm text-muted-foreground">{store?.location || "N/A"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{transfer.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{formatDate(transfer.transfer_date)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add Inventory Dialog */}
      <Dialog open={isAddInventoryDialogOpen} onOpenChange={setIsAddInventoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Inventory</DialogTitle>
            <DialogDescription>
              Add inventory to the general inventory pool
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={addInventoryForm.productId}
                onValueChange={(value) => setAddInventoryForm({...addInventoryForm, productId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.product_id} value={product.product_id.toString()}>
                      {product.name} - {product.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={addInventoryForm.quantity}
                onChange={(e) => setAddInventoryForm({...addInventoryForm, quantity: parseInt(e.target.value) || 1})}
                min="1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddInventoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddInventory} 
              disabled={isSubmitting || !addInventoryForm.productId || addInventoryForm.quantity <= 0}
            >
              {isSubmitting ? "Adding..." : "Add Inventory"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Distribute Inventory Dialog */}
      <Dialog open={isDistributeDialogOpen} onOpenChange={setIsDistributeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Distribute Inventory</DialogTitle>
            <DialogDescription>
              Distribute inventory from general inventory to warehouses and stores
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={distributeForm.productId}
                onValueChange={(value) => setDistributeForm({...distributeForm, productId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {generalInventory
                    .filter(item => item.available_quantity > 0)
                    .map((item) => {
                      const product = products.find(p => p.product_id === item.product_id)
                      return (
                        <SelectItem key={item.product_id} value={item.product_id.toString()}>
                          {product?.name || "Unknown Product"} - Available: {item.available_quantity}
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse">To Warehouse</Label>
                <Select
                  value={distributeForm.warehouseId}
                  onValueChange={(value) => setDistributeForm({...distributeForm, warehouseId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id.toString()}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="store">To Store</Label>
                <Select
                  value={distributeForm.storeId}
                  onValueChange={(value) => setDistributeForm({...distributeForm, storeId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.store_id} value={store.store_id.toString()}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouseQuantity">Warehouse Quantity</Label>
                <Input
                  id="warehouseQuantity"
                  type="number"
                  value={distributeForm.warehouseQuantity}
                  onChange={(e) => setDistributeForm({...distributeForm, warehouseQuantity: parseInt(e.target.value) || 0})}
                  min="0"
                  disabled={distributeForm.warehouseId === "none"}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="storeQuantity">Store Quantity</Label>
                <Input
                  id="storeQuantity"
                  type="number"
                  value={distributeForm.storeQuantity}
                  onChange={(e) => setDistributeForm({...distributeForm, storeQuantity: parseInt(e.target.value) || 0})}
                  min="0"
                  disabled={distributeForm.storeId === "none"}
                />
              </div>
            </div>
            
            {distributeForm.productId && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">Available Stock</div>
                <div className="text-sm text-muted-foreground">
                  {generalInventory.find(item => item.product_id.toString() === distributeForm.productId)?.available_quantity || 0} units available
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDistributeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDistributeInventory} 
              disabled={isSubmitting || !distributeForm.productId || 
                (distributeForm.warehouseId === "none" && distributeForm.storeId === "none") ||
                (distributeForm.warehouseId !== "none" && distributeForm.warehouseQuantity <= 0) ||
                (distributeForm.storeId !== "none" && distributeForm.storeQuantity <= 0)}
            >
              {isSubmitting ? "Distributing..." : "Distribute Inventory"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Transfer Inventory Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Inventory</DialogTitle>
            <DialogDescription>
              Transfer inventory from a warehouse to a store
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={transferForm.productId}
                onValueChange={(value) => setTransferForm({...transferForm, productId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseInventory
                    .filter(item => item.quantity > 0)
                    .map((item) => {
                      const product = products.find(p => p.product_id === item.product_id)
                      const warehouse = warehouses.find(w => w.warehouse_id === item.warehouse_id)
                      return (
                        <SelectItem key={`${item.product_id}-${item.warehouse_id}`} value={item.product_id.toString()}>
                          {product?.name || "Unknown Product"} - {warehouse?.name || "Unknown"} (Stock: {item.quantity})
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fromWarehouse">From Warehouse *</Label>
              <Select
                value={transferForm.fromWarehouseId}
                onValueChange={(value) => setTransferForm({...transferForm, fromWarehouseId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="toStore">To Store *</Label>
              <Select
                value={transferForm.toStoreId}
                onValueChange={(value) => setTransferForm({...transferForm, toStoreId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.store_id} value={store.store_id.toString()}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({...transferForm, quantity: parseInt(e.target.value) || 1})}
                min="1"
              />
            </div>
            
            {transferForm.productId && transferForm.fromWarehouseId && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">Available Stock</div>
                <div className="text-sm text-muted-foreground">
                  {warehouseInventory.find(item => 
                    item.product_id.toString() === transferForm.productId && 
                    item.warehouse_id.toString() === transferForm.fromWarehouseId
                  )?.quantity || 0} units available
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransferInventory} 
              disabled={isSubmitting || !transferForm.productId || !transferForm.fromWarehouseId || !transferForm.toStoreId || transferForm.quantity <= 0}
            >
              {isSubmitting ? "Creating..." : "Create Transfer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}