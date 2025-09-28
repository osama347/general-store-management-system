"use client"
import { useState, useEffect, useMemo } from "react"
import type React from "react"
import { createClient } from "@/lib/supabase/client"
// @ts-ignore
import type { Product, Category } from "@/types/product"
import { useLocation } from "@/contexts/LocationContext"
import { toast } from "sonner"
import {useAuth} from '@/hooks/use-auth'
import type { Profile } from "@/hooks/use-auth"

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Icons
import { 
  Plus, Search, Edit, Trash2, Package, ChevronLeft, ChevronRight
} from "lucide-react"


export default function ProductsPage() {
  
const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()
  const { currentLocation } = useLocation()
  
  
  useEffect(() => {
    async function fetchData() {
      if (!currentLocation) {
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        // Fetch categories
        const { data: categoriesData } = await supabase
          .from("categories")
          .select(`
            category_id,
            name,
            description,
            attributes (
              attribute_id,
              attribute_name,
              data_type
            )
          `)
          .order("name")
        const categories =
          categoriesData?.map((c) => ({
            category_id: c.category_id,
            name: c.name,
            description: c.description,
            attributes: c.attributes || [],
          })) || []
        setCategories(categories)
        
        // Fetch products with inventory for the current location
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            product_id,
            name,
            base_price,
            category_id,
            categories!inner ( name ),
            product_attributes (
              attribute_id,
              value_text,
              value_number,
              value_decimal,
              value_date,
              attributes!inner (
                attribute_name,
                data_type
              )
            ),
            inventory (
              quantity,
              location_id
            )
          `)
          .order("product_id", { ascending: false })
          
        if (productsError) {
          throw new Error(productsError.message)
        }
        
        const products =
          productsData?.map((product: any) => ({
            id: product.product_id.toString(),
            name: product.name,
            price: product.base_price,
            stock_qty: Array.isArray(product.inventory)
              ? product.inventory
                  .filter((inv: any) => inv.location_id === currentLocation.location_id)
                  .reduce((total: number, inv: any) => total + (inv.quantity || 0), 0)
              : 0,
            category: product.categories?.name || "Uncategorized",
            category_id: product.category_id,
            attributes: Array.isArray(product.product_attributes)
              ? product.product_attributes.map((pa: any) => ({
                  name: pa.attributes?.attribute_name || "Unknown",
                  value:
                    pa.value_text ??
                    pa.value_number?.toString() ??
                    pa.value_decimal?.toString() ??
                    pa.value_date?.toString() ??
                    "",
                  type: pa.attributes?.data_type || "text",
                }))
              : [],
          })) || []
        setProducts(products)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [currentLocation])
  
  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products
    
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.attributes.some((attr: any) => 
        attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attr.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [products, searchTerm])
  
  // Function to add a product
  const addProduct = async (product: Omit<Product, "id">) => {
    try {
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          name: product.name,
          base_price: product.price,
          category_id: product.category_id,
        })
        .select()
        .single()
      if (productError) {
        throw new Error(productError.message)
      }
      
      // Add inventory entry for the current location
      if (currentLocation) {
        const { error: inventoryError } = await supabase
          .from("inventory")
          .insert({
            product_id: newProduct.product_id,
            location_id: currentLocation.location_id,
            quantity: product.stock_qty,
          })
          
        if (inventoryError) {
          console.error("Error adding inventory:", inventoryError)
          throw new Error(inventoryError.message)
        }
      }
      
      if (product.attributes.length > 0) {
        const { data: attributesData, error: attributesError } = await supabase
          .from("attributes")
          .select("attribute_id, attribute_name")
          .eq("category_id", product.category_id)
        if (attributesError) {
          console.error("Error fetching attributes:", attributesError)
          throw new Error(attributesError.message)
        }
        const attributeMap: Record<string, number> = {}
        attributesData?.forEach((attr) => {
          attributeMap[attr.attribute_name] = attr.attribute_id
        })
        const productAttributesToInsert = product.attributes
          .map((attr:any) => {
            const attributeId = attributeMap[attr.name]
            if (!attributeId) {
              console.error(`Attribute ${attr.name} not found for category ${product.category_id}`)
              return null
            }
            const baseInsert = {
              product_id: newProduct.product_id,
              attribute_id: attributeId,
            }
            switch (attr.type) {
              case "number":
                return { ...baseInsert, value_number: Number(attr.value) || null }
              case "decimal":
                return { ...baseInsert, value_decimal: Number(attr.value) || null }
              case "date":
                return { ...baseInsert, value_date: attr.value || null }
              default:
                return { ...baseInsert, value_text: attr.value || null }
            }
          })
          .filter(Boolean)
        if (productAttributesToInsert.length > 0) {
          const { error: insertError } = await supabase.from("product_attributes").insert(productAttributesToInsert)
          if (insertError) {
            console.error("Error adding product attributes:", insertError)
            throw new Error(insertError.message)
          }
        }
      }
      
      // Refresh products list
      fetchData()
      toast.success("Product added successfully")
    } catch (error) {
      console.error("Error adding product:", error)
      toast.error("Failed to add product")
      throw error
    }
  }
  
  // Function to update a product
  const updateProduct = async (productId: string, product: Omit<Product, "id">) => {
    try {
      const { error: productError } = await supabase
        .from("products")
        .update({
          name: product.name,
          base_price: product.price,
          category_id: product.category_id,
        })
        .eq("product_id", Number.parseInt(productId))
      if (productError) {
        throw new Error(productError.message)
      }
      
      // Update inventory for the current location
      if (currentLocation) {
        const { error: inventoryError } = await supabase
          .from("inventory")
          .upsert({
            product_id: Number.parseInt(productId),
            location_id: currentLocation.location_id,
            quantity: product.stock_qty,
          })
          
        if (inventoryError) {
          console.error("Error updating inventory:", inventoryError)
          throw new Error(inventoryError.message)
        }
      }
      
      await supabase.from("product_attributes").delete().eq("product_id", Number.parseInt(productId))
      if (product.attributes.length > 0) {
        const { data: attributesData, error: attributesError } = await supabase
          .from("attributes")
          .select("attribute_id, attribute_name")
          .eq("category_id", product.category_id)
        if (attributesError) {
          console.error("Error fetching attributes:", attributesError)
          throw new Error(attributesError.message)
        }
        const attributeMap: Record<string, number> = {}
        attributesData?.forEach((attr) => {
          attributeMap[attr.attribute_name] = attr.attribute_id
        })
        const productAttributesToInsert = product.attributes
          .map((attr :any ) => {
            const attributeId = attributeMap[attr.name]
            if (!attributeId) {
              console.error(`Attribute ${attr.name} not found for category ${product.category_id}`)
              return null
            }
            const baseInsert = {
              product_id: Number.parseInt(productId),
              attribute_id: attributeId,
            }
            switch (attr.type) {
              case "number":
                return { ...baseInsert, value_number: Number(attr.value) || null }
              case "decimal":
                return { ...baseInsert, value_decimal: Number(attr.value) || null }
              case "date":
                return { ...baseInsert, value_date: attr.value || null }
              default:
                return { ...baseInsert, value_text: attr.value || null }
            }
          })
          .filter(Boolean)
        if (productAttributesToInsert.length > 0) {
          const { error: insertError } = await supabase.from("product_attributes").insert(productAttributesToInsert)
          if (insertError) {
            console.error("Error updating product attributes:", insertError)
            throw new Error(insertError.message)
          }
        }
      }
      
      // Refresh products list
      fetchData()
      toast.success("Product updated successfully")
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Failed to update product")
      throw error
    }
  }
  
  const fetchData = async () => {
    if (!currentLocation) return
    
    setIsLoading(true)
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          product_id,
          name,
          base_price,
          category_id,
          categories!inner ( name ),
          product_attributes (
            attribute_id,
            value_text,
            value_number,
            value_decimal,
            value_date,
            attributes!inner (
              attribute_name,
              data_type
            )
          ),
          inventory (
            quantity,
            location_id
          )
        `)
        .order("product_id", { ascending: false })
        
      if (productsError) throw new Error(productsError.message)
      
      const products =
        productsData?.map((product: any) => ({
          id: product.product_id.toString(),
          name: product.name,
          price: product.base_price,
          stock_qty: Array.isArray(product.inventory)
            ? product.inventory
                .filter((inv: any) => inv.location_id === currentLocation.location_id)
                .reduce((total: number, inv: any) => total + (inv.quantity || 0), 0)
            : 0,
          category: product.categories?.name || "Uncategorized",
          category_id: product.category_id,
          attributes: Array.isArray(product.product_attributes)
            ? product.product_attributes.map((pa: any) => ({
                name: pa.attributes?.attribute_name || "Unknown",
                value:
                  pa.value_text ??
                  pa.value_number?.toString() ??
                  pa.value_decimal?.toString() ??
                  pa.value_date?.toString() ??
                  "",
                type: pa.attributes?.data_type || "text",
              }))
            : [],
        })) || []
      setProducts(products)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Content Card */}
        <Card className="w-full shadow-sm border-0 md:border">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products
                </CardTitle>
                <CardDescription>
                  Manage all products and their information
                </CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    {profile?.role === 'admin' ? (
                      <Button className="bg-gray-900 hover:bg-gray-800 text-white whitespace-nowrap">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    ) : null}
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription>
                        Create a new product with all necessary details
                      </DialogDescription>
                    </DialogHeader>
                    <ProductForm 
                      categories={categories} 
                      onSubmit={addProduct} 
                      isLoading={isLoading}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          
          <Separator className="mb-6" />
          
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <div className="rounded-md border">
                  <div className="border-b p-4">
                    <div className="grid grid-cols-6 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 w-full" />
                      ))}
                    </div>
                  </div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border-b p-4">
                      <div className="grid grid-cols-6 gap-4">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <Skeleton key={j} className="h-4 w-full" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {searchTerm ? "No products found" : "No products yet"}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? "Try adjusting your search or filters" 
                    : "Get started by adding your first product"
                  }
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription>
                        Create a new product with all necessary details
                      </DialogDescription>
                    </DialogHeader>
                    <ProductForm 
                      categories={categories} 
                      onSubmit={addProduct} 
                      isLoading={isLoading}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <ProductTable 
                products={filteredProducts} 
                categories={categories}
                updateProduct={updateProduct}
                profile={profile}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Product Table Component
