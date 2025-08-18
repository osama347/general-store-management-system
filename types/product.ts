export interface ProductAttribute {
  name: string
  value: string
  type: "text" | "number" | "decimal" | "date"
}

export interface CategoryAttribute {
  attribute_id: number
  attribute_name: string
  data_type: "text" | "number" | "decimal" | "date"
}

export interface NewCategoryAttribute {
  attribute_name: string
  data_type: "text" | "number" | "decimal" | "date"
}

export interface Category {
  category_id: number
  name: string
  description?: string
  attributes: CategoryAttribute[]
}

export interface NewCategory {
  name: string
  description?: string
  attributes: NewCategoryAttribute[]
}

export interface Product {
  id: string
  name: string
  price: number
  stock_qty: number
  category: string
  category_id: number
  attributes: ProductAttribute[]
}