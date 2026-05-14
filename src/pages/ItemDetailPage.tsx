import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CalendarHeatmap from '../components/CalendarHeatmap'
import Timeline from '../components/Timeline'
import ItemFormModal from '../components/ItemFormModal'
import { type Item, type CreateItemInput } from '../stores/itemStore'
import { mockApi, isTauri } from '../api/mock'
import * as api from '../api/items'
import type { ItemEvent } from '../api/items'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [checkDates, setCheckDates] = useState<string[]>([])
  const [events, setEvents] = useState<ItemEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [editVisible, setEditVisible] = useState(false)
  const [eventFormVisible, setEventFormVisible] = useState(false)
  const [eventDesc, setEventDesc] = useState('')
  const [eventAmount, setEventAmount] = useState('')

  useEffect(() => {
    if (!id) return
    loadItem()
  }, [id])

  const loadItem = async () => {
    if (!id) return
    setLoading(true)
    try {
      if (isTauri()) {
        const [itemData, checkins, eventData] = await Promise.all([
          api.getItem(id),
          api.getCheckins(id),
          api.getEvents(id),
        ])
        setItem(itemData)
        setCheckDates(checkins.map((c) => c.check_date))
        setEvents(eventData)
      } else {
        const found = mockApi.items.find((i) => i.id === id)
        setItem(found || null)
        setCheckDates((mockApi.checkins[id] || []).map((c) => c.check_date))
        setEvents(mockApi.events[id] || [])
      }
    } catch (e) {
      console.error('Failed to load item:', e)
    }
    setLoading(false)
  }

  const handleCheckIn = async () => {
    if (!id) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      if (isTauri()) {
        await api.checkIn(id, today)
      } else {
        if (!mockApi.checkins[id]) mockApi.checkins[id] = []
        mockApi.checkins[id].push({ id: `ci-${Date.now()}`, item_id: id, check_date: today })
      }
      setCheckDates((prev) => [...prev, today])
    } catch (e) {
      console.error('Check-in failed:', e)
    }
  }

  const handleAddEvent = async () => {
    if (!id || !eventDesc.trim()) return
    try {
      if (isTauri()) {
        const ev = await api.addEvent({
          item_id: id,
          event_type: 'other',
          description: eventDesc.trim(),
          amount: eventAmount ? parseFloat(eventAmount) : undefined,
          occurred_at: new Date().toISOString().slice(0, 10),
        })
        setEvents((prev) => [ev, ...prev])
      } else {
        const ev: ItemEvent = {
          id: `ev-${Date.now()}`,
          item_id: id,
          event_type: 'other',
          description: eventDesc.trim(),
          amount: eventAmount ? parseFloat(eventAmount) : null,
          occurred_at: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
        }
        if (!mockApi.events[id]) mockApi.events[id] = []
        mockApi.events[id].push(ev)
        setEvents((prev) => [ev, ...prev])
      }
      setEventFormVisible(false)
      setEventDesc('')
      setEventAmount('')
    } catch (e) {
      console.error('Add event failed:', e)
    }
  }

  const handleRetire = async () => {
    if (!id || !item) return
    const action = item.status === 'ACTIVE' ? '退役' : '恢复'
    if (!confirm(`确定将此物品${action}？`)) return
    try {
      const newStatus = item.status === 'ACTIVE' ? 'RETIRED' : 'ACTIVE'
      if (isTauri()) {
        const updated = await api.setItemStatus(id, newStatus)
        setItem(updated)
      } else {
        const found = mockApi.items.find((i) => i.id === id)
        if (found) found.status = newStatus
        setItem({ ...item, status: newStatus })
      }
    } catch (e) {
      console.error('Status change failed:', e)
    }
  }

  const handleDelete = async () => {
    if (!id || !item) return
    if (!confirm(`确定删除"${item.name}"？此操作不可撤销。`)) return
    try {
      if (isTauri()) {
        await api.deleteItem(id)
      } else {
        mockApi.items = mockApi.items.filter((i) => i.id !== id)
      }
      navigate('/inventory')
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  const handleUpdate = async (input: CreateItemInput) => {
    if (!id) return
    try {
      if (isTauri()) {
        const updated = await api.updateItem(id, input)
        setItem(updated)
      } else {
        const found = mockApi.items.find((i) => i.id === id)
        if (found) Object.assign(found, input, { name: input.name })
        setItem((prev) => prev ? { ...prev, ...input, name: input.name } : prev)
      }
      setEditVisible(false)
    } catch (e) {
      console.error('Update failed:', e)
    }
  }

  const todayChecked = checkDates.includes(new Date().toISOString().slice(0, 10))

  const daysOwned = item?.purchase_date
    ? Math.floor((Date.now() - new Date(item.purchase_date).getTime()) / 86400000)
    : null

  const dailyCost =
    daysOwned && item?.purchase_price ? item.purchase_price / daysOwned : null

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">加载中...</div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="mb-4 text-5xl">🔍</span>
        <p className="text-sm">物品未找到</p>
        <button
          onClick={() => navigate('/inventory')}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          返回物品列表
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/inventory')}
        className="mb-4 text-sm text-gray-500 hover:text-gray-700"
      >
        ← 返回列表
      </button>

      {/* Basic info */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
            {item.purchase_date && (
              <span className="text-sm text-gray-400">
                购入 {item.purchase_date} · 陪伴 {daysOwned} 天
              </span>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              item.status === 'RETIRED'
                ? 'bg-gray-100 text-gray-500'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {item.status === 'RETIRED' ? '已退役' : '活跃'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">购买价格</span>
            <p className="font-medium text-gray-800">
              {item.purchase_price != null ? `¥${item.purchase_price.toLocaleString()}` : '未记录'}
            </p>
          </div>
          {dailyCost != null && (
            <div>
              <span className="text-gray-400">日均成本</span>
              <p className="font-medium text-gray-800">¥{dailyCost.toFixed(2)}</p>
            </div>
          )}
          {item.is_fixed_asset && (
            <>
              <div>
                <span className="text-gray-400">使用年限</span>
                <p className="font-medium text-gray-800">{item.useful_life_years} 年</p>
              </div>
              <div>
                <span className="text-gray-400">残值</span>
                <p className="font-medium text-gray-800">
                  ¥{(item.residual_value || 0).toLocaleString()}
                </p>
              </div>
            </>
          )}
          {item.notes && (
            <div className="col-span-2">
              <span className="text-gray-400">备注</span>
              <p className="text-gray-600">{item.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Check-in heatmap */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <CalendarHeatmap
          checkDates={checkDates}
          onCheckIn={handleCheckIn}
          todayChecked={todayChecked}
        />
      </div>

      {/* Timeline */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <Timeline events={events} onAddEvent={() => setEventFormVisible(true)} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setEditVisible(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          编辑
        </button>
        <button
          onClick={handleRetire}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {item.status === 'ACTIVE' ? '退役' : '恢复'}
        </button>
        <button
          onClick={handleDelete}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
        >
          删除
        </button>
      </div>

      {/* Edit modal */}
      <ItemFormModal
        visible={editVisible}
        item={item}
        onSave={handleUpdate}
        onCancel={() => setEditVisible(false)}
      />

      {/* Event form modal */}
      {eventFormVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">添加事件</h3>
            <input
              type="text"
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              placeholder="事件描述"
              className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              autoFocus
            />
            <input
              type="number"
              value={eventAmount}
              onChange={(e) => setEventAmount(e.target.value)}
              placeholder="金额（可选）"
              min="0"
              className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEventFormVisible(false)}
                className="rounded-lg px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleAddEvent}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
