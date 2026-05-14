import { createMemoryRouter } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import ItemDetailPage from './pages/ItemDetailPage'
import InsightsPage from './pages/InsightsPage'
import DecisionPage from './pages/DecisionPage'
import SettingsPage from './pages/SettingsPage'

export const router = createMemoryRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'inventory/:id', element: <ItemDetailPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'insights/regret', element: <InsightsPage /> },
      { path: 'decide', element: <DecisionPage /> },
      { path: 'decide/calculator', element: <DecisionPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
