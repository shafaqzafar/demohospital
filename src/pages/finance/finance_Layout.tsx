import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Finance_Sidebar from '../../components/finance/finance_Sidebar'
import Finance_Header from '../../components/finance/finance_Header'

export default function Finance_Layout(){
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('finance.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('finance.theme', theme) } catch {} }, [theme])
  useEffect(()=>{
    const html = document.documentElement
    const enable = theme === 'dark'
    try { html.classList.toggle('dark', enable) } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])
  const shell = theme === 'dark' ? 'min-h-dvh bg-slate-900 text-slate-100' : 'min-h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'finance-scope dark' : 'finance-scope'}>
      <div className={shell}>
        <div className="flex">
          <Finance_Sidebar collapsed={collapsed} />
          <div className="flex min-h-dvh flex-1 flex-col">
            <Finance_Header onToggleSidebar={()=> setCollapsed(c=>!c)} onToggleTheme={()=> setTheme(t=> t==='dark'?'light':'dark')} theme={theme} />
            <main className="w-full flex-1 px-2 py-4">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
