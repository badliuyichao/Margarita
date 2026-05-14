import { useNavigate } from 'react-router-dom'
import type { Item } from '../stores/itemStore'

interface ItemCardProps {
  item: Item
  viewMode: 'grid' | 'list'
}

export default function ItemCard({ item, viewMode }: ItemCardProps) {
  const navigate = useNavigate()
  const daysOwned = item.purchase_date
    ? Math.floor((Date.now() - new Date(item.purchase_date).getTime()) / 86400000)
    : null
  const dailyCost =
    daysOwned && item.purchase_price ? (item.purchase_price / daysOwned).toFixed(2) : null

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => navigate(`/inventory/${item.id}`)}
        className="flex cursor-pointer items-center gap-4 rounded-lg border border-gray-100 bg-white p-3 transition-shadow hover:shadow-sm"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl">
          📦
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-gray-900">{item.name}</h3>
          <span className="text-xs text-gray-400">
            {item.purchase_date ? `购入 ${item.purchase_date}` : '未记录购买日期'}
          </span>
        </div>
        {dailyCost && (
          <span className="text-xs text-gray-500">日均 ¥{dailyCost}</span>
        )}
        {item.is_fixed_asset && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            固定资产
          </span>
        )}
        {item.status === 'RETIRED' && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            已退役
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => navigate(`/inventory/${item.id}`)}
      className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-gray-50 text-4xl">
        📦
      </div>
      <h3 className="truncate text-sm font-medium text-gray-900">{item.name}</h3>
      <div className="mt-1 flex items-center gap-2">
        {item.purchase_price != null && (
          <span className="text-xs font-medium text-gray-700">
            ¥{item.purchase_price.toLocaleString()}
          </span>
        )}
        {item.is_fixed_asset && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
            固资
          </span>
        )}
        {item.status === 'RETIRED' && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
            退役
          </span>
        )}
      </div>
    </div>
  )
}
