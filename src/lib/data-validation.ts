// Data validation utilities for safer data access

export function safeArrayAccess<T>(array: T[] | undefined | null, index: number = 0): T | null {
  if (!Array.isArray(array) || array.length <= index) {
    return null;
  }
  return array[index];
}

export function safeNumericValue(value: any, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export function safeStringValue(value: any, fallback: string = 'Unknown'): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

export function safeDateValue(value: any): string {
  if (!value) return 'N/A';
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toISOString();
  } catch {
    return 'Invalid Date';
  }
}

// Safe object property access
export function safeObjectAccess<T>(obj: any, path: string[], fallback: T): T {
  try {
    let current = obj;
    for (const key of path) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return fallback;
      }
      current = current[key];
    }
    return current ?? fallback;
  } catch {
    return fallback;
  }
}

// Validate and transform data types
export interface ValidatedProduct {
  name: string;
  sku: string;
  base_price: number;
}

export interface ValidatedLocation {
  name: string;
  location_type: 'store' | 'warehouse';
}

export interface ValidatedInventoryItem {
  quantity: number;
  reserved_quantity: number;
  product: ValidatedProduct;
  location: ValidatedLocation;
}

export function validateProduct(data: any): ValidatedProduct {
  return {
    name: safeStringValue(data?.name, 'Unknown Product'),
    sku: safeStringValue(data?.sku, 'NO-SKU'),
    base_price: safeNumericValue(data?.base_price, 0)
  };
}

export function validateLocation(data: any): ValidatedLocation {
  const locationType = data?.location_type;
  return {
    name: safeStringValue(data?.name, 'Unknown Location'),
    location_type: (locationType === 'store' || locationType === 'warehouse') ? locationType : 'store'
  };
}

export function validateInventoryItem(item: any): ValidatedInventoryItem | null {
  if (!item) return null;
  
  const product = safeArrayAccess(item.products);
  const location = safeArrayAccess(item.locations);
  
  if (!product || !location) return null;
  
  return {
    quantity: safeNumericValue(item.quantity, 0),
    reserved_quantity: safeNumericValue(item.reserved_quantity, 0),
    product: validateProduct(product),
    location: validateLocation(location)
  };
}