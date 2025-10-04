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
  Plus, Search, Edit, FolderOpen, Tag, X, Layers
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
    <div className="flex flex-col min-h-screen ">
      {/* Premium Header */}
      <header className="bg-white border-b-2 border-teal-200 shadow-md sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 tracking-tight">{t('title')}</h1>
                <p className="text-slate-600 text-sm font-medium">{t('description')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1.5 bg-gradient-to-br from-teal-50 to-emerald-100 border-2 border-teal-300 shadow-sm">
                <Tag className="h-3 w-3 mr-1.5" />
                <span className="text-sm font-semibold text-teal-900">{filteredCategories.length}</span>
                <span className="text-xs text-teal-600 font-semibold ml-1">{filteredCategories.length === 1 ? 'Category' : 'Categories'}</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 space-y-6 p-4 md:p-8">

        <Card className="w-full shadow-lg border-2 rounded-2xl">
          {/* Search and Add Button */}
          <div className="p-6 pb-4 bg-gradient-to-r from-slate-50 to-white border-b-2 border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 border-2 focus:border-teal-500"
                />
              </div>
              
              { profile?.role === 'admin' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white whitespace-nowrap shadow-md">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('addCategory')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Plus className="h-5 w-5 text-teal-600" />
                        {t("addForm.title")}
                      </DialogTitle>
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
              <div className="text-center py-16 rounded-xl border-2 border-dashed border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <FolderOpen className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {searchTerm ? "No categories found" : "No categories yet"}
                </h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  {searchTerm 
                    ? "Try adjusting your search or filters" 
                    : "Get started by adding your first category"
                  }
                </p>
                {profile?.role === 'admin' && !searchTerm && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('addCategory')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{t("addForm.title")}</DialogTitle>
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
      <Card className="group border-2 border-slate-200 shadow-sm hover:shadow-xl hover:border-teal-300 transition-all duration-300 bg-white rounded-2xl overflow-hidden h-full hover:-translate-y-1">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                  <Tag className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 truncate">{category.name}</h3>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2 ml-10">{category.description || t("nodescription")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-9 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium ml-2"
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          </div>
          
          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-100">
              <span className="text-sm font-semibold text-teal-700">{t('tabs.attributes')}</span>
              <Badge className="text-xs rounded-full px-3 py-1 bg-teal-600 text-white">
                {category.attributes.length}
              </Badge>
            </div>
            
            {category.attributes.length > 0 && (
              <div className="pt-2 border-t-2 border-slate-100">
                <div className="space-y-2">
                  {category.attributes.slice(0, 3).map((attr:any, index:any) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <span className="text-slate-900 font-semibold truncate max-w-[140px]">{attr.attribute_name}</span>
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full px-2 py-1 font-medium">
                        {attr.data_type}
                      </Badge>
                    </div>
                  ))}
                  {category.attributes.length > 3 && (
                    <div className="text-xs text-teal-600 font-medium pt-1 pl-2">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-teal-600" />
              {t("editForm.title")}
            </DialogTitle>
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1.5 rounded-xl border-2 border-slate-200">
          <TabsTrigger 
            value="basic"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold"
          >
            {t("tabs.basicInfo")}
          </TabsTrigger>
          <TabsTrigger 
            value="attributes"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold"
          >
            {t("tabs.attributes")}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-5 pt-4">
          <div className="space-y-5">
            <div className="grid gap-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-100">
              <Label htmlFor="name" className="font-bold text-slate-900">{t('editForm.formFields.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('editForm.formFields.namePlaceholder')}
                required
                className="border-2 focus:border-teal-500"
              />
            </div>
            
            <div className="grid gap-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-100">
              <Label htmlFor="description" className="font-bold text-slate-900">{t('editForm.formFields.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('editForm.formFields.descriptionPlaceholder')}
                className="min-h-[100px] border-2 focus:border-teal-500"
              />
              <p className="text-xs text-slate-600">Optional: Provide a brief description of this category</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="attributes" className="space-y-5 pt-4">
          {/* Existing Attributes */}
          {formData.attributes.length > 0 && (
            <div className="space-y-3">
              <Label className="font-bold text-slate-900">Current Attributes</Label>
              <div className="space-y-2">
                {formData.attributes.map((attr:any, index:any) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border-2 border-teal-100 hover:border-teal-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                        <Tag className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">{attr.attribute_name}</span>
                        <Badge variant="outline" className="ml-2 text-xs bg-white border-teal-200 text-teal-700">
                          {attr.data_type}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttribute(index)}
                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Add New Attribute */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-100">
            <Label className="font-bold text-slate-900">{t('editForm.formFields.addnewattribute')}</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder={t('editForm.formFields.attributesPlaceholder')}
                value={newAttribute.attribute_name}
                onChange={(e) => setNewAttribute({ ...newAttribute, attribute_name: e.target.value })}
                className="flex-1 border-2 focus:border-teal-500"
              />
              <Select
                value={newAttribute.data_type}
                onValueChange={(value: "text" | "number" | "decimal" | "date") =>
                  setNewAttribute({ ...newAttribute, data_type: value })
                }
              >
                <SelectTrigger className="w-full sm:w-32 border-2">
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
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add
              </Button>
            </div>
            <p className="text-xs text-slate-600">Add custom attributes that products in this category will have</p>
          </div>
        </TabsContent>
      </Tabs>
      
      <DialogFooter className="pt-6 border-t-2 border-slate-100">
        <Button 
          type="submit" 
          disabled={isSubmitting || !formData.name}
          className="min-w-[140px] bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-md disabled:opacity-50"
        >
          {isSubmitting ? t("saving")+"..." : category ? t("UpdateCategory") : t('addCategory')}
        </Button>
      </DialogFooter>
    </form>
  )
}