import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Hospital_Sidebar from '../../components/hospital/hospital_Sidebar'
import Hospital_Header from '../../components/hospital/hospital_Header'

export default function Hospital_Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('hospital.sidebar_collapsed') === '1'
  })
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('hospital.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('hospital.theme', theme) } catch {} }, [theme])
  useEffect(()=>{
    const html = document.documentElement
    const enable = theme === 'dark'
    try { html.classList.toggle('dark', enable) } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem('hospital.sidebar_collapsed', sidebarCollapsed ? '1' : '0')
    } catch (_) {}
  }, [sidebarCollapsed])

  const shell = theme === 'dark' ? 'min-h-dvh bg-slate-900 text-slate-100' : 'min-h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'hospital-scope dark' : 'hospital-scope'}>
      <div className={shell}>
        <div className="flex">
          <Hospital_Sidebar collapsed={sidebarCollapsed} />
          <div className="flex min-h-dvh flex-1 flex-col">
            <Hospital_Header onToggleSidebar={() => setSidebarCollapsed(v => !v)} collapsed={sidebarCollapsed} onToggleTheme={() => setTheme(t=>t==='dark'?'light':'dark')} theme={theme} />
            <main className="w-full flex-1 px-4 py-6 sm:px-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
