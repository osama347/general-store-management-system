/**
 * Application configuration
 * Reads environment variables and provides typed access
 */

export const config = {
  // Location limits - controls how many locations a user can create
  // MUST use NEXT_PUBLIC_ prefix for client-side access
  maxStores: parseInt(process.env.NEXT_PUBLIC_MAX_STORES || '1', 10),
  maxWarehouses: parseInt(process.env.NEXT_PUBLIC_MAX_WAREHOUSES || '1', 10),
  
  // Supabase configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
} as const

export type Config = typeof config
