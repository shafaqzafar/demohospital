import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LayoutDashboard, CalendarCheck, Users, Settings as Cog, Sparkles, History, FileText, Boxes, Truck, Receipt, UserCog, ScrollText, Bell } from 'lucide-react'
import { aestheticApi } from '../../utils/api'

type Item = { to: string; label: string; end?: boolean; icon: any }
const nav: Item[] = [
  { to: '/aesthetic', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/aesthetic/token-generator', label: 'Token Generation', icon: CalendarCheck },
  { to: '/aesthetic/token-history', label: 'Token History', icon: History },
  { to: '/aesthetic/procedure-catalog', label: 'Procedure Catalog', icon: Sparkles },
  { to: '/aesthetic/reports', label: 'Reports', icon: FileText },
  { to: '/aesthetic/patients', label: 'Patients', icon: Users },
  { to: '/aesthetic/inventory', label: 'Inventory', icon: Boxes },
  { to: '/aesthetic/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/aesthetic/supplier-returns', label: 'Supplier Returns', icon: FileText },
  { to: '/aesthetic/purchase-history', label: 'Purchase History', icon: History },
  { to: '/aesthetic/return-history', label: 'Return History', icon: History },
  { to: '/aesthetic/expenses', label: 'Expenses', icon: Receipt },
  { to: '/aesthetic/doctor-management', label: 'Doctor Management', icon: Users },
  { to: '/aesthetic/doctor-finance', label: 'Doctor Finance', icon: FileText },
  { to: '/aesthetic/doctor-payouts', label: 'Doctor Payouts', icon: Receipt },
  { to: '/aesthetic/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/aesthetic/user-management', label: 'User Management', icon: UserCog },
  { to: '/aesthetic/notifications', label: 'Notifications', icon: Bell },
  { to: '/aesthetic/consent-templates', label: 'Consent Templates', icon: FileText },
  
  { to: '/aesthetic/settings', label: 'Settings', icon: Cog },
]

export default function Aesthetic_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState<string>('')
  useEffect(()=>{
    try { const raw = localStorage.getItem('aesthetic.session'); if (raw) { const s = JSON.parse(raw||'{}'); setUsername(String(s?.username||'')) } } catch {}
  }, [])
  const logout = async () => {
    try { await aestheticApi.logout() } catch {}
    try {
      localStorage.removeItem('aesthetic.session')
      localStorage.removeItem('aesthetic.token')
      localStorage.removeItem('token')
    } catch {}
    navigate('/aesthetic/login')
  }
  const width = collapsed ? 'md:w-16' : 'md:w-64'
  return (
    <aside
      className={`hidden md:flex ${width} md:flex-col md:border-r md:text-white`}
      style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="h-16 px-4 flex items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        {!collapsed && <div className="font-semibold">Aesthetic</div>}
        <div className={`ml-auto text-xs opacity-80 ${collapsed?'hidden':''}`}>{username || 'user'}</div>
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
        <button onClick={logout} className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.14)' }}>Logout</button>
      </div>
    </aside>
  )
}
