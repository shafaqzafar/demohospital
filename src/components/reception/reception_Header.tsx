import { Link, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'

type Props = { onToggleSidebar?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark' }

export default function Reception_Header({ onToggleSidebar, onToggleTheme, theme }: Props) {
  const navigate = useNavigate()
  function handleLogout(){
    try { localStorage.removeItem('reception.session') } catch {}
    navigate('/reception/login')
  }
  const user = (()=>{ try { return JSON.parse(localStorage.getItem('reception.session')||'{}') } catch { return {} } })()
  function handleToggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('reception.theme', next) } catch {}
    try { document.documentElement.classList.toggle('dark', next === 'dark') } catch {}
    try {
      const scope = document.querySelector('.reception-scope') || document.body
      scope.classList.add('reception-scope')
      scope.classList.toggle('dark', next === 'dark')
    } catch {}
    onToggleTheme?.()
  }
  return (
    <header className="sticky top-0 z-10 h-16 w-full border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/reception" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-5 w-5'><path d='M4.5 12a5.5 5.5 0 0 1 9.9-3.3l.4.5 3 3a5.5 5.5 0 0 1-7.8 7.8l-3-3-.5-.4A5.48 5.48 0 0 1 4.5 12Zm4.9-3.6L7.1 10l6.9 6.9 2.3-2.3-6.9-6.9Z'/></svg>
          </div>
          <div className="font-semibold text-slate-900 dark:text-slate-200">Reception</div>
          <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">Online</span>
        </Link>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="hidden items-center gap-2 text-slate-600 sm:flex dark:text-slate-300">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'><path d='M6.75 3A2.75 2.75 0 0 0 4 5.75v12.5A2.75 2.75 0 0 0 6.75 21h10.5A2.75 2.75 0 0 0 20 18.25V5.75A2.75 2.75 0 0 0 17.25 3H6.75Zm0 1.5h10.5c.69 0 1.25.56 1.25 1.25v12.5c0 .69-.56 1.25-1.25 1.25H6.75c-.69 0-1.25-.56-1.25-1.25V5.75c0-.69.56-1.25 1.25-1.25Z'/></svg>
            <span>{new Date().toLocaleDateString()}</span>
            <span className="opacity-60">{new Date().toLocaleTimeString()}</span>
          </div>
          <button onClick={handleToggleTheme} className="hidden rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 sm:flex items-center gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'><path d='M7.5 3h9A2.5 2.5 0 0 1 19 5.5v13A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-13A2.5 2.5 0 0 1 7.5 3Zm0 2A.5.5 0 0 0 7 5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-9Z'/></svg>
            {theme === 'dark' ? 'Dark: On' : 'Dark: Off'}
          </button>
          <div className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:text-slate-200">{user?.username || 'reception'}</div>
          <button onClick={handleLogout} className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Logout</button>
        </div>
      </div>
    </header>
  )
}
