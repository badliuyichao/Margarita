import { NavLink } from 'react-router-dom'
import { useUiStore } from '../stores/uiStore'

const navItems = [
  { path: '/', label: '仪表盘' },
  { path: '/inventory', label: '物品库' },
  { path: '/insights', label: '洞察' },
  { path: '/decide', label: '决策' },
  { path: '/settings', label: '设置' },
]

export default function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)

  return (
    <aside
      className={`flex flex-col border-r border-gray-200 bg-white transition-width ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && <span className="font-semibold text-gray-800">藏珠</span>}
        <button
          onClick={toggle}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="text-lg">
              {item.path === '/' && '📊'}
              {item.path === '/inventory' && '📦'}
              {item.path === '/insights' && '🔍'}
              {item.path === '/decide' && '💡'}
              {item.path === '/settings' && '⚙️'}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
