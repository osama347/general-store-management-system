"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Product, Category, ProductAttribute } from "@/types/product"
// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// Icons
import { Plus, Search, Filter, ArrowUpDown, Package, X, Edit, FolderOpen } from "lucide-react"
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("products")
  const supabase = createClient()
  
  // Fetch data when the component mounts
  useEffect(() => {
    async function fetchData() {
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
        
        const categories = categoriesData?.map((c) => ({
          category_id: c.category_id,
          name: c.name,
          description: c.description,
          attributes: c.attributes || []
        })) || []
        setCategories(categories)
        
        // Fetch products
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
            )
          `)
          .order("product_id", { ascending: false })
        
        if (productsError) {
          throw new Error(productsError.message)
        }
        
        const products = productsData?.map((product: any) => ({
          id: product.product_id.toString(),
          name: product.name,
          price: product.base_price,
          stock_qty: 0, // TODO: join inventory later
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
        toast("Failed to load data",{
          description: "Please try again later.",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])
  
  // Function to add a product
  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      // Insert the product
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          name: product.name,
          base_price: product.price,
          category_id: product.category_id
        })
        .select()
        .single()
      if (productError) {
        throw new Error(productError.message)
      }
      // Insert product attributes
      if (product.attributes.length > 0) {
        // First, we need to get the attribute IDs for the category
        const { data: attributesData, error: attributesError } = await supabase
          .from("attributes")
          .select("attribute_id, attribute_name")
          .eq("category_id", product.category_id)
        
        if (attributesError) {
          console.error("Error fetching attributes:", attributesError)
          throw new Error(attributesError.message)
        }
        
        // Create a mapping from attribute name to ID
        const attributeMap: Record<string, number> = {}
        attributesData?.forEach(attr => {
          attributeMap[attr.attribute_name] = attr.attribute_id
        })
        
        // Prepare the product attributes for insertion
        const productAttributesToInsert = product.attributes.map(attr => {
          const attributeId = attributeMap[attr.name]
          if (!attributeId) {
            console.error(`Attribute ${attr.name} not found for category ${product.category_id}`)
            return null
          }
          
          const baseInsert = {
            product_id: newProduct.product_id,
            attribute_id: attributeId
          }
          // Add the appropriate value field based on the data type
          switch (attr.type) {
            case "number":
              return { ...baseInsert, value_number: Number(attr.value) || null }
            case "decimal":
              return { ...baseInsert, value_decimal: Number(attr.value) || null }
            case "date":
              return { ...baseInsert, value_date: attr.value || null }
            default: // text
              return { ...baseInsert, value_text: attr.value || null }
          }
        }).filter(Boolean) // Remove any null entries
        
        if (productAttributesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("product_attributes")
            .insert(productAttributesToInsert)
          
          if (insertError) {
            console.error("Error adding product attributes:", insertError)
            throw new Error(insertError.message)
          }
        }
      }
      // Refresh the products list
      const { data: updatedProductsData, error: updatedProductsError } = await supabase
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
          )
        `)
        .order("product_id", { ascending: false })
      
      if (updatedProductsError) {
        throw new Error(updatedProductsError.message)
      }
      
      const updatedProducts = updatedProductsData?.map((product: any) => ({
        id: product.product_id.toString(),
        name: product.name,
        price: product.base_price,
        stock_qty: 0,
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
      
      setProducts(updatedProducts)
      toast("Product added successfully",{
        description: `${product.name} has been added to your inventory.`,
      })
    } catch (error) {
      console.error("Error adding product:", error)
      toast( "Failed to add product",{
        description: "Please try again later.",
      })
      throw error
    }
  }

  // Function to update a product
  const updateProduct = async (productId: string, product: Omit<Product, 'id'>) => {
    try {
      // Update the product
      const { error: productError } = await supabase
        .from("products")
        .update({
          name: product.name,
          base_price: product.price,
          category_id: product.category_id
        })
        .eq("product_id", parseInt(productId))
      
      if (productError) {
        throw new Error(productError.message)
      }
      
      // Delete existing product attributes
      await supabase
        .from("product_attributes")
        .delete()
        .eq("product_id", parseInt(productId))
      
      // Insert updated product attributes
      if (product.attributes.length > 0) {
        // First, we need to get the attribute IDs for the category
        const { data: attributesData, error: attributesError } = await supabase
          .from("attributes")
          .select("attribute_id, attribute_name")
          .eq("category_id", product.category_id)
        
        if (attributesError) {
          console.error("Error fetching attributes:", attributesError)
          throw new Error(attributesError.message)
        }
        
        // Create a mapping from attribute name to ID
        const attributeMap: Record<string, number> = {}
        attributesData?.forEach(attr => {
          attributeMap[attr.attribute_name] = attr.attribute_id
        })
        
        // Prepare the product attributes for insertion
        const productAttributesToInsert = product.attributes.map(attr => {
          const attributeId = attributeMap[attr.name]
          if (!attributeId) {
            console.error(`Attribute ${attr.name} not found for category ${product.category_id}`)
            return null
          }
          
          const baseInsert = {
            product_id: parseInt(productId),
            attribute_id: attributeId
          }
          // Add the appropriate value field based on the data type
          switch (attr.type) {
            case "number":
              return { ...baseInsert, value_number: Number(attr.value) || null }
            case "decimal":
              return { ...baseInsert, value_decimal: Number(attr.value) || null }
            case "date":
              return { ...baseInsert, value_date: attr.value || null }
            default: // text
              return { ...baseInsert, value_text: attr.value || null }
          }
        }).filter(Boolean) // Remove any null entries
        
        if (productAttributesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("product_attributes")
            .insert(productAttributesToInsert)
          
          if (insertError) {
            console.error("Error updating product attributes:", insertError)
            throw new Error(insertError.message)
          }
        }
      }
      
      // Refresh the products list
      const { data: updatedProductsData, error: updatedProductsError } = await supabase
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
          )
        `)
        .order("product_id", { ascending: false })
      
      if (updatedProductsError) {
        throw new Error(updatedProductsError.message)
      }
      
      const updatedProducts = updatedProductsData?.map((product: any) => ({
        id: product.product_id.toString(),
        name: product.name,
        price: product.base_price,
        stock_qty: 0,
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
      
      setProducts(updatedProducts)
      toast("Product updated successfully",{
        description: `${product.name} has been updated.`,
      })
    } catch (error) {
      console.error("Error updating product:", error)
      toast("Failed to update product",{
        description: "Please try again later.",
      })
      throw error
    }
  }
  
  // Function to add a category
  const addCategory = async (category: Omit<Category, 'category_id'>) => {
    try {
      const supabase = createClient()
      
      // Insert category
      const { data: newCategory, error: categoryError } = await supabase
        .from("categories")
        .insert({
          name: category.name,
          description: category.description
        })
        .select()
        .single()
      
      if (categoryError) {
        throw new Error(`Failed to create category: ${categoryError.message}`)
      }
      
      // Insert attributes for the category
      if (category.attributes.length > 0) {
        const attributesToInsert = category.attributes.map(attr => ({
          category_id: newCategory.category_id,
          attribute_name: attr.attribute_name,
          data_type: attr.data_type
        }))
        
        const { error: attributesError } = await supabase
          .from("attributes")
          .insert(attributesToInsert)
        
        if (attributesError) {
          throw new Error(`Failed to create attributes: ${attributesError.message}`)
        }
      }
      
      // Refresh categories list
      const { data: updatedCategoriesData } = await supabase
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
      
      const updatedCategories = updatedCategoriesData?.map((c) => ({
        category_id: c.category_id,
        name: c.name,
        description: c.description,
        attributes: c.attributes || []
      })) || []
      
      setCategories(updatedCategories)
      
      toast("Category added successfully",{
        description: `${category.name} has been created with its attributes.`,
      })
    } catch (error) {
      console.error("Error adding category:", error)
      toast("Failed to add category",{
        description: "Please try again later.",
      })
      throw error
    }
  }
  
  // Function to update a category
  const updateCategory = async (categoryId: number, category: Partial<Category>) => {
    try {
      const supabase = createClient()
      
      // Update category
      const { error: categoryError } = await supabase
        .from("categories")
        .update({
          name: category.name,
          description: category.description
        })
        .eq("category_id", categoryId)
      
      if (categoryError) {
        throw new Error(`Failed to update category: ${categoryError.message}`)
      }
      
      // Get existing attributes for this category
      const { data: existingAttributes } = await supabase
        .from("attributes")
        .select("attribute_id, attribute_name")
        .eq("category_id", categoryId)
      
      // Create a map of existing attribute names to their IDs
      const existingAttributeMap = new Map(
        existingAttributes?.map(attr => [attr.attribute_name, attr.attribute_id]) || []
      )
      
      // Process the new attributes
      const newAttributeNames = new Set(
        category.attributes?.map(attr => attr.attribute_name) || []
      )
      
      // Find attributes to delete (exist in DB but not in new list)
      const attributesToDelete = existingAttributes
        ?.filter(attr => !newAttributeNames.has(attr.attribute_name))
        .map(attr => attr.attribute_id) || []
      
      // Delete attributes that are no longer needed
      if (attributesToDelete.length > 0) {
        await supabase
          .from("attributes")
          .delete()
          .in("attribute_id", attributesToDelete)
      }
      
      // Process attributes to add or update
      if (category.attributes) {
        for (const attr of category.attributes) {
          const existingId = existingAttributeMap.get(attr.attribute_name)
          
          if (existingId) {
            // Attribute exists, update it if needed
            await supabase
              .from("attributes")
              .update({
                attribute_name: attr.attribute_name,
                data_type: attr.data_type
              })
              .eq("attribute_id", existingId)
          } else {
            // New attribute, add it
            await supabase
              .from("attributes")
              .insert({
                category_id: categoryId,
                attribute_name: attr.attribute_name,
                data_type: attr.data_type
              })
          }
        }
      }
      
      // Refresh categories list
      const { data: updatedCategoriesData } = await supabase
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
      
      const updatedCategories = updatedCategoriesData?.map((c) => ({
        category_id: c.category_id,
        name: c.name,
        description: c.description,
        attributes: c.attributes || []
      })) || []
      
      setCategories(updatedCategories)
      toast("Category updated successfully",{
        description: `${category.name} has been updated.`,
      })
    } catch (error) {
      console.error("Error updating category:", error)
      toast("Failed to update category",{
        description: "Please try again later.",
      })
      throw error
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="products" className="space-y-4">
            <ProductsTab 
              products={products} 
              categories={categories} 
              addProduct={addProduct}
              updateProduct={updateProduct}
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <CategoriesTab 
              categories={categories} 
              addCategory={addCategory}
              updateCategory={updateCategory}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
// Products Tab Component
interface ProductsTabProps {
  products: Product[]
  categories: Category[]
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>
  updateProduct: (productId: string, product: Omit<Product, 'id'>) => Promise<void>
  isLoading: boolean
}
function ProductsTab({ products, categories, addProduct, updateProduct, isLoading }: ProductsTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortConfig, setSortConfig] = useState<{
    key: "name" | "price" | "category" | "stock"
    direction: "asc" | "desc"
  }>({ key: "name", direction: "asc" })
  
  // State for the add product sheet
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
    stock_qty: 0,
    category_id: categories[0]?.category_id || 0,
    attributes: [] as ProductAttribute[]
  })
  
  // Handle category change for the form
  const handleCategoryChange = (categoryId: number) => {
    const selectedCategory = categories.find(c => c.category_id === categoryId)
    
    if (selectedCategory) {
      const newAttributes = selectedCategory.attributes.map(attr => ({
        name: attr.attribute_name,
        value: "",
        type: attr.data_type
      }))
      
      setNewProduct(prev => ({
        ...prev,
        category_id: categoryId,
        attributes: newAttributes
      }))
    }
  }
  
  // Handle attribute change for the form
  const handleAttributeChange = (index: number, value: string) => {
    setNewProduct(prev => {
      const updatedAttributes = [...prev.attributes]
      updatedAttributes[index] = { ...updatedAttributes[index], value }
      
      return {
        ...prev,
        attributes: updatedAttributes
      }
    })
  }
  
  // Handle form submission for adding a product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProduct.name || !newProduct.category_id) {
      toast("Validation error", {
        description: "Please fill in all required fields",
      })
      return
    }
    
    setIsAdding(true)
    
    try {
      const selectedCategory = categories.find(c => c.category_id === newProduct.category_id)
      
      await addProduct({
        name: newProduct.name,
        price: newProduct.price,
        stock_qty: newProduct.stock_qty,
        category: selectedCategory?.name || "",
        category_id: newProduct.category_id,
        attributes: newProduct.attributes
      })
      
      // Reset form
      setNewProduct({
        name: "",
        price: 0,
        stock_qty: 0,
        category_id: categories[0]?.category_id || 0,
        attributes: []
      })
      
      // Close the sheet after successful addition
      setIsAddSheetOpen(false)
      
      toast("Product added successfully", {
        description: `${newProduct.name} has been added to your inventory.`,
      })
    } catch (error) {
      console.error("Error adding product:", error)
      toast("Failed to add product", {
        description: "Please try again later.",
      })
    } finally {
      setIsAdding(false)
    }
  }
  
  // Handle form submission for updating a product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProduct.name || !newProduct.category_id || !editingProduct) {
      toast("Validation error", {
        description: "Please fill in all required fields",
      })
      return
    }
    
    setIsUpdating(true)
    
    try {
      const selectedCategory = categories.find(c => c.category_id === newProduct.category_id)
      
      await updateProduct(editingProduct.id, {
        name: newProduct.name,
        price: newProduct.price,
        stock_qty: newProduct.stock_qty,
        category: selectedCategory?.name || "",
        category_id: newProduct.category_id,
        attributes: newProduct.attributes
      })
      
      // Reset form
      setNewProduct({
        name: "",
        price: 0,
        stock_qty: 0,
        category_id: categories[0]?.category_id || 0,
        attributes: []
      })
      
      // Close the sheet after successful update
      setIsEditSheetOpen(false)
      setEditingProduct(null)
      
      toast("Product updated successfully", {
        description: `${newProduct.name} has been updated.`,
      })
    } catch (error) {
      console.error("Error updating product:", error)
      toast("Failed to update product", {
        description: "Please try again later.",
      })
    } finally {
      setIsUpdating(false)
    }
  }
  
  // Reset form when cancelled
  const handleCancelAdd = () => {
    setNewProduct({
      name: "",
      price: 0,
      stock_qty: 0,
      category_id: categories[0]?.category_id || 0,
      attributes: []
    })
    setIsAddSheetOpen(false)
  }
  
  const handleCancelEdit = () => {
    setNewProduct({
      name: "",
      price: 0,
      stock_qty: 0,
      category_id: categories[0]?.category_id || 0,
      attributes: []
    })
    setIsEditSheetOpen(false)
    setEditingProduct(null)
  }
  
  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setNewProduct({
      name: product.name,
      price: product.price,
      stock_qty: product.stock_qty,
      category_id: product.category_id,
      attributes: product.attributes
    })
    setIsEditSheetOpen(true)
  }
  
  // Filter and sort products
  const filteredAndSortedProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.attributes.some(attr => 
        attr.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    const aValue = sortConfig.key === "price" || sortConfig.key === "stock"
      ? a[sortConfig.key === "stock" ? "stock_qty" : sortConfig.key]
      : a[sortConfig.key].toLowerCase()
    const bValue = sortConfig.key === "price" || sortConfig.key === "stock"
      ? b[sortConfig.key === "stock" ? "stock_qty" : sortConfig.key]
      : b[sortConfig.key].toLowerCase()
    
    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1
    }
    return 0
  })
  
  const handleSort = (key: "name" | "price" | "category" | "stock") => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }
  
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
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Product Inventory
            </CardTitle>
            <CardDescription className="text-sm">
              Manage your product inventory
            </CardDescription>
          </div>
          
          {/* Add Product Sheet Trigger */}
          <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-hidden">
              <SheetHeader className="px-6 pt-6">
                <SheetTitle className="text-xl">Add New Product</SheetTitle>
                <SheetDescription>
                  Fill in the details for the new product
                </SheetDescription>
              </SheetHeader>
              
              <div className="overflow-y-auto max-h-[calc(100vh-200px)] px-6 pb-6">
                <form onSubmit={handleAddProduct} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="Product name"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newProduct.category_id.toString()}
                      onValueChange={(value) => handleCategoryChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-10">
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                        placeholder="0.00"
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock</Label>
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        value={newProduct.stock_qty}
                        onChange={(e) => setNewProduct({...newProduct, stock_qty: parseInt(e.target.value) || 0})}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                  </div>
                  
                  {/* Dynamic Attributes Section */}
                  {newProduct.attributes.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Attributes</Label>
                      <div className="space-y-4">
                        {newProduct.attributes.map((attr, index) => (
                          <div key={index} className="space-y-1">
                            <Label className="text-sm text-muted-foreground">{attr.name}</Label>
                            <Input
                              value={attr.value}
                              onChange={(e) => handleAttributeChange(index, e.target.value)}
                              placeholder={`Enter ${attr.name}`}
                              className="h-10"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>
              
              {/* Form Actions - Fixed at the bottom */}
              <SheetFooter className="px-6 pb-6 pt-0">
                <Button type="button" variant="outline" onClick={handleCancelAdd} className="h-10">
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding || !newProduct.name} className="h-10" onClick={handleAddProduct}>
                  {isAdding ? "Adding..." : "Add Product"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          
          {/* Edit Product Sheet */}
          <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
            <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-hidden">
              <SheetHeader className="px-6 pt-6">
                <SheetTitle className="text-xl">Edit Product</SheetTitle>
                <SheetDescription>
                  Update the product details
                </SheetDescription>
              </SheetHeader>
              
              <div className="overflow-y-auto max-h-[calc(100vh-200px)] px-6 pb-6">
                <form onSubmit={handleUpdateProduct} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Product Name</Label>
                    <Input
                      id="edit-name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="Product name"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={newProduct.category_id.toString()}
                      onValueChange={(value) => handleCategoryChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-10">
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-price">Price ($)</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                        placeholder="0.00"
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-stock">Stock</Label>
                      <Input
                        id="edit-stock"
                        type="number"
                        min="0"
                        value={newProduct.stock_qty}
                        onChange={(e) => setNewProduct({...newProduct, stock_qty: parseInt(e.target.value) || 0})}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                  </div>
                  
                  {/* Dynamic Attributes Section */}
                  {newProduct.attributes.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Attributes</Label>
                      <div className="space-y-4">
                        {newProduct.attributes.map((attr, index) => (
                          <div key={index} className="space-y-1">
                            <Label className="text-sm text-muted-foreground">{attr.name}</Label>
                            <Input
                              value={attr.value}
                              onChange={(e) => handleAttributeChange(index, e.target.value)}
                              placeholder={`Enter ${attr.name}`}
                              className="h-10"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>
              
              {/* Form Actions - Fixed at the bottom */}
              <SheetFooter className="px-6 pb-6 pt-0">
                <Button type="button" variant="outline" onClick={handleCancelEdit} className="h-10">
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating || !newProduct.name} className="h-10" onClick={handleUpdateProduct}>
                  {isUpdating ? "Updating..." : "Update Product"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Search and filter section */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.category_id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm mb-4">Try adjusting your search or filters</p>
            <Button 
              onClick={() => setIsAddSheetOpen(true)}
              className="mx-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Product
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("name")}
                      className="h-8 flex items-center gap-1 hover:bg-transparent p-0 font-medium text-xs"
                    >
                      Name
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("price")}
                      className="h-8 flex items-center gap-1 hover:bg-transparent p-0 font-medium text-xs"
                    >
                      Price
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[20%]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("category")}
                      className="h-8 flex items-center gap-1 hover:bg-transparent p-0 font-medium text-xs"
                    >
                      Category
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("stock")}
                      className="h-8 flex items-center gap-1 hover:bg-transparent p-0 font-medium text-xs"
                    >
                      Stock
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[10%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock_qty)
                  return (
                    <TableRow key={product.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stockStatus.variant} className="text-xs">
                          {stockStatus.text}
                        </Badge>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({product.stock_qty})
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
// Categories Tab Component
interface CategoriesTabProps {
  categories: Category[]
  addCategory: (category: Omit<Category, 'category_id'>) => Promise<void>
  updateCategory: (categoryId: number, category: Partial<Category>) => Promise<void>
}
function CategoriesTab({ categories, addCategory, updateCategory }: CategoriesTabProps) {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    attributes: [] as { attribute_id?: number; attribute_name: string; data_type: "text" | "number" | "decimal" | "date" }[]
  })
  const [newAttribute, setNewAttribute] = useState({
    attribute_name: "",
    data_type: "text" as "text" | "number" | "decimal" | "date"
  })
  
  const handleAddAttribute = () => {
    if (newAttribute.attribute_name && newAttribute.data_type) {
      // Check if attribute already exists
      const attributeExists = newCategory.attributes.some(
        attr => attr.attribute_name === newAttribute.attribute_name
      )
      
      if (!attributeExists) {
        setNewCategory(prev => ({
          ...prev,
          attributes: [...prev.attributes, { ...newAttribute }]
        }))
        setNewAttribute({ attribute_name: "", data_type: "text" })
      } else {
        toast(`Attribute "${newAttribute.attribute_name}" already exists for this category.`)
      }
    }
  }
  
  const handleRemoveAttribute = (index: number) => {
    setNewCategory(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }))
  }
  
  const handleSubmit = async () => {
    if (!newCategory.name) return
    
    try {
      await addCategory(newCategory as Category)
      setIsAddSheetOpen(false)
      setNewCategory({
        name: "",
        description: "",
        attributes: []
      })
    } catch (error) {
      console.error("Error adding category:", error)
    }
  }
  
  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setNewCategory({
      name: category.name,
      description: category.description || "",
      attributes: category.attributes.map(attr => ({
        attribute_id: attr.attribute_id,
        attribute_name: attr.attribute_name,
        data_type: attr.data_type
      }))
    })
    setIsEditSheetOpen(true)
  }
  
  const handleUpdate = async () => {
    if (!editingCategory || !newCategory.name) return
    
    try {
      const categoryToUpdate: Partial<Category> = {
        name: newCategory.name,
        description: newCategory.description,
        attributes: newCategory.attributes.map(attr => ({
          attribute_id: attr.attribute_id || 0,
          attribute_name: attr.attribute_name,
          data_type: attr.data_type
        }))
      }
      
      await updateCategory(editingCategory.category_id, categoryToUpdate)
      setIsEditSheetOpen(false)
      setEditingCategory(null)
      setNewCategory({
        name: "",
        description: "",
        attributes: []
      })
    } catch (error) {
      console.error("Error updating category:", error)
    }
  }
  
  // Reset form when cancelled
  const handleCancelAdd = () => {
    setNewCategory({
      name: "",
      description: "",
      attributes: []
    })
    setIsAddSheetOpen(false)
  }
  
  const handleCancelEdit = () => {
    setNewCategory({
      name: "",
      description: "",
      attributes: []
    })
    setEditingCategory(null)
    setIsEditSheetOpen(false)
  }
  
  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-5 w-5" />
                Categories Management
              </CardTitle>
              <CardDescription className="text-sm">
                Manage product categories and their attributes
              </CardDescription>
            </div>
            
            {/* Add Category Sheet Trigger */}
            <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-hidden">
                <SheetHeader className="px-6 pt-6">
                  <SheetTitle className="text-xl">Add New Category</SheetTitle>
                  <SheetDescription>
                    Create a new category and define its attributes
                  </SheetDescription>
                </SheetHeader>
                
                <div className="overflow-y-auto max-h-[calc(100vh-200px)] px-6 pb-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Category Name</Label>
                      <Input
                        id="name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                        placeholder="Category name"
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                        placeholder="Category description"
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    {/* Attributes Section */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Attributes</Label>
                      <div className="space-y-4">
                        {newCategory.attributes.map((attr, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={attr.attribute_name}
                              readOnly
                              className="flex-1 h-10"
                            />
                            <Select
                              value={attr.data_type}
                              disabled
                            >
                              <SelectTrigger className="w-32 h-10">
                                <SelectValue />
                              </SelectTrigger>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAttribute(index)}
                              className="h-10 w-10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Attribute name"
                            value={newAttribute.attribute_name}
                            onChange={(e) => setNewAttribute({...newAttribute, attribute_name: e.target.value})}
                            className="flex-1 h-10"
                          />
                          <Select
                            value={newAttribute.data_type}
                            onValueChange={(value: "text" | "number" | "decimal" | "date") => 
                              setNewAttribute({...newAttribute, data_type: value})
                            }
                          >
                            <SelectTrigger className="w-32 h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="decimal">Decimal</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddAttribute}
                            disabled={!newAttribute.attribute_name}
                            className="h-10"
                          >
                            Add
                          </Button>
                        </div>
                        
                        {newCategory.attributes.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Added attributes: {newCategory.attributes.map(attr => attr.attribute_name).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Form Actions - Fixed at the bottom */}
                <SheetFooter className="px-6 pb-6 pt-0">
                  <Button type="button" variant="outline" onClick={handleCancelAdd} className="h-10">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!newCategory.name} className="h-10">
                    Save Category
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Attributes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.category_id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {category.attributes.length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="text-xs">
                                  {category.attributes.length} attributes
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs">
                                  {category.attributes.map((attr, index) => (
                                    <div key={index} className="text-xs">
                                      {attr.attribute_name} ({attr.data_type})
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Category Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-hidden">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle className="text-xl">Edit Category</SheetTitle>
            <SheetDescription>
              Update the category details and attributes
            </SheetDescription>
          </SheetHeader>
          
          <div className="overflow-y-auto max-h-[calc(100vh-200px)] px-6 pb-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Category Name</Label>
                <Input
                  id="edit-name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  placeholder="Category name"
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  placeholder="Category description"
                  className="min-h-[100px]"
                />
              </div>
              
              {/* Attributes Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Attributes</Label>
                  <span className="text-xs text-muted-foreground">
                    Click the X to remove an attribute
                  </span>
                </div>
                <div className="space-y-4">
                  {newCategory.attributes.map((attr, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={attr.attribute_name}
                        readOnly
                        className="flex-1 h-10"
                      />
                      <Select
                        value={attr.data_type}
                        disabled
                      >
                        <SelectTrigger className="w-32 h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAttribute(index)}
                        className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Remove attribute"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Attribute name"
                      value={newAttribute.attribute_name}
                      onChange={(e) => setNewAttribute({...newAttribute, attribute_name: e.target.value})}
                      className="flex-1 h-10"
                    />
                    <Select
                      value={newAttribute.data_type}
                      onValueChange={(value: "text" | "number" | "decimal" | "date") => 
                        setNewAttribute({...newAttribute, data_type: value})
                      }
                    >
                      <SelectTrigger className="w-32 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="decimal">Decimal</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddAttribute}
                      disabled={!newAttribute.attribute_name}
                      className="h-10"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {newCategory.attributes.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Current attributes: {newCategory.attributes.map(attr => attr.attribute_name).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Form Actions - Fixed at the bottom */}
          <SheetFooter className="px-6 pb-6 pt-0">
            <Button type="button" variant="outline" onClick={handleCancelEdit} className="h-10">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!newCategory.name} className="h-10">
              Update Category
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}