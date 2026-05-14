import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { mockApi, isTauri } from '../api/mock'
import * as api from '../api/insights'
import type { IdleItem, RegretItem } from '../api/insights'

export default function InsightsPage() {
  const { pathname } = useLocation()
  const isRegret = pathname.includes('regret')
  const [activeTab, setActiveTab] = useState<'idle' | 'regret'>(
    isRegret ? 'regret' : 'idle',
  )

  // Idle list state
  const [idleItems, setIdleItems] = useState<IdleItem[]>([])
  const [threshold, setThreshold] = useState(60)
  const [onlyFA, setOnlyFA] = useState(false)
  const [totalSilent, setTotalSilent] = useState(0)
  const [totalDep, setTotalDep] = useState(0)
  const [loadingIdle, setLoadingIdle] = useState(true)

  // Regret rank state
  const [regretItems, setRegretItems] = useState<RegretItem[]>([])
  const [loadingRegret, setLoadingRegret] = useState(true)

  useEffect(() => {
    if (activeTab === 'idle') loadIdleList()
    else loadRegretRank()
  }, [activeTab, threshold, onlyFA])

  const loadIdleList = async () => {
    setLoadingIdle(true)
    try {
      if (isTauri()) {
        const result = await api.getIdleList(threshold, onlyFA)
        setIdleItems(result.items)
        setTotalSilent(result.total_silent_cost)
        setTotalDep(result.total_idle_depreciation)
      } else {
        const items = mockApi.items.filter((i) => i.status === 'ACTIVE')
        const result: IdleItem[] = []
        for (const item of items) {
          const checkins = mockApi.checkins[item.id] || []
          const lastDate = checkins.length > 0 ? checkins[checkins.length - 1].check_date : null
          const idleDays = lastDate
            ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
            : 90
          if (idleDays >= threshold && (!onlyFA || item.is_fixed_asset)) {
            result.push({
              id: item.id,
              name: item.name,
              category_id: null,
              purchase_price: item.purchase_price,
              idle_days: idleDays,
              silent_cost: (item.purchase_price || 0) + (item.notes?.includes('维护') ? 200 : 0),
              idle_depreciation: item.is_fixed_asset ? idleDays * 2 : 0,
              is_fixed_asset: item.is_fixed_asset,
            })
          }
        }
        result.sort((a, b) => b.idle_days - a.idle_days)
        setIdleItems(result)
        setTotalSilent(result.reduce((s, i) => s + i.silent_cost, 0))
        setTotalDep(result.reduce((s, i) => s + i.idle_depreciation, 0))
      }
    } catch (e) {
      console.error('Idle list load failed:', e)
    }
    setLoadingIdle(false)
  }

  const loadRegretRank = async () => {
    setLoadingRegret(true)
    try {
      if (isTauri()) {
        setRegretItems(await api.getRegretRank())
      } else {
        const items = mockApi.items.filter((i) => i.status === 'ACTIVE' && i.rating)
        const result: RegretItem[] = items.map((item) => {
          const checkins = mockApi.checkins[item.id] || []
          const lastDate = checkins.length > 0 ? checkins[checkins.length - 1].check_date : null
          const idleDays = lastDate
            ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
            : 90
          const ratingN = (5 - (item.rating || 3)) / 4
          const idleN = Math.min(idleDays, 365) / 365
          const score = (ratingN * 0.3 + idleN * 0.4 + 0.3) * 100
          return {
            id: item.id,
            name: item.name,
            rating: item.rating,
            idle_days: idleDays,
            regret_score: Math.round(score * 100) / 100,
            net_value_ratio: null,
          }
        })
        result.sort((a, b) => b.regret_score - a.regret_score)
        setRegretItems(result)
      }
    } catch (e) {
      console.error('Regret rank load failed:', e)
    }
    setLoadingRegret(false)
  }

  const exportCSV = () => {
    const header = '名称,闲置天数,沉默成本(元),闲置折旧(元),固定资产\n'
    const rows = idleItems
      .map((i) => `${i.name},${i.idle_days},${i.silent_cost},${i.idle_depreciation},${i.is_fixed_asset ? '是' : '否'}`)
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '闲置清单.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">洞察</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {[
          { key: 'idle', label: '闲置清单' },
          { key: 'regret', label: '后悔榜' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as 'idle' | 'regret')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'idle' && (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              闲置天数 ≥
              <select
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
              >
                <option value="30">30天</option>
                <option value="60">60天</option>
                <option value="90">90天</option>
                <option value="180">180天</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={onlyFA}
                onChange={(e) => setOnlyFA(e.target.checked)}
                className="rounded"
              />
              仅看固定资产
            </label>
            <button
              onClick={exportCSV}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
            >
              导出 CSV
            </button>
          </div>

          {/* Summary */}
          <div className="mb-4 flex gap-6 text-sm text-gray-500">
            <span>闲置物品：{idleItems.length} 件</span>
            <span>沉默成本合计：¥{totalSilent.toLocaleString()}</span>
            <span>闲置期间折旧：¥{totalDep.toLocaleString()}</span>
          </div>

          {/* List */}
          {loadingIdle ? (
            <div className="py-16 text-center text-gray-400">加载中...</div>
          ) : idleItems.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <span className="mb-4 text-5xl">🎉</span>
              <p className="text-sm">很棒！没有闲置超过 {threshold} 天的物品</p>
            </div>
          ) : (
            <div className="space-y-2">
              {idleItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{item.name}</h3>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-gray-500">闲置 <strong>{item.idle_days}</strong> 天</span>
                    <span className="text-gray-500">沉默成本 <strong>¥{item.silent_cost.toLocaleString()}</strong></span>
                    {item.is_fixed_asset && item.idle_depreciation > 0 && (
                      <span className="text-amber-600">
                        折旧 ¥{item.idle_depreciation.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'regret' && (
        <>
          {loadingRegret ? (
            <div className="py-16 text-center text-gray-400">加载中...</div>
          ) : regretItems.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <span className="mb-4 text-5xl">⭐</span>
              <p className="text-sm">还没有已评分的物品，去物品详情页给物品打分吧</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {regretItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-100 bg-white p-4"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-gray-800">{item.name}</h3>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">
                      后悔指数 {item.regret_score.toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-gray-400">
                    <span>
                      评分 {'★'.repeat(item.rating || 0)}{'☆'.repeat(5 - (item.rating || 0))}
                    </span>
                    <span>闲置 {item.idle_days} 天</span>
                    {item.net_value_ratio != null && (
                      <span>净值率 {(item.net_value_ratio * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
