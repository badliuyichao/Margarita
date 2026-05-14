import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../components/Layout'

describe('Layout', () => {
  it('renders sidebar navigation', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    )
    expect(screen.getByText('仪表盘')).toBeInTheDocument()
    expect(screen.getByText('物品库')).toBeInTheDocument()
  })
})
