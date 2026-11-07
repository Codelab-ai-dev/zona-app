/** Mirrors backend API responses for admin dashboard. */

export type ProductMode = 'full' | 'web_only'

export interface League {
  id: string
  name: string
  slug: string
  description: string
  logo?: string
  admin_id: string
  is_active: boolean
  product_mode: ProductMode
  features?: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'super_admin' | 'league_admin' | 'team_owner'
  league_id?: string
  team_id?: string
  is_active: boolean
  created_at: string
}

export interface CreateLeagueRequest {
  name: string
  slug: string
  description: string
  logo?: string
  admin_id?: string
  product_mode?: ProductMode
}

export interface UpdateLeagueRequest {
  name?: string
  slug?: string
  description?: string
  logo?: string
}

export interface CreateUserRequest {
  email: string
  password: string
  name: string
  role: 'league_admin' | 'team_owner'
  league_id: string
  phone?: string
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  phone?: string
  is_active?: boolean
}
