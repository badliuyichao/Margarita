import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ItemFormModal from '../components/ItemFormModal'
import CalendarHeatmap from '../components/CalendarHeatmap'
import Timeline from '../components/Timeline'
import type { ItemEvent } from '../api/items'

// Mock stores
vi.mock('../stores/uiStore', () => ({
  useUiStore: vi.fn((selector) => {
    const state = {
      language: 'zh-CN',
      languageReady: true,
      sidebarCollapsed: false,
      setLanguage: vi.fn(),
      toggleSidebar: vi.fn(),
    }
    return selector ? selector(state) : state
  }),
}))

describe('Sidebar', () => {
  it('renders all navigation items', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
    expect(screen.getByText('仪表盘')).toBeInTheDocument()
    expect(screen.getByText('物品库')).toBeInTheDocument()
    expect(screen.getByText('洞察')).toBeInTheDocument()
    expect(screen.getByText('决策')).toBeInTheDocument()
    expect(screen.getByText('设置')).toBeInTheDocument()
  })

  it('highlights active route', () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <Sidebar />
      </MemoryRouter>,
    )
    const link = screen.getByText('物品库').closest('a')
    expect(link?.className).toContain('bg-blue-50')
  })
})

describe('ItemFormModal', () => {
  const mockSave = vi.fn()
  const mockCancel = vi.fn()

  beforeEach(() => {
    mockSave.mockClear()
    mockCancel.mockClear()
  })

  it('renders form when visible', () => {
    render(
      <ItemFormModal visible={true} onSave={mockSave} onCancel={mockCancel} />,
    )
    expect(screen.getByText('添加物品')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('物品名称')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(
      <ItemFormModal visible={false} onSave={mockSave} onCancel={mockCancel} />,
    )
    expect(screen.queryByText('添加物品')).not.toBeInTheDocument()
  })

  it('save button disabled when name is empty', () => {
    render(
      <ItemFormModal visible={true} onSave={mockSave} onCancel={mockCancel} />,
    )
    expect(screen.getByText('保存').closest('button')).toBeDisabled()
  })

  it('enables save when name is entered', async () => {
    render(
      <ItemFormModal visible={true} onSave={mockSave} onCancel={mockCancel} />,
    )
    const nameInput = screen.getByPlaceholderText('物品名称')
    await userEvent.type(nameInput, '测试物品')
    expect(screen.getByText('保存').closest('button')).not.toBeDisabled()
  })

  it('shows fixed asset fields when toggled', async () => {
    render(
      <ItemFormModal visible={true} onSave={mockSave} onCancel={mockCancel} />,
    )
    expect(screen.queryByText('使用年限')).not.toBeInTheDocument()

    const checkbox = screen.getByText('作为固定资产管理')
    await userEvent.click(checkbox)

    expect(screen.getByText('使用年限')).toBeInTheDocument()
    expect(screen.getByText('残值')).toBeInTheDocument()
    expect(screen.getByText('折旧方法')).toBeInTheDocument()
  })

  it('calls onSave with form data', async () => {
    render(
      <ItemFormModal visible={true} onSave={mockSave} onCancel={mockCancel} />,
    )
    await userEvent.type(screen.getByPlaceholderText('物品名称'), '新物品')
    await userEvent.type(screen.getByPlaceholderText('0.00'), '100')
    await userEvent.click(screen.getByText('保存'))

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '新物品',
        purchase_price: 100,
      }),
    )
  })

  it('calls onCancel when cancel is clicked', async () => {
    render(
      <ItemFormModal visible={true} onSave={mockSave} onCancel={mockCancel} />,
    )
    await userEvent.click(screen.getByText('取消'))
    expect(mockCancel).toHaveBeenCalled()
  })
})

describe('CalendarHeatmap', () => {
  it('shows today checked state', () => {
    const today = new Date().toISOString().slice(0, 10)
    render(
      <CalendarHeatmap
        checkDates={[today]}
        onCheckIn={vi.fn()}
        todayChecked={true}
      />,
    )
    expect(screen.getByText('今日已打卡')).toBeInTheDocument()
    expect(screen.getByText('今日已打卡').closest('button')).toBeDisabled()
  })

  it('shows check-in button when not checked', () => {
    render(
      <CalendarHeatmap
        checkDates={[]}
        onCheckIn={vi.fn()}
        todayChecked={false}
      />,
    )
    expect(screen.getByText('今日打卡')).toBeInTheDocument()
    expect(screen.getByText('今日打卡').closest('button')).not.toBeDisabled()
  })

  it('calls onCheckIn when button clicked', async () => {
    const mockCheckIn = vi.fn()
    render(
      <CalendarHeatmap
        checkDates={[]}
        onCheckIn={mockCheckIn}
        todayChecked={false}
      />,
    )
    await userEvent.click(screen.getByText('今日打卡'))
    expect(mockCheckIn).toHaveBeenCalled()
  })
})

describe('Timeline', () => {
  const mockEvents: ItemEvent[] = [
    {
      id: 'ev1',
      item_id: 'item-1',
      event_type: 'maintenance',
      description: '更换电池',
      amount: 99,
      occurred_at: '2026-01-15',
      created_at: '2026-01-15T00:00:00Z',
    },
    {
      id: 'ev2',
      item_id: 'item-1',
      event_type: 'repair',
      description: '屏幕维修',
      amount: 500,
      occurred_at: '2025-12-01',
      created_at: '2025-12-01T00:00:00Z',
    },
  ]

  it('renders events in timeline', () => {
    render(<Timeline events={mockEvents} onAddEvent={vi.fn()} />)
    expect(screen.getByText('更换电池')).toBeInTheDocument()
    expect(screen.getByText('屏幕维修')).toBeInTheDocument()
  })

  it('shows empty state when no events', () => {
    render(<Timeline events={[]} onAddEvent={vi.fn()} />)
    expect(screen.getByText('暂无事件记录')).toBeInTheDocument()
  })

  it('calls onAddEvent when add button clicked', async () => {
    const mockAdd = vi.fn()
    render(<Timeline events={mockEvents} onAddEvent={mockAdd} />)
    await userEvent.click(screen.getByText('+ 添加事件'))
    expect(mockAdd).toHaveBeenCalled()
  })

  it('displays event amounts', () => {
    render(<Timeline events={mockEvents} onAddEvent={vi.fn()} />)
    expect(screen.getByText('¥99')).toBeInTheDocument()
    expect(screen.getByText('¥500')).toBeInTheDocument()
  })
})
