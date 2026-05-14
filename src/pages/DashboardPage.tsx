import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardStore } from '../stores/dashboardStore'
import { mockApi, isTauri } from '../api/mock'
import * as api from '../api/dashboard'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, viewMode, setData, toggleViewMode } = useDashboardStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      if (isTauri()) {
        setData(await api.getDashboardData())
      } else {
        const items = mockApi.items.filter((i) => i.status === 'ACTIVE')
        const total = items.length
        const totalValue = items.reduce((s, i) => s + (i.purchase_price || 0), 0)
        const faItems = items.filter((i) => i.is_fixed_asset && i.purchase_price)
        let netValue = totalValue
        let monthlyDep = 0
        for (const item of faItems) {
          if (item.purchase_price && item.useful_life_years) {
            const residual = item.residual_value || 0
            const life = item.useful_life_years
            const dailyDep = (item.purchase_price - residual) / (life * 365)
            const daysSince = item.purchase_date
              ? Math.min(
                  Math.floor((Date.now() - new Date(item.purchase_date).getTime()) / 86400000),
                  life * 365,
                )
              : 0
            const totalDep = dailyDep * daysSince
            netValue -= totalDep
            monthlyDep += dailyDep * 30
          }
        }
        setData({
          total_items: total,
          total_value: totalValue,
          total_net_value: Math.max(0, netValue),
          monthly_depreciation: monthlyDep,
        })
      }
    } catch (e) {
      console.error('Dashboard load failed:', e)
    }
    setLoading(false)
  }

  const displayValue = viewMode === 'original' ? data?.total_value : data?.total_net_value

  const stats = [
    { label: '物品总数', value: data?.total_items ?? 0, unit: '件', color: 'text-blue-600' },
    { label: viewMode === 'original' ? '资产总值' : '资产净值',
      value: displayValue ?? 0, unit: '元', color: 'text-green-600', isCurrency: true },
    { label: '本月折旧', value: data?.monthly_depreciation ?? 0, unit: '元', color: 'text-amber-600', isCurrency: true },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">加载中...</div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>
        <button
          onClick={toggleViewMode}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          切换{viewMode === 'original' ? '净值' : '原值'}视角
        </button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-6">
            <span className="text-sm text-gray-400">{s.label}</span>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>
              {s.isCurrency ? '¥' : ''}{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">快捷入口</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: '全部物品', path: '/inventory', icon: '📦' },
            { label: '闲置清单', path: '/insights', icon: '⏳' },
            { label: '愿望清单', path: '/decide', icon: '💝' },
            { label: '不买计算器', path: '/decide/calculator', icon: '🧮' },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <span className="text-3xl">{item.icon}</span>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State for new users */}
      {data && data.total_items === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white py-16">
          <span className="mb-4 text-5xl">👋</span>
          <p className="mb-2 text-lg font-medium text-gray-700">欢迎使用藏珠</p>
          <p className="mb-6 text-sm text-gray-400">添加第一件物品，开始你的资产盘点之旅</p>
          <button
            onClick={() => navigate('/inventory')}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
          >
            添加第一件物品
          </button>
        </div>
      )}
    </div>
  )
}
