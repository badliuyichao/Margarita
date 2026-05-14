import { invoke } from '@tauri-apps/api/core'

export interface DashboardData {
  total_items: number
  total_value: number
  total_net_value: number
  monthly_depreciation: number
}

export async function getDashboardData(): Promise<DashboardData> {
  return invoke<DashboardData>('get_dashboard_data')
}
