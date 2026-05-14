import { useState, useEffect, useCallback } from 'react'
import ItemCard from '../components/ItemCard'
import ItemFormModal from '../components/ItemFormModal'
import { useItemStore, type Item, type CreateItemInput } from '../stores/itemStore'
import { mockApi, isTauri } from '../api/mock'
import * as api from '../api/items'

export default function InventoryPage() {
  const {
    items, totalCount, filters, sort, viewMode, page, pageSize,
    setItems, setFilter, setSort, setViewMode, setPage,
  } = useItemStore()

  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [searchInput, setSearchInput] = useState('')

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      if (isTauri()) {
        const [data, total] = await api.getItems({
          search: filters.search || undefined,
          category_id: filters.categoryId || undefined,
          space_id: filters.spaceId || undefined,
          status: 'ACTIVE',
          is_fixed_asset: filters.isFixedAsset ?? undefined,
          page,
          page_size: pageSize,
          sort_field: sort.field,
          sort_order: sort.order,
        })
        setItems(data, total)
      } else {
        let data = [...mockApi.items].filter((i) => i.status === 'ACTIVE')
        if (filters.search) {
          data = data.filter((i) => i.name.includes(filters.search!))
        }
        if (filters.isFixedAsset != null) {
          data = data.filter((i) => i.is_fixed_asset === filters.isFixedAsset)
        }
        setItems(data, data.length)
      }
    } catch (e) {
      console.error('Failed to load items:', e)
    }
    setLoading(false)
  }, [filters, sort, page, pageSize, setItems])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleSearch = () => {
    setFilter('search', searchInput)
    setPage(1)
  }

  const handleSave = async (input: CreateItemInput) => {
    try {
      if (isTauri()) {
        if (editItem) {
          await api.updateItem(editItem.id, input)
        } else {
          await api.addItem(input)
        }
      } else {
        if (editItem) {
          const idx = mockApi.items.findIndex((i) => i.id === editItem.id)
          if (idx >= 0) mockApi.items[idx] = { ...mockApi.items[idx], ...input, name: input.name }
        } else {
          mockApi.items.push({
            id: `item-${Date.now()}`,
            name: input.name,
            category_id: null,
            space_id: null,
            purchase_date: input.purchase_date || null,
            purchase_price: input.purchase_price ?? null,
            is_fixed_asset: input.is_fixed_asset ?? false,
            useful_life_years: input.useful_life_years ?? null,
            residual_value: input.residual_value ?? null,
            depreciation_method: input.depreciation_method ?? null,
            status: 'ACTIVE',
            rating: null,
            notes: input.notes || null,
            estimated_value: null,
            warranty_expiry: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      }
      setModalVisible(false)
      setEditItem(null)
      loadItems()
    } catch (e) {
      console.error('Save failed:', e)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">物品库</h1>
        <button
          onClick={() => { setEditItem(null); setModalVisible(true) }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 添加物品
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索物品名称..."
            className="w-64 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200"
          >
            搜索
          </button>
        </div>

        <select
          value={filters.isFixedAsset == null ? '' : String(filters.isFixedAsset)}
          onChange={(e) => {
            const v = e.target.value
            setFilter('isFixedAsset', v === '' ? null : v === 'true')
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">全部类型</option>
          <option value="true">固定资产</option>
          <option value="false">普通物品</option>
        </select>

        <select
          value={sort.field}
          onChange={(e) => setSort(e.target.value, sort.order)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="created_at">添加时间</option>
          <option value="purchase_date">购买日期</option>
          <option value="name">名称</option>
          <option value="purchase_price">价格</option>
        </select>

        <div className="flex rounded-lg border border-gray-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-l-lg px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
          >
            网格
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-r-lg px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
          >
            列表
          </button>
        </div>
      </div>

      {/* Item grid/list */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">加载中...</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <span className="mb-4 text-5xl">📦</span>
          <p className="text-sm">还没有物品，点击上方按钮添加第一件物品吧</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} viewMode="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} viewMode="list" />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="disabled:opacity-30"
          >
            上一页
          </button>
          <span>第 {page} 页 / 共 {Math.ceil(totalCount / pageSize)} 页</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * pageSize >= totalCount}
            className="disabled:opacity-30"
          >
            下一页
          </button>
        </div>
      )}

      <ItemFormModal
        visible={modalVisible}
        item={editItem}
        onSave={handleSave}
        onCancel={() => { setModalVisible(false); setEditItem(null) }}
      />
    </div>
  )
}
