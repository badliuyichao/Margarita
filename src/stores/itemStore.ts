import { create } from 'zustand'

export interface Item {
  id: string
  name: string
  category_id: string | null
  space_id: string | null
  purchase_date: string | null
  purchase_price: number | null
  warranty_expiry: string | null
  is_fixed_asset: boolean
  useful_life_years: number | null
  residual_value: number | null
  depreciation_method: string | null
  status: string
  rating: number | null
  notes: string | null
  estimated_value: number | null
  created_at: string
  updated_at: string
}

export interface CreateItemInput {
  name: string
  category_id?: string
  space_id?: string
  purchase_date?: string
  purchase_price?: number
  warranty_expiry?: string
  is_fixed_asset?: boolean
  useful_life_years?: number
  residual_value?: number
  depreciation_method?: string
  notes?: string
  estimated_value?: number
}

interface ItemState {
  items: Item[]
  totalCount: number
  currentItem: Item | null
  filters: {
    search: string
    categoryId: string | null
    spaceId: string | null
    isFixedAsset: boolean | null
  }
  sort: { field: string; order: 'asc' | 'desc' }
  viewMode: 'grid' | 'list'
  page: number
  pageSize: number
  setItems: (items: Item[], total: number) => void
  setCurrentItem: (item: Item | null) => void
  setFilter: (key: string, value: unknown) => void
  setSort: (field: string, order: 'asc' | 'desc') => void
  setViewMode: (mode: 'grid' | 'list') => void
  setPage: (page: number) => void
  resetFilters: () => void
}

export const useItemStore = create<ItemState>((set) => ({
  items: [],
  totalCount: 0,
  currentItem: null,
  filters: { search: '', categoryId: null, spaceId: null, isFixedAsset: null },
  sort: { field: 'created_at', order: 'desc' },
  viewMode: 'grid',
  page: 1,
  pageSize: 50,

  setItems: (items, total) => set({ items, totalCount: total }),
  setCurrentItem: (item) => set({ currentItem: item }),
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value }, page: 1 })),
  setSort: (field, order) => set({ sort: { field, order } }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setPage: (page) => set({ page }),
  resetFilters: () =>
    set({
      filters: { search: '', categoryId: null, spaceId: null, isFixedAsset: null },
      page: 1,
    }),
}))
