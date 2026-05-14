import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState'
import ItemCard from '../components/ItemCard'
import type { Item } from '../stores/itemStore'

const mockItem: Item = {
  id: 'test-1',
  name: '测试物品',
  category_id: null,
  space_id: null,
  purchase_date: '2025-01-01',
  purchase_price: 1000,
  warranty_expiry: null,
  is_fixed_asset: true,
  useful_life_years: 5,
  residual_value: 100,
  depreciation_method: 'LINEAR',
  status: 'ACTIVE',
  rating: 4,
  notes: null,
  estimated_value: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

describe('EmptyState', () => {
  it('renders default message', () => {
    render(<EmptyState />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('renders custom message', () => {
    render(<EmptyState message="自定义提示" />)
    expect(screen.getByText('自定义提示')).toBeInTheDocument()
  })
})

describe('ItemCard', () => {
  it('renders item name in grid view', () => {
    render(
      <MemoryRouter>
        <ItemCard item={mockItem} viewMode="grid" />
      </MemoryRouter>,
    )
    expect(screen.getByText('测试物品')).toBeInTheDocument()
  })

  it('renders item name in list view', () => {
    render(
      <MemoryRouter>
        <ItemCard item={mockItem} viewMode="list" />
      </MemoryRouter>,
    )
    expect(screen.getByText('测试物品')).toBeInTheDocument()
  })

  it('shows fixed asset badge for fixed assets', () => {
    render(
      <MemoryRouter>
        <ItemCard item={mockItem} viewMode="grid" />
      </MemoryRouter>,
    )
    expect(screen.getByText('固资')).toBeInTheDocument()
  })

  it('shows retired badge for retired items', () => {
    const retired = { ...mockItem, status: 'RETIRED' }
    render(
      <MemoryRouter>
        <ItemCard item={retired} viewMode="list" />
      </MemoryRouter>,
    )
    expect(screen.getByText('已退役')).toBeInTheDocument()
  })
})
