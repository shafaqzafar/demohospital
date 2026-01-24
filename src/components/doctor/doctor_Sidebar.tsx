import { NavLink, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { LayoutDashboard, Users, Stethoscope, ScrollText, Bell, Search, FileText, Settings as SettingsIcon } from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: any }

const nav: NavItem[] = [
  { to: '/doctor', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/doctor/patients', label: 'Patients', icon: Users },
  { to: '/doctor/patient-search', label: 'Patient Search', icon: Search },
  { to: '/doctor/prescription', label: 'Prescription', icon: Stethoscope },
  { to: '/doctor/prescription-history', label: 'Prescription History', icon: ScrollText },
  { to: '/doctor/reports', label: 'Reports', icon: FileText },
  { to: '/doctor/notifications', label: 'Notifications', icon: Bell },
  { to: '/doctor/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Doctor_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const logout = async () => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const u = raw ? JSON.parse(raw) : null
      await hospitalApi.logoutHospitalUser(u?.username||'doctor')
    } catch {}
    try { localStorage.removeItem('doctor.session') } catch {}
    navigate('/hospital/login')
  }
  return (
    <aside
      className={`hidden md:flex ${collapsed ? 'md:w-16' : 'md:w-64'} md:flex-col md:border-r md:text-white`}
      style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="h-16 px-4 flex items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        <div className="font-semibold">{collapsed ? 'DR' : 'Doctor'}</div>
        {!collapsed && <div className="ml-auto text-xs opacity-80">portal</div>}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'}`}
              end={item.end}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
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
