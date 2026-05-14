import { useState, useEffect } from 'react'
import { mockApi, isTauri } from '../api/mock'
import type { MatchResult } from '../api/decide'

interface Wish {
  id: string
  name: string
  expected_price: number | null
  cooling_days: number
  status: string
  created_at: string
}

export default function DecisionPage() {
  const [activeTab, setActiveTab] = useState<'wish' | 'calculator'>('wish')

  // Wish list state
  const [wishes, setWishes] = useState<Wish[]>([])
  const [wishInput, setWishInput] = useState({ name: '', price: '', days: '7' })
  const [loadingWish, setLoadingWish] = useState(true)

  // Calculator state
  const [targetName, setTargetName] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [noMatch, setNoMatch] = useState(false)

  useEffect(() => {
    if (activeTab === 'wish') loadWishes()
  }, [activeTab])

  const loadWishes = () => {
    setLoadingWish(true)
    if (isTauri()) {
      // Tauri: call API
    } else {
      const now = Date.now()
      const mockWishes: Wish[] = [
        { id: 'w1', name: '新耳机 Sony XM6', expected_price: 1999, cooling_days: 7, status: 'COOLING', created_at: new Date(now - 3 * 86400000).toISOString() },
      ]
      setWishes(mockWishes)
    }
    setLoadingWish(false)
  }

  const addWish = () => {
    if (!wishInput.name.trim()) return
    const w: Wish = {
      id: `w-${Date.now()}`,
      name: wishInput.name.trim(),
      expected_price: wishInput.price ? parseFloat(wishInput.price) : null,
      cooling_days: parseInt(wishInput.days) || 7,
      status: 'COOLING',
      created_at: new Date().toISOString(),
    }
    setWishes((prev) => [w, ...prev])
    setWishInput({ name: '', price: '', days: '7' })
  }

  const calcRemaining = (createdAt: string, coolingDays: number): number => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
    return Math.max(0, coolingDays - elapsed)
  }

  const handleMatch = () => {
    setNoMatch(false)
    setMatchResult(null)
    const price = parseFloat(targetPrice)
    if (!price) return

    // Mock matching: find idle items
    const items = mockApi.items.filter((i) => i.status === 'ACTIVE')
    const idleItems = items.filter((i) => {
      const checks = mockApi.checkins[i.id] || []
      const last = checks.length > 0 ? checks[checks.length - 1].check_date : null
      const idleDays = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : 90
      return idleDays >= 30
    })

    // Simple matching: find closest item
    let best: typeof idleItems = []
    let bestTotal = 0

    for (const item of idleItems) {
      const p = item.purchase_price || 0
      if (price > 0 && p >= price * 0.9 && p <= price * 1.1) {
        best = [item]
        bestTotal = p
        break
      }
    }

    if (best.length === 0 && idleItems.length >= 2) {
      for (let i = 0; i < idleItems.length; i++) {
        for (let j = i + 1; j < idleItems.length; j++) {
          const total = (idleItems[i].purchase_price || 0) + (idleItems[j].purchase_price || 0)
          if (total >= price * 0.9 && total <= price * 1.1) {
            best = [idleItems[i], idleItems[j]]
            bestTotal = total
            break
          }
        }
        if (best.length > 0) break
      }
    }

    if (best.length > 0) {
      setMatchResult({
        items: best.map((i) => ({
          id: i.id,
          name: i.name,
          purchase_price: i.purchase_price || 0,
          idle_days: 30,
          current_net_value: i.purchase_price,
          accumulated_depreciation: i.is_fixed_asset ? 300 : null,
        })),
        total_price: bestTotal,
        total_depreciation: best.filter((i) => i.is_fixed_asset).length * 300,
        total_net_value: bestTotal - best.filter((i) => i.is_fixed_asset).length * 300,
      })
    } else {
      setNoMatch(true)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">决策</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {[
          { key: 'wish', label: '愿望清单' },
          { key: 'calculator', label: '不买计算器' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as 'wish' | 'calculator')}
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

      {activeTab === 'wish' && (
        <>
          {/* Add wish form */}
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={wishInput.name}
                onChange={(e) => setWishInput({ ...wishInput, name: e.target.value })}
                placeholder="想买的物品名称"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addWish()}
              />
              <input
                type="number"
                value={wishInput.price}
                onChange={(e) => setWishInput({ ...wishInput, price: e.target.value })}
                placeholder="价格"
                className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <select
                value={wishInput.days}
                onChange={(e) => setWishInput({ ...wishInput, days: e.target.value })}
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
              >
                <option value="3">3天冷静</option>
                <option value="7">7天冷静</option>
                <option value="14">14天冷静</option>
                <option value="30">30天冷静</option>
              </select>
              <button
                onClick={addWish}
                disabled={!wishInput.name.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
              >
                添加愿望
              </button>
            </div>
          </div>

          {/* Wish list */}
          {loadingWish ? (
            <div className="py-16 text-center text-gray-400">加载中...</div>
          ) : wishes.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <span className="mb-4 text-5xl">💝</span>
              <p className="text-sm">愿望清单为空，添加你想买的物品吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wishes.map((w) => {
                const remaining = calcRemaining(w.created_at, w.cooling_days)
                const isCooling = w.status === 'COOLING' && remaining > 0
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{w.name}</h3>
                      {w.expected_price && (
                        <span className="text-sm text-gray-500">
                          预计 ¥{w.expected_price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {isCooling ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                          冷却中 · 剩余 {remaining} 天
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                          待评估
                        </span>
                      )}
                      {!isCooling && (
                        <>
                          <button className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200">
                            购买
                          </button>
                          <button className="rounded-lg bg-red-50 px-3 py-1 text-xs text-red-500 hover:bg-red-100">
                            放弃
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'calculator' && (
        <div>
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">不买计算器</h2>
            <p className="mb-4 text-sm text-gray-400">
              输入你想买的物品信息，系统会从你的闲置物品中找到总价相近的组合，帮你克制冲动消费。
            </p>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="想买的物品名称"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="价格"
                className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleMatch()}
              />
              <button
                onClick={handleMatch}
                disabled={!targetPrice}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
              >
                匹配闲置物品
              </button>
            </div>
          </div>

          {noMatch && (
            <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white py-12">
              <span className="mb-4 text-5xl">🌿</span>
              <p className="text-sm text-gray-500">没有找到匹配的闲置物品组合</p>
              <p className="mt-1 text-xs text-gray-400">这说明你当前拥有的物品都在合理范围内</p>
            </div>
          )}

          {matchResult && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-700">匹配结果</h3>
              <p className="mb-4 text-sm text-gray-500">
                你的闲置物品中，以下组合总价约 ¥{matchResult.total_price.toLocaleString()}，
                与 {targetName || '想买的物品'}（¥{parseFloat(targetPrice).toLocaleString()}）相近：
              </p>
              <div className="space-y-3">
                {matchResult.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      <span className="text-sm text-gray-600">
                        ¥{item.purchase_price.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-gray-400">
                      <span>闲置 {item.idle_days} 天</span>
                      {item.accumulated_depreciation != null && (
                        <span>已折旧 ¥{item.accumulated_depreciation.toLocaleString()}</span>
                      )}
                      {item.current_net_value != null && (
                        <span>净值 ¥{item.current_net_value.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                💡 想想这些闲置物品的投入，也许可以把这笔钱用在更需要的地方
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
