import { invoke } from '@tauri-apps/api/core'

export interface IdleItem {
  id: string
  name: string
  category_id: string | null
  purchase_price: number | null
  idle_days: number
  silent_cost: number
  idle_depreciation: number
  is_fixed_asset: boolean
}

export interface IdleListResult {
  items: IdleItem[]
  total_silent_cost: number
  total_idle_depreciation: number
}

export interface RegretItem {
  id: string
  name: string
  rating: number | null
  idle_days: number
  regret_score: number
  net_value_ratio: number | null
}

export async function getIdleList(
  thresholdDays?: number,
  onlyFixedAsset?: boolean,
): Promise<IdleListResult> {
  return invoke<IdleListResult>('get_idle_list', {
    thresholdDays: thresholdDays ?? 60,
    onlyFixedAsset: onlyFixedAsset ?? false,
  })
}

export async function getRegretRank(): Promise<RegretItem[]> {
  return invoke<RegretItem[]>('get_regret_rank')
}