interface ProductTableProps {
  products: Product[]
  categories: Category[]
  updateProduct: (productId: string, product: Omit<Product, "id">) => Promise<void>
  profile?: Profile | null
}

function ProductTable({ products, categories, updateProduct , profile }: ProductTableProps) {
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const filteredAndSortedProducts = useMemo(() => {
    let productsCopy = [...products]
    
    if (sortConfig) {
      productsCopy.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Product]
        let bValue: any = b[sortConfig.key as keyof Product]
        
        if (sortConfig.key === 'price' || sortConfig.key === 'stock_qty') {
          aValue = Number(aValue)
          bValue = Number(bValue)
        } else {
          aValue = String(aValue).toLowerCase()
          bValue = String(bValue).toLowerCase()
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return productsCopy
  }, [products, sortConfig])
  
  const totalPages = Math.ceil(filteredAndSortedProducts.length / pageSize)
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }
  
  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { text: "Out of Stock", variant: "destructive" as const }
    if (quantity < 10) return { text: "Low Stock", variant: "secondary" as const }
    return { text: "In Stock", variant: "default" as const }
  }
  
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null
      }
      return { key, direction: 'asc' }
    })
  }
  
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsEditDialogOpen(true)
  }
  
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
      
      if (startPage > 1) {
        pageNumbers.push(1)
        if (startPage > 2) {
          pageNumbers.push("...")
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pageNumbers.push("...")
        }
        pageNumbers.push(totalPages)
      }
    }
    
    return pageNumbers
  }
  
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Product</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Price</TableHead>
              <TableHead className="font-semibold">Stock</TableHead>
              <TableHead className="font-semibold">Attributes</TableHead>
              {profile?.role === "admin" && (
  <TableHead className="font-semibold text-right">Actions</TableHead>
)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock_qty)
              return (
                <TableRow key={product.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={stockStatus.variant} className="text-xs">
                      {stockStatus.text}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(product.price)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{product.stock_qty}</span>
                  </TableCell>
                  <TableCell>
                    {product.attributes.length > 0 ? (
                      <div className="flex flex-wrap gap-1 items-center">
                        {product.attributes.slice(0, 2).map((attr:any, i:any) => (
                          <TooltipProvider key={i} delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Badge variant="outline" className="text-xs cursor-pointer">
                                    {attr.name}
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="flex flex-col text-xs">
                                  <span>Value: {attr.value}</span>
                                  <span>Type: {attr.type}</span>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                        {product.attributes.length > 2 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <span>
                                <Badge variant="outline" className="text-xs cursor-pointer bg-muted text-muted-foreground">
                                  +{product.attributes.length - 2} more
                                </Badge>
                              </span>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 max-h-60 overflow-y-auto">
                              <div className="font-semibold mb-2 text-sm">
                                Product Attributes
                              </div>
                              <div className="space-y-2">
                                {product.attributes.map((attr:any, i:any) => (
                                  <div
                                    key={i}
                                    className="border-b pb-2 last:border-b-0 last:pb-0"
                                  >
                                    <div className="font-medium text-sm">
                                      {attr.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Value: {attr.value}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Type: {attr.type}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground bg-muted"
                      >
                        None
                      </Badge>
                    )}
                  </TableCell>
                  {profile?.role === "admin" && (
  <TableCell className="text-right">
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleEditProduct(product)}
        className="h-8 w-8 p-0"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </TableCell>
)}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {products.length > 0 && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * pageSize + 1, products.length)} to{" "}
            {Math.min(currentPage * pageSize, products.length)} of{" "}
            {products.length} products
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers().map((page, index) => (
              <Button
                key={index}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => typeof page === "number" && setCurrentPage(page)}
                disabled={page === "..."}
                className="h-8 w-8 p-0"
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-3"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 px-3"
            >
              Last
            </Button>
          </div>
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product's information.
            </DialogDescription>
          </DialogHeader>
          <ProductForm 
            categories={categories} 
            product={editingProduct}
            onSubmit={(product) => updateProduct(editingProduct!.id, product)} 
            isLoading={false}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

// Product Form Component
interface ProductFormProps {
  categories: Category[]
  product?: Product | null
  onSubmit: (product: Omit<Product, "id">) => Promise<void>
  isLoading: boolean
}

function ProductForm({ categories, product, onSubmit, isLoading }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: product?.name || "",
    price: product?.price || 0,
    stock_qty: product?.stock_qty || 0,
    category_id: product?.category_id || categories[0]?.category_id || 0,
    attributes: product?.attributes || [],
  })
  
  const handleCategoryChange = (categoryId: number) => {
    const selectedCategory = categories.find((c) => c.category_id === categoryId)
    if (selectedCategory) {
      const newAttributes = selectedCategory.attributes.map((attr:any) => ({
        name: attr.attribute_name,
        value: "",
        type: attr.data_type,
      }))
      setFormData((prev) => ({
        ...prev,
        category_id: categoryId,
        attributes: newAttributes,
      }))
    }
  }
  
  const handleAttributeChange = (index: number, value: string) => {
    setFormData((prev) => {
      const updatedAttributes = [...prev.attributes]
      updatedAttributes[index] = { ...updatedAttributes[index], value }
      return {
        ...prev,
        attributes: updatedAttributes,
      }
    })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category_id) {
      toast.error("Please fill in all required fields")
      return
    }
    
    setIsSubmitting(true)
    try {
      const selectedCategory = categories.find((c) => c.category_id === formData.category_id)
      await onSubmit({
        name: formData.name,
        price: formData.price,
        stock_qty: formData.stock_qty,
        category: selectedCategory?.name || "",
        category_id: formData.category_id,
        attributes: formData.attributes,
      })
    } catch (error) {
      console.error("Error submitting product:", error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                required
                className="w-full"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category" className="text-sm font-medium">Category *</Label>
              <Select
                value={formData.category_id.toString()}
                onValueChange={(value) => handleCategoryChange(Number.parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.category_id} value={category.category_id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="price" className="text-sm font-medium">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
                required
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="inventory" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="stock" className="text-sm font-medium">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock_qty}
                onChange={(e) =>
                  setFormData({ ...formData, stock_qty: Number.parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="attributes" className="space-y-4 pt-4">
          <div className="space-y-4">
            {formData.attributes.length > 0 ? (
              formData.attributes.map((attr:any, index:any) => (
                <div key={index} className="grid gap-2">
                  <Label className="text-sm font-medium">{attr.name}</Label>
                  <div className="text-xs text-muted-foreground mb-1">Type: {attr.type}</div>
                  <Input
                    value={attr.value}
                    onChange={(e) => handleAttributeChange(index, e.target.value)}
                    placeholder={`Enter ${attr.name.toLowerCase()}`}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No attributes available for this category
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <DialogFooter className="pt-4 border-t">
        <Button 
          type="submit" 
          disabled={isSubmitting || !formData.name}
          className="min-w-[120px]"
        >
          {isSubmitting ? "Saving..." : product ? "Update Product" : "Add Product"}
        </Button>
      </DialogFooter>
    </form>
  )
}