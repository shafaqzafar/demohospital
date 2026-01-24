import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Ticket, ListChecks, Calculator } from 'lucide-react'
import { hospitalApi } from '../../utils/api'

type Item = { to: string; label: string; icon: any; end?: boolean }

export default function Reception_Sidebar({ collapsed = false }: { collapsed?: boolean }){
  const navigate = useNavigate()
  const width = collapsed ? 'md:w-16' : 'md:w-64'
  const items: Item[] = [
    { to: '/reception/token-generator', label: 'Token Generator', icon: Ticket },
    { to: "/reception/today-tokens", label: "Today's Tokens", icon: ListChecks },
    { to: '/reception/ipd-billing', label: 'IPD Billing', icon: Ticket },
    { to: '/reception/ipd-transactions', label: 'Recent IPD Payments', icon: ListChecks },
    { to: '/reception/diagnostic/token-generator', label: 'Diagnostic Token Generator', icon: Ticket },
    { to: '/reception/diagnostic/sample-tracking', label: 'Diagnostic Sample Tracking', icon: ListChecks },
    { to: '/reception/lab/sample-intake', label: 'Lab Sample Intake', icon: Ticket },
    { to: '/reception/lab/sample-tracking', label: 'Lab Sample Tracking', icon: ListChecks },
    { to: '/reception/lab/manager-cash-count', label: ' Manager Cash Count', icon: Calculator },
  ]
  async function logout(){
    try {
      const raw = localStorage.getItem('reception.session')
      const u = raw ? JSON.parse(raw) : null
      await hospitalApi.logoutHospitalUser(u?.username||'reception')
    } catch {}
    try { localStorage.removeItem('reception.session') } catch {}
    navigate('/reception/login')
  }
  return (
    <aside
      className={`hidden md:flex ${width} md:flex-col md:border-r md:text-white`}
      style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="h-16 px-4 flex items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        {!collapsed && <div className="font-semibold">Reception</div>}
        <div className={`ml-auto text-xs opacity-80 ${collapsed?'hidden':''}`}>front desk</div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((it)=>{
          const Icon = it.icon
          return (
            <NavLink key={it.to} to={it.to} end={it.end}
              className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium flex items-center ${collapsed?'justify-center gap-0':'gap-2'} ${isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'}`}
              title={collapsed ? it.label : undefined}
            >
              <Icon className="h-4 w-4" />
              {!collapsed && <span>{it.label}</span>}
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
