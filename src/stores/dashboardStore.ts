import { create } from 'zustand'

export interface DashboardData {
  total_items: number
  total_value: number
  total_net_value: number
  monthly_depreciation: number
}

interface DashboardState {
  data: DashboardData | null
  viewMode: 'original' | 'net'
  setData: (data: DashboardData) => void
  toggleViewMode: () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  viewMode: 'original',
  setData: (data) => set({ data }),
  toggleViewMode: () =>
    set((s) => ({ viewMode: s.viewMode === 'original' ? 'net' : 'original' })),
}))
