import { invoke } from '@tauri-apps/api/core'

export interface MatchItem {
  id: string
  name: string
  purchase_price: number
  idle_days: number
  current_net_value: number | null
  accumulated_depreciation: number | null
}

export interface MatchResult {
  items: MatchItem[]
  total_price: number
  total_depreciation: number
  total_net_value: number
}

export async function findIdleItemsMatch(targetPrice: number): Promise<MatchResult | null> {
  return invoke<MatchResult | null>('find_idle_items_match', { targetPrice })
}
