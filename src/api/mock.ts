import type { Item } from '../stores/itemStore'
import type { Category, Space, CheckIn, ItemEvent } from './items'

const mockCategories: Category[] = [
  { id: 'cat-electronics', key: 'electronics', name: '电子产品', parent_id: null },
  { id: 'cat-clothing', key: 'clothing', name: '衣物', parent_id: null },
  { id: 'cat-books', key: 'books', name: '书籍', parent_id: null },
]

const mockSpaces: Space[] = [
  { id: 'sp1', name: '书房', parent_id: null },
  { id: 'sp2', name: '书桌第一层抽屉', parent_id: 'sp1' },
  { id: 'sp3', name: '客厅', parent_id: null },
]

const mockItems: Item[] = [
  {
    id: 'item-1',
    name: 'MacBook Pro 14"',
    category_id: 'cat-electronics',
    space_id: 'sp2',
    purchase_date: '2025-03-15',
    purchase_price: 14999,
    warranty_expiry: '2027-03-15',
    is_fixed_asset: true,
    useful_life_years: 5,
    residual_value: 2000,
    depreciation_method: 'LINEAR',
    status: 'ACTIVE',
    rating: 5,
    notes: 'M3 Pro芯片',
    estimated_value: null,
    created_at: '2025-03-15T00:00:00Z',
    updated_at: '2025-03-15T00:00:00Z',
  },
  {
    id: 'item-2',
    name: '机械键盘 Keychron K8',
    category_id: 'cat-electronics',
    space_id: 'sp2',
    purchase_date: '2024-08-01',
    purchase_price: 599,
    warranty_expiry: null,
    is_fixed_asset: false,
    useful_life_years: null,
    residual_value: null,
    depreciation_method: null,
    status: 'ACTIVE',
    rating: 4,
    notes: '青轴',
    estimated_value: 300,
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-08-01T00:00:00Z',
  },
  {
    id: 'item-3',
    name: '《代码大全》',
    category_id: 'cat-books',
    space_id: 'sp2',
    purchase_date: '2023-01-10',
    purchase_price: 98,
    warranty_expiry: null,
    is_fixed_asset: false,
    useful_life_years: null,
    residual_value: null,
    depreciation_method: null,
    status: 'ACTIVE',
    rating: 5,
    notes: null,
    estimated_value: null,
    created_at: '2023-01-10T00:00:00Z',
    updated_at: '2023-01-10T00:00:00Z',
  },
]

const mockCheckins: Record<string, CheckIn[]> = {
  'item-1': [
    { id: 'ci1', item_id: 'item-1', check_date: '2026-05-12' },
    { id: 'ci2', item_id: 'item-1', check_date: '2026-05-11' },
  ],
}

const mockEvents: Record<string, ItemEvent[]> = {
  'item-1': [
    {
      id: 'ev1',
      item_id: 'item-1',
      event_type: 'maintenance',
      description: '更换屏幕保护膜',
      amount: 99,
      occurred_at: '2025-09-01',
      created_at: '2025-09-01T00:00:00Z',
    },
  ],
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export const mockApi = {
  categories: mockCategories,
  spaces: mockSpaces,
  items: [...mockItems],
  checkins: { ...mockCheckins },
  events: { ...mockEvents },
}
