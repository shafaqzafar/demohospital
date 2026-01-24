import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, BarChart3, FlaskConical, LayoutDashboard, Users, Activity, FileText, BookOpen, Receipt, Repeat, CalendarCheck, Scale, Store } from 'lucide-react'
import { hospitalApi } from '../../utils/api'

const nav = [
  { to: '/finance/pharmacy-reports', label: 'Pharmacy Reports', Icon: BarChart3 },
  { to: '/finance/lab-reports', label: 'Lab Reports', Icon: FlaskConical },
  { to: '/finance/diagnostics-dashboard', label: 'Diagnostics Dashboard', Icon: LayoutDashboard },
  { to: '/finance/staff-dashboard', label: 'Staff Dashboard', Icon: Users },
  { to: '/finance/hospital-dashboard', label: 'Hospital Dashboard', Icon: Activity },
  { to: '/finance/vendors', label: 'Vendors', Icon: Store },
  { to: '/finance/trial-balance', label: 'Trial Balance', Icon: FileText },
  { to: '/finance/balance-sheet', label: 'Balance Sheet', Icon: Scale },
  { to: '/finance/ledger', label: 'Ledger', Icon: BookOpen },
  { to: '/finance/vouchers', label: 'Vouchers', Icon: Receipt },
  { to: '/finance/recurring', label: 'Recurring Payments', Icon: Repeat },
  { to: '/finance/combined', label: 'Combined Summary', Icon: Activity },
  { to: '/finance/business-day', label: 'Day Open/Close', Icon: CalendarCheck },
  { to: '/finance/liabilities', label: 'Liabilities', Icon: Scale },
]

export default function Finance_Sidebar({ collapsed = false }: { collapsed?: boolean }){
  const navigate = useNavigate()
  const width = collapsed ? 'md:w-16' : 'md:w-64'
  async function logout(){
    try {
      const raw = localStorage.getItem('finance.session')
      const u = raw ? JSON.parse(raw) : null
      await hospitalApi.logoutHospitalUser(u?.username||'finance')
    } catch {}
    try { localStorage.removeItem('finance.session') } catch {}
    navigate('/finance/login')
  }
  return (
    <aside
      className={`hidden md:flex ${width} md:flex-col md:border-r md:text-white`}
      style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="h-16 px-4 flex items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        {!collapsed && <div className="font-semibold">Finance</div>}
        <div className={`ml-auto text-xs opacity-80 ${collapsed?'hidden':''}`}>accounts</div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map(item => {
          const Icon = item.Icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
      <div className="p-3">
        <button onClick={logout} className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.14)' }}>
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </aside>
  )
}
