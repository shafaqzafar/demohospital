import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CreditCard,
  Boxes,
  Users,
  Truck,
  ReceiptText,
  ShoppingCart,
  RotateCcw,
  CalendarCheck,
  UserCog,
  Settings,
  CalendarDays,
  BarChart3,
  BookText,
  FileClock,
  Wallet,
  Users2,
  ClipboardCheck,
  Bell,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { pharmacyApi } from '../../utils/api'

const nav = [
  { to: '/pharmacy', label: 'Dashboard', end: true, Icon: LayoutDashboard },
  { to: '/pharmacy/pos', label: 'Point of Sale', Icon: CreditCard },
  { to: '/pharmacy/inventory', label: 'Inventory', Icon: Boxes },
  { to: '/pharmacy/customers', label: 'Customers', Icon: Users },
  { to: '/pharmacy/suppliers', label: 'Suppliers', Icon: Truck },
  { to: '/pharmacy/sales-history', label: 'Sales History', Icon: ReceiptText },
  { to: '/pharmacy/purchase-history', label: 'Purchase History', Icon: ShoppingCart },
  { to: '/pharmacy/return-history', label: 'Return History', Icon: RotateCcw },
  { to: '/pharmacy/staff-attendance', label: 'Staff Attendance', Icon: CalendarCheck },
  { to: '/pharmacy/staff-management', label: 'Staff Management', Icon: UserCog },
  { to: '/pharmacy/staff-settings', label: 'Staff Settings', Icon: Settings },
  { to: '/pharmacy/staff-monthly', label: 'Staff Monthly', Icon: CalendarDays },
  { to: '/pharmacy/reports', label: 'Reports', Icon: BarChart3 },
  { to: '/pharmacy/notifications', label: 'Notifications', Icon: Bell },
  { to: '/pharmacy/guidelines', label: 'Guidelines', Icon: BookText },
  { to: '/pharmacy/returns', label: 'Customer Return', Icon: RotateCcw },
  { to: '/pharmacy/supplier-returns', label: 'Supplier Return', Icon: RotateCcw },
  { to: '/pharmacy/prescriptions', label: 'Prescription Intake', Icon: ClipboardCheck },
  { to: '/pharmacy/referrals', label: 'Referrals', Icon: FileClock },
  { to: '/pharmacy/audit-logs', label: 'Audit Logs', Icon: FileClock },
  { to: '/pharmacy/expenses', label: 'Expenses', Icon: Wallet },
  { to: '/pharmacy/pay-in-out', label: 'Pay In/Out', Icon: Wallet },
  { to: '/pharmacy/manager-cash-count', label: 'Manager Cash Count', Icon: Wallet },
  { to: '/pharmacy/settings', label: 'Settings', Icon: Settings },
  { to: '/pharmacy/sidebar-permissions', label: 'Sidebar Permissions', Icon: Settings },
  { to: '/pharmacy/user-management', label: 'User Management', Icon: Users2 },
]

export const pharmacySidebarNav = nav

type Props = { collapsed?: boolean }

export default function Pharmacy_Sidebar({ collapsed }: Props) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [username, setUsername] = useState<string>('')
  const [items, setItems] = useState(nav)
  async function handleLogout(){
    try { await pharmacyApi.logoutUser(username || undefined) } catch {}
    try {
      localStorage.removeItem('pharmacy.user')
      localStorage.removeItem('pharma_user')
      localStorage.removeItem('pharmacy.token')
    } catch {}
    navigate('/pharmacy/login')
  }

  useEffect(() => {
    // Determine role from localStorage
    try {
      const raw = localStorage.getItem('pharmacy.user') || localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role).toLowerCase())
        if (u?.username) setUsername(String(u.username))
      }
    } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await pharmacyApi.listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        const isAdmin = String(role || '').toLowerCase() === 'admin'
        const computed = nav
          .filter(item => {
            if (item.to === '/pharmacy/sidebar-permissions' && !isAdmin) return false
            const perm = map.get(item.to)
            return perm ? perm.visible !== false : true
          })
          .sort((a, b) => {
            const oa = map.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
            const ob = map.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
            if (oa !== ob) return oa - ob
            const ia = nav.findIndex(n => n.to === a.to)
            const ib = nav.findIndex(n => n.to === b.to)
            return ia - ib
          })
        if (mounted) setItems(computed)
      } catch {
        if (mounted) setItems(nav)
      }
    })()
    return () => { mounted = false }
  }, [role])
  return (
    <aside
      className={`hidden md:flex ${collapsed ? 'md:w-16' : 'md:w-72'} md:flex-col md:border-r md:text-slate-700 bg-white`}
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #eff6ff 100%)', borderColor: 'rgba(15, 23, 42, 0.10)' }}
    >
      <div className={`h-16 px-4 flex items-center border-b bg-white/70 backdrop-blur`} style={{ borderColor: 'rgba(15, 23, 42, 0.10)' }}>
        <div className="flex items-center gap-2">
          <div className={`grid h-9 w-9 place-items-center rounded-xl bg-sky-100 ring-sky-200 text-sky-800 ring-1`}>
            <span className="text-sm font-bold">{collapsed ? 'P' : 'Rx'}</span>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className={`text-sm font-semibold text-slate-900`}>Pharmacy</div>
              <div className={`text-[11px] text-slate-500`}>HealthSpire</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div
            className={`ml-auto rounded-full px-2 py-1 text-[11px] font-semibold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200`}
          >
            Online
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map(item => {
          const Icon = item.Icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sky-100 text-sky-900 ring-1 ring-sky-200'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              end={item.end}
            >
              <Icon className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-800" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
      <div className="p-3">
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-white text-slate-800 border border-slate-200 hover:bg-slate-50`}
          style={undefined}
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
