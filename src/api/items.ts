import { invoke } from '@tauri-apps/api/core'
import type { Item } from '../stores/itemStore'

export interface ItemFilterParams {
  search?: string
  category_id?: string
  space_id?: string
  status?: string
  is_fixed_asset?: boolean
  page?: number
  page_size?: number
  sort_field?: string
  sort_order?: string
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

export interface Category {
  id: string
  key: string
  name: string | null
  parent_id: string | null
}

export interface Space {
  id: string
  name: string
  parent_id: string | null
}

export interface CheckIn {
  id: string
  item_id: string
  check_date: string
}

export interface ItemEvent {
  id: string
  item_id: string
  event_type: string
  description: string | null
  amount: number | null
  occurred_at: string
  created_at: string
}

export async function getItems(filter: ItemFilterParams = {}): Promise<[Item[], number]> {
  return invoke<[Item[], number]>('get_items', {
    search: filter.search || null,
    categoryId: filter.category_id || null,
    spaceId: filter.space_id || null,
    status: filter.status || null,
    isFixedAsset: filter.is_fixed_asset ?? null,
    page: filter.page || 1,
    pageSize: filter.page_size || 50,
    sortField: filter.sort_field || 'created_at',
    sortOrder: filter.sort_order || 'desc',
  })
}

export async function getItem(id: string): Promise<Item> {
  return invoke<Item>('get_item', { id })
}

export async function addItem(input: CreateItemInput): Promise<Item> {
  return invoke<Item>('add_item', { input })
}

export async function updateItem(id: string, input: CreateItemInput): Promise<Item> {
  return invoke<Item>('update_item', { id, input })
}

export async function deleteItem(id: string): Promise<void> {
  return invoke<void>('delete_item', { id })
}

export async function setItemStatus(id: string, status: string): Promise<Item> {
  return invoke<Item>('set_item_status', { id, status })
}

export async function listCategories(): Promise<Category[]> {
  return invoke<Category[]>('list_categories')
}

export async function createCategory(key: string, name?: string, parentId?: string): Promise<Category> {
  return invoke<Category>('create_category', { key, name: name || null, parentId: parentId || null })
}

export async function listSpaces(): Promise<Space[]> {
  return invoke<Space[]>('list_spaces')
}

export async function createSpace(name: string, parentId?: string): Promise<Space> {
  return invoke<Space>('create_space', { name, parentId: parentId || null })
}

export async function checkIn(itemId: string, date: string): Promise<CheckIn> {
  return invoke<CheckIn>('check_in', { itemId, date })
}

export async function getCheckins(itemId: string): Promise<CheckIn[]> {
  return invoke<CheckIn[]>('get_checkins', { itemId })
}

export async function addEvent(input: {
  item_id: string
  event_type: string
  description?: string
  amount?: number
  occurred_at: string
}): Promise<ItemEvent> {
  return invoke<ItemEvent>('add_event', { input })
}

export async function getEvents(itemId: string): Promise<ItemEvent[]> {
  return invoke<ItemEvent[]>('get_events', { itemId })
}

export async function getItemImages(itemId: string): Promise<string[]> {
  return invoke<string[]>('get_item_images', { itemId })
}
