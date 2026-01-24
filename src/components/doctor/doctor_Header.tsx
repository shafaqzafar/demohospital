import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'

type DoctorSession = { id: string; name: string; username: string }

type Props = { onToggle?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark' }

export default function Doctor_Header({ onToggle, onToggleTheme, theme }: Props) {
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      setDoc(raw ? JSON.parse(raw) : null)
    } catch { setDoc(null) }
  }, [])
  function handleToggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('doctor.theme', next) } catch {}
    try { document.documentElement.classList.toggle('dark', next === 'dark') } catch {}
    try { const scope = document.querySelector('.doctor-scope'); if (scope) scope.classList.toggle('dark', next === 'dark') } catch {}
    onToggleTheme?.()
  }
  return (
    <header className="h-16 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onToggle} className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" title="Toggle Sidebar" aria-label="Toggle Sidebar">
            <Menu className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Doctor Portal</div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <button onClick={handleToggleTheme} className="hidden rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 sm:inline-flex items-center gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'><path d='M7.5 3h9A2.5 2.5 0 0 1 19 5.5v13A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-13A2.5 2.5 0 0 1 7.5 3Zm0 2A.5.5 0 0 0 7 5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-9Z'/></svg>
            {theme === 'dark' ? 'Dark: On' : 'Dark: Off'}
          </button>
          <div className="hidden sm:block">{doc?.name || '—'}</div>
          <div className="rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-white">{doc?.username?.slice(0,2).toUpperCase() || 'DR'}</div>
        </div>
      </div>
    </header>
  )
}
