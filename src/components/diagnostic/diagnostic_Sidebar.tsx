import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ListChecks, FlaskConical, FileText, BarChart3, ScrollText, LogOut, Settings as Cog, Ticket, UserCog } from 'lucide-react'
import { diagnosticApi } from '../../utils/api'

type Item = { to: string; label: string; end?: boolean; icon: any }
const nav: Item[] = [
  { to: '/diagnostic', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/diagnostic/token-generator', label: 'Token Generator', icon: Ticket },
  { to: '/diagnostic/tests', label: 'Tests', icon: FlaskConical },
  { to: '/diagnostic/sample-tracking', label: 'Sample Tracking', icon: ListChecks },
  { to: '/diagnostic/result-entry', label: 'Result Entry', icon: FileText },
  { to: '/diagnostic/report-generator', label: 'Report Generator', icon: BarChart3 },
  { to: '/diagnostic/referrals', label: 'Referrals', icon: ListChecks },
  { to: '/diagnostic/user-management', label: 'User Management', icon: UserCog },
  { to: '/diagnostic/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/diagnostic/settings', label: 'Settings', icon: Cog },
]

export default function Diagnostic_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const width = collapsed ? 'md:w-16' : 'md:w-64'
  return (
    <aside
      className={`hidden md:flex ${width} md:flex-col md:border-r md:text-white`}
      style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="h-16 px-4 flex items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        {!collapsed && <div className="font-semibold">SideBar</div>}
        <div className={`ml-auto text-xs opacity-80 ${collapsed?'hidden':''}`}>admin</div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium flex items-center ${collapsed?'justify-center gap-0':'gap-2'} ${isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'}`}
              end={item.end}
            >
              <Icon className="h-4 w-4" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
      <div className="p-3">
        <button onClick={async () => { try { await diagnosticApi.logout() } catch {} try { localStorage.removeItem('token'); localStorage.removeItem('diagnostic.user') } catch {} navigate('/diagnostic/login') }} className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.14)' }}>
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </aside>
  )
}
