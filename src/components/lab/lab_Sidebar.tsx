import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'
import {
  LayoutDashboard, ClipboardPlus, ListChecks, FlaskConical, FileText, BarChart3, PieChart,
  Boxes, Truck, History, Undo2, RotateCcw, CalendarCheck, Users, Settings as Cog,
  CalendarDays, UserCog, ScrollText, Receipt, Droplets, PackageOpen, UserPlus, Wallet, Calculator
} from 'lucide-react'

type Item = { to: string; label: string; end?: boolean; icon: any }
const nav: Item[] = [
  { to: '/lab', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/lab/orders', label: 'Sample Intake', icon: ClipboardPlus },
  { to: '/lab/tracking', label: 'Sample Tracking', icon: ListChecks },
  { to: '/lab/tests', label: 'Test Catalog', icon: FlaskConical },
  { to: '/lab/results', label: 'Result Entry', icon: FileText },
  { to: '/lab/referrals', label: 'Referrals', icon: ListChecks },
  { to: '/lab/reports', label: 'Reports Generator', icon: BarChart3 },
  { to: '/lab/reports-summary', label: 'Reports', icon: PieChart },
  { to: '/lab/inventory', label: 'Inventory', icon: Boxes },
  { to: '/lab/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/lab/purchase-history', label: 'Purchase History', icon: History },
  { to: '/lab/supplier-returns', label: 'Supplier Returns', icon: Undo2 },
  { to: '/lab/return-history', label: 'Return History', icon: RotateCcw },
  // Blood Bank
  { to: '/lab/bb/donors', label: 'BB • Donors', icon: UserPlus },
  { to: '/lab/bb/inventory', label: 'BB • Inventory', icon: PackageOpen },
  { to: '/lab/bb/receivers', label: 'BB • Receivers', icon: Droplets }, 
  { to: '/lab/staff-attendance', label: 'Staff Attendance', icon: CalendarCheck },
  { to: '/lab/staff-management', label: 'Staff Management', icon: Users },
  { to: '/lab/staff-settings', label: 'Staff Settings', icon: Cog },
  { to: '/lab/staff-monthly', label: 'Staff Monthly', icon: CalendarDays },
  { to: '/lab/user-management', label: 'User Management', icon: UserCog },
  { to: '/lab/sidebar-permissions', label: 'Sidebar Permissions', icon: Cog },
  { to: '/lab/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/lab/expenses', label: 'Expenses', icon: Receipt },
  { to: '/lab/pay-in-out', label: 'Pay In / Out', icon: Wallet },
  { to: '/lab/manager-cash-count', label: 'Manager Cash Count', icon: Calculator },
  { to: '/lab/settings', label: 'Settings', icon: Cog },
]

export const labSidebarNav = nav

export default function Lab_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [items, setItems] = useState(nav)

  const logout = async () => {
    try { await labApi.logoutUser() } catch {}
    try { localStorage.removeItem('lab.session') } catch {}
    navigate('/lab/login')
  }

  useEffect(()=>{
    try {
      const raw = localStorage.getItem('lab.session') || localStorage.getItem('user')
      if (raw){
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role).toLowerCase())
      }
    } catch {}
  }, [])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const res: any = await labApi.listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        const computed = nav
          .filter(item => {
            if (item.to === '/lab/sidebar-permissions' && String(role||'').toLowerCase() !== 'admin') return false
            const perm = map.get(item.to)
            return perm ? perm.visible !== false : true
          })
          .sort((a,b)=>{
            const oa = map.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
            const ob = map.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
            if (oa !== ob) return oa - ob
            const ia = nav.findIndex(n => n.to === a.to)
            const ib = nav.findIndex(n => n.to === b.to)
            return ia - ib
          })
        if (mounted) setItems(computed)
      } catch { if (mounted) setItems(nav) }
    })()
    return ()=>{ mounted = false }
  }, [role])
  return (
    <aside
      className={`hidden md:flex ${collapsed ? 'md:w-16' : 'md:w-72'} md:flex-col md:border-r bg-white text-slate-800 border-slate-200 dark:text-white dark:border-white/10 dark:bg-gradient-to-b dark:from-[#071a33] dark:via-[#0B2B5B] dark:to-[#2E1065]`}
    >
      <div className="h-16 px-4 flex items-center border-b border-slate-200 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">
            <span className="text-sm font-bold text-slate-900 dark:text-white">{collapsed ? 'L' : 'Lab'}</span>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Laboratory</div>
              <div className="text-[11px] text-slate-500 dark:text-white/70">HealthSpire</div>
            </div>
          )}
        </div>
        {!collapsed && <div className="ml-auto rounded-full bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/20">Online</div>}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group rounded-xl px-3 py-2 text-sm font-medium flex items-center transition ${collapsed?'justify-center gap-0':'gap-2'} ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-200 dark:bg-white/10 dark:text-white dark:ring-white/10'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-white/75 dark:hover:bg-white/6 dark:hover:text-white'
                }`
              }
              end={item.end}
            >
              <Icon className="h-4 w-4 text-slate-500 group-hover:text-slate-800 dark:text-white/80 dark:group-hover:text-white" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
      <div className="p-3">
        <button
          type="button"
          onClick={logout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >Logout</button>
      </div>
    </aside>
  )
}
