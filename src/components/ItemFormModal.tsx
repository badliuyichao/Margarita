import { useState, useEffect } from 'react'
import type { Item, CreateItemInput } from '../stores/itemStore'

interface ItemFormModalProps {
  visible: boolean
  item?: Item | null
  onSave: (input: CreateItemInput) => void
  onCancel: () => void
}

export default function ItemFormModal({ visible, item, onSave, onCancel }: ItemFormModalProps) {
  const [name, setName] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isFixedAsset, setIsFixedAsset] = useState(false)
  const [usefulLife, setUsefulLife] = useState('5')
  const [residualValue, setResidualValue] = useState('0')
  const [depreciationMethod, setDepreciationMethod] = useState('LINEAR')

  useEffect(() => {
    if (item) {
      setName(item.name)
      setPurchasePrice(item.purchase_price != null ? String(item.purchase_price) : '')
      setPurchaseDate(item.purchase_date || '')
      setNotes(item.notes || '')
      setIsFixedAsset(item.is_fixed_asset)
      setUsefulLife(item.useful_life_years != null ? String(item.useful_life_years) : '5')
      setResidualValue(item.residual_value != null ? String(item.residual_value) : '0')
      setDepreciationMethod(item.depreciation_method || 'LINEAR')
    } else {
      reset()
    }
  }, [item, visible])

  const reset = () => {
    setName('')
    setPurchasePrice('')
    setPurchaseDate('')
    setNotes('')
    setIsFixedAsset(false)
    setUsefulLife('5')
    setResidualValue('0')
    setDepreciationMethod('LINEAR')
  }

  if (!visible) return null

  const price = purchasePrice ? parseFloat(purchasePrice) : undefined
  const residual = residualValue ? parseFloat(residualValue) : undefined

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      purchase_price: price,
      purchase_date: purchaseDate || undefined,
      notes: notes || undefined,
      is_fixed_asset: isFixedAsset,
      useful_life_years: isFixedAsset ? parseInt(usefulLife) : undefined,
      residual_value: isFixedAsset ? residual : undefined,
      depreciation_method: isFixedAsset ? depreciationMethod : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          {item ? '编辑物品' : '添加物品'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="物品名称"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">购买价格</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                min="0"
                max="99999999"
                step="0.01"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">购买日期</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                min="1900-01-01"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">备注</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="备注信息"
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isFixedAsset}
                onChange={(e) => setIsFixedAsset(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">作为固定资产管理</span>
            </label>

            {isFixedAsset && (
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">使用年限</label>
                  <input
                    type="number"
                    value={usefulLife}
                    onChange={(e) => setUsefulLife(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">残值</label>
                  <input
                    type="number"
                    value={residualValue}
                    onChange={(e) => setResidualValue(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">折旧方法</label>
                  <select
                    value={depreciationMethod}
                    onChange={(e) => setDepreciationMethod(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <option value="LINEAR">直线折旧法</option>
                    <option value="ACCELERATED">加速折旧法</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => { reset(); onCancel() }}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
