import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Reception_Sidebar from '../../components/reception/reception_Sidebar'
import Reception_Header from '../../components/reception/reception_Header'

export default function Reception_Layout(){
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('reception.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  const navigate = useNavigate()
  useEffect(()=>{
    try {
      const sess = localStorage.getItem('reception.session')
      if (!sess) navigate('/reception/login')
    } catch { navigate('/reception/login') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(()=>{ try { localStorage.setItem('reception.theme', theme) } catch {} }, [theme])
  useEffect(()=>{
    const html = document.documentElement
    const enable = theme === 'dark'
    try { html.classList.toggle('dark', enable) } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])
  const shell = theme === 'dark' ? 'min-h-dvh bg-slate-900 text-slate-100' : 'min-h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'reception-scope dark' : 'reception-scope'}>
      <div className={shell}>
        <div className="flex">
          <Reception_Sidebar collapsed={collapsed} />
          <div className="flex min-h-dvh flex-1 flex-col">
            <Reception_Header onToggleSidebar={()=> setCollapsed(c=>!c)} onToggleTheme={()=> setTheme(t=> t==='dark'?'light':'dark')} theme={theme} />
            <main className="w-full flex-1 px-2 py-4">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
