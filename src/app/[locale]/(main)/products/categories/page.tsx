"use client"
import { useState, useEffect, useMemo } from "react"
import type React from "react"
import { createClient } from "@/lib/supabase/client"
// @ts-ignore
import type { Category } from "@/types/category"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

// Icons
import { 
  Plus, Search, Edit, Trash2, FolderOpen, RefreshCw, 
  Settings, Tag, Info, X, ChevronLeft, ChevronRight, Filter
} from "lucide-react"

export default function CategoriesPage() {

  const t = useTranslations("categories")
  const {profile} = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()
  
  // Fetch data when the component mounts
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
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
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load data", {
          description: "Please try again later.",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])
  
  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories
    
    return categories.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      category.attributes.some((attr:any)  => 
        attr.attribute_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [categories, searchTerm])
  
  // Function to add a category
  const addCategory = async (category: Omit<Category, "category_id">) => {
    try {
      const { data: newCategory, error: categoryError } = await supabase
        .from("categories")
        .insert({
          name: category.name,
          description: category.description,
        })
        .select()
        .single()
      if (categoryError) {
        throw new Error(`Failed to create category: ${categoryError.message}`)
      }
      
      if (category.attributes.length > 0) {
        const attributesToInsert = category.attributes.map((attr : any) => ({
          category_id: newCategory.category_id,
          attribute_name: attr.attribute_name,
          data_type: attr.data_type,
        }))
        const { error: attributesError } = await supabase.from("attributes").insert(attributesToInsert)
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
      const updatedCategories =
        updatedCategoriesData?.map((c) => ({
          category_id: c.category_id,
          name: c.name,
          description: c.description,
          attributes: c.attributes || [],
        })) || []
      setCategories(updatedCategories)
      
      toast.success("Category added successfully", {
        description: `${category.name} has been created with its attributes.`,
      })
    } catch (error) {
      console.error("Error adding category:", error)
      toast.error("Failed to add category", {
        description: "Please try again later.",
      })
      throw error
    }
  }
  
  // Function to update a category
  const updateCategory = async (categoryId: number, category: Partial<Category>) => {
    try {
      const { error: categoryError } = await supabase
        .from("categories")
        .update({
          name: category.name,
          description: category.description,
        })
        .eq("category_id", categoryId)
      if (categoryError) {
        throw new Error(categoryError.message)
      }
      
      if (category.attributes && category.attributes.length > 0) {
        await supabase.from("attributes").delete().eq("category_id", categoryId)
        const attributesToInsert = category.attributes.map((attr:any) => ({
          category_id: categoryId,
          attribute_name: attr.attribute_name,
          data_type: attr.data_type,
        }))
        const { error: attributesError } = await supabase.from("attributes").insert(attributesToInsert)
        if (attributesError) {
          console.error("Error updating attributes:", attributesError)
          throw new Error(attributesError.message)
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
      const updatedCategories =
        updatedCategoriesData?.map((c) => ({
          category_id: c.category_id,
          name: c.name,
          description: c.description,
          attributes: c.attributes || [],
        })) || []
      setCategories(updatedCategories)
      
      toast.success("Category updated successfully", {
        description: `${category.name} has been updated.`,
      })
    } catch (error) {
      console.error("Error updating category:", error)
      toast.error("Failed to update category", {
        description: "Please try again later.",
      })
      throw error
    }
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-4 p-4 md:p-8">
        <Card className="w-full">
          {/* Header with Add Category button */}
          <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  
                  {t('title')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t('description')}
                </CardDescription>
              </div>
              
              <div className="relative w-full md:w-[300px] flex items-center">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4"
                />
              </div>
            </div>
            { profile?.role === 'admin' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addCategory')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("addForm.title")}</DialogTitle>
                  <DialogDescription>
                    {t("addForm.description")}
                  </DialogDescription>
                </DialogHeader>
                <CategoryForm 
                  onSubmit={addCategory} 
                  isLoading={isLoading}
                />
              </DialogContent>
            </Dialog>
            )}
          </div>
          
          {/* Main content inside Card */}
          <CardContent className="p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <Skeleton className="h-5 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-6 w-10 rounded-full" />
                        </div>
                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? "No categories found" : "No categories yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? "Try adjusting your search or filters" 
                    : "Get started by adding your first category"
                  }
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('addCategory')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t("addForm.title")}</DialogTitle>
                      <DialogDescription>
                        {t("addForm.description")}
                      </DialogDescription>
                    </DialogHeader>
                    <CategoryForm 
                      onSubmit={addCategory} 
                      isLoading={isLoading}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map((category) => (
                  <CategoryCard 
                    key={category.category_id} 
                    category={category} 
                    updateCategory={updateCategory} 
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Category Card Component
interface CategoryCardProps {
  category: Category
  updateCategory: (categoryId: number, category: Partial<Category>) => Promise<void>
}

function CategoryCard({ category, updateCategory }: CategoryCardProps) {

  const t = useTranslations("categories")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const handleEdit = () => {
    setIsEditDialogOpen(true)
  }
  
  return (
    <>
      <Card className="group border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-white rounded-xl overflow-hidden h-full">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{category.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{category.description || t("nodescription")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className=" h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('tabs.attributes')}</span>
              <Badge variant="secondary" className="text-xs rounded-full px-3 py-1">
                {category.attributes.length}
              </Badge>
            </div>
            
            {category.attributes.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <div className="space-y-2">
                  {category.attributes.slice(0, 3).map((attr:any, index:any) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900 font-medium truncate max-w-[120px]">{attr.attribute_name}</span>
                      <Badge variant="outline" className="text-xs text-gray-600 rounded-full px-2 py-1">
                        {attr.data_type}
                      </Badge>
                    </div>
                  ))}
                  {category.attributes.length > 3 && (
                    <div className="text-xs text-gray-400 pt-1">
                      +{category.attributes.length - 3} {t("moreattributes")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("editForm.title")}</DialogTitle>
            <DialogDescription>
              {t("editForm.description")}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm 
            category={category}
            onSubmit={(categoryData) => updateCategory(category.category_id, categoryData)} 
            isLoading={false}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

// Category Form Component
interface CategoryFormProps {
  category?: Category
  onSubmit: (category: Omit<Category, "category_id">) => Promise<void>
  isLoading: boolean
}

function CategoryForm({ category, onSubmit, isLoading }: CategoryFormProps) {
  const t = useTranslations("categories")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: category?.name || "",
    description: category?.description || "",
    attributes: category?.attributes || [],
  })
  
  const [newAttribute, setNewAttribute] = useState({
    attribute_name: "",
    data_type: "text" as "text" | "number" | "decimal" | "date",
  })
  
  const handleAddAttribute = () => {
    if (newAttribute.attribute_name && newAttribute.data_type) {
      const attributeExists = formData.attributes.some((attr:any) => attr.attribute_name === newAttribute.attribute_name)
      if (!attributeExists) {
        setFormData((prev) => ({
          ...prev,
          attributes: [...prev.attributes, { ...newAttribute }],
        }))
        setNewAttribute({ attribute_name: "", data_type: "text" })
      } else {
        toast.error(`Attribute "${newAttribute.attribute_name}" already exists for this category.`)
      }
    }
  }
  
  const handleRemoveAttribute = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_:any, i:any) => i !== index),
    }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error("Please enter a category name")
      return
    }
    
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: formData.name,
        description: formData.description,
        attributes: formData.attributes,
      })
    } catch (error) {
      console.error("Error submitting category:", error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="basic">{t("tabs.basicInfo")}</TabsTrigger>
          <TabsTrigger value="attributes">{t("tabs.attributes")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="font-medium">{t('editForm.formFields.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('editForm.formFields.namePlaceholder')}
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="description" className="font-medium">{t('editForm.formFields.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('editForm.formFields.descriptionPlaceholder')}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="attributes" className="space-y-4">
          {/* Existing Attributes */}
          {formData.attributes.length > 0 && (
            <div className="space-y-3">
              <Label className="font-medium">{t("")}</Label>
              {formData.attributes.map((attr:any, index:any) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md border">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{attr.attribute_name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {attr.data_type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttribute(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add New Attribute */}
          <div className="space-y-3 pt-2">
            <Label className="font-medium">{t('editForm.formFields.addnewattribute')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t('editForm.formFields.attributesPlaceholder')}
                value={newAttribute.attribute_name}
                onChange={(e) => setNewAttribute({ ...newAttribute, attribute_name: e.target.value })}
                className="flex-1"
              />
              <Select
                value={newAttribute.data_type}
                onValueChange={(value: "text" | "number" | "decimal" | "date") =>
                  setNewAttribute({ ...newAttribute, data_type: value })
                }
              >
                <SelectTrigger className="w-32">
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
                type="button"
                onClick={handleAddAttribute}
                disabled={!newAttribute.attribute_name}
                variant="outline"
              >
                Add
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <DialogFooter>
        <Button 
          type="submit" 
          disabled={isSubmitting || !formData.name}
          className="mt-4"
        >
          {isSubmitting ? t("saving")+"..." : category ? t("UpdateCategory") : t('addCategory')}
        </Button>
      </DialogFooter>
    </form>
  )
}