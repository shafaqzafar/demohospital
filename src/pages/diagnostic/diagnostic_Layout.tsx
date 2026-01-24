import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Diagnostic_Sidebar from '../../components/diagnostic/diagnostic_Sidebar'
import Diagnostic_Header from '../../components/diagnostic/diagnostic_Header'

export default function Diagnostic_Layout() {
  const [collapsed, setCollapsed] = useState<boolean>(()=>{
    try { return localStorage.getItem('diagnostic.sidebar.collapsed') === '1' } catch { return false }
  })
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('diagnostic.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('diagnostic.theme', theme) } catch {} }, [theme])
  useEffect(()=>{
    const html = document.documentElement
    const enable = theme === 'dark'
    try { html.classList.toggle('dark', enable) } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])
  const toggle = () => {
    setCollapsed(v=>{
      const nv = !v
      try { localStorage.setItem('diagnostic.sidebar.collapsed', nv ? '1' : '0') } catch {}
      return nv
    })
  }
  const shell = theme === 'dark' ? 'min-h-dvh bg-slate-900 text-slate-100' : 'min-h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'diagnostic-scope dark' : 'diagnostic-scope'}>
      <div className={shell}>
        <div className="flex">
          <Diagnostic_Sidebar collapsed={collapsed} />
          <div className="flex min-h-dvh flex-1 flex-col">
            <Diagnostic_Header onToggleSidebar={toggle} onToggleTheme={()=> setTheme(t=>t==='dark'?'light':'dark')} theme={theme} />
            <main className="w-full flex-1 px-2 py-4">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
