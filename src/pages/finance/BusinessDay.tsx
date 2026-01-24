import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'

export default function Finance_BusinessDay(){
  type Day = { id?: string; dateIso: string; status: 'open'|'closed'; openedAt?: string; closedAt?: string; note?: string }
  const [today, setToday] = useState('')
  const [open, setOpen] = useState<Day | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load() }, [])

  async function load(){
    try {
      const res: any = await financeApi.dayStatus()
      setToday(String(res?.today||''))
      const o: any = res?.open || null
      setOpen(o ? { id: String(o._id||o.id), dateIso: String(o.dateIso||''), status: (o.status||'open') as any, openedAt: String(o.openedAt||''), closedAt: o.closedAt?String(o.closedAt):undefined, note: o.note?String(o.note):undefined } : null)
    } catch {
      setOpen(null); setToday('')
    }
  }

  async function doOpen(){
    setLoading(true)
    try { await financeApi.openDay(undefined, note||undefined); setNote(''); await load() } finally { setLoading(false) }
  }
  async function doClose(){
    setLoading(true)
    try { await financeApi.closeDay(undefined, note||undefined); setNote(''); await load() } finally { setLoading(false) }
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="text-2xl font-bold text-slate-800">Business Day</div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Server Business Date (12 pm cutoff)</div>
          <div className="mt-1 text-xl font-semibold text-slate-900">{today || '-'}</div>
          <div className="mt-3 text-xs text-slate-500">After 12:00 PM, new finance entries will be posted to the next date automatically.</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-800">Day Status</div>
            <div className="text-xs text-slate-500">{open? 'An open day exists' : 'No open day'}</div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Note</label>
              <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end gap-2">
              {!open ? (
                <button disabled={loading} onClick={doOpen} className="btn">{loading?'Working...':'Open Day'}</button>
              ) : (
                <button disabled={loading} onClick={doClose} className="btn bg-rose-700 hover:bg-rose-800">{loading?'Working...':'Close Day'}</button>
              )}
            </div>
          </div>
          {open && (
            <div className="mt-4 grid gap-2 text-sm text-slate-700">
              <div><span className="text-slate-500">Date:</span> <span className="font-medium">{open.dateIso}</span></div>
              <div><span className="text-slate-500">Opened:</span> <span className="font-medium">{open.openedAt ? new Date(open.openedAt).toLocaleString() : '-'}</span></div>
              {open.closedAt && <div><span className="text-slate-500">Closed:</span> <span className="font-medium">{new Date(open.closedAt).toLocaleString()}</span></div>}
              {open.note && <div><span className="text-slate-500">Note:</span> <span className="font-medium">{open.note}</span></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
