import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'

function iso(d: Date){ return d.toISOString().slice(0,10) }
function startOfMonth(d: Date){ const x = new Date(d); x.setDate(1); return x }
function money(n: any){ const v = Number(n||0); return isFinite(v)? v : 0 }

export default function Hospital_CashSessions(){
  const [from, setFrom] = useState<string>(iso(startOfMonth(new Date())))
  const [to, setTo] = useState<string>(iso(new Date()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [rows, setRows] = useState<any[]>([])
  const [sel, setSel] = useState<any|null>(null)

  async function load(){
    setLoading(true)
    setError('')
    try{
      const r: any = await financeApi.listCashSessions({ from, to })
      setRows(r?.sessions || r || [])
    }catch(e: any){ setError(String(e?.message||'Failed to load sessions')); setRows([]) }
    setLoading(false)
  }

  useEffect(()=>{ load() }, [from, to])

  const totals = useMemo(()=>{
    return rows.reduce((s: any, r: any)=>({
      opening: s.opening + money(r.openingFloat),
      cashIn: s.cashIn + money(r.cashIn),
      cashOut: s.cashOut + money(r.cashOut),
      net: s.net + money(r.netCash),
      expected: s.expected + money(r.expectedClosing),
      counted: s.counted + money(r.countedCash),
      overShort: s.overShort + money(r.overShort),
    }), { opening:0, cashIn:0, cashOut:0, net:0, expected:0, counted:0, overShort:0 })
  }, [rows])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Cash Drawer Sessions</h1>
        <p className="text-slate-600 mt-1">Filter and review cashier sessions. Click a row to view details and print the close report.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2"><span className="w-16 text-slate-600">From</span>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="input" />
          </label>
          <label className="flex items-center gap-2"><span className="w-16 text-slate-600">To</span>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="input" />
          </label>
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loading? 'Loading…' : 'Refresh'}</button>
          {error && <div className="text-rose-600 text-sm">{error}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Opening</th>
                <th className="px-3 py-2 text-right">Cash In</th>
                <th className="px-3 py-2 text-right">Cash Out</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-right">Expected</th>
                <th className="px-3 py-2 text-right">Counted</th>
                <th className="px-3 py-2 text-right">Over/Short</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-6 text-center text-slate-500">No sessions found</td></tr>
              )}
              {rows.map((r:any)=>{
                const id = String(r._id||r.id)
                return (
                  <tr key={id} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2">{String(r.dateIso||'').slice(0,10)}</td>
                    <td className="px-3 py-2">{r.userName || r.userId}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2 text-right">{money(r.openingFloat).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right">{money(r.cashIn).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right">{money(r.cashOut).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right">{money(r.netCash).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right">{money(r.expectedClosing).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right">{money(r.countedCash).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right">{money(r.overShort).toFixed(0)}</td>
                    <td className="px-3 py-2"><button type="button" onClick={()=>setSel(r)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700">View</button></td>
                  </tr>
                )
              })}
            </tbody>
            {rows.length>0 && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-slate-800 border-t">
                  <td className="px-3 py-2" colSpan={3}>Totals</td>
                  <td className="px-3 py-2 text-right">{totals.opening.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right">{totals.cashIn.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right">{totals.cashOut.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right">{totals.net.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right">{totals.expected.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right">{totals.counted.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right">{totals.overShort.toFixed(0)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {sel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl print:w-[800px]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">Cash Session Close Report</div>
                <div className="text-sm text-slate-600">Session ID: {String(sel._id||sel.id)} • {sel.userName||sel.userId} • {String(sel.dateIso||'').slice(0,10)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={()=>window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700">Print</button>
                <button type="button" onClick={()=>setSel(null)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700">Close</button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Opening Float</div><div className="mt-1 font-semibold text-slate-900">Rs {money(sel.openingFloat).toFixed(0)}</div></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Cash In</div><div className="mt-1 font-semibold text-slate-900">Rs {money(sel.cashIn).toFixed(0)}</div></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Cash Out</div><div className="mt-1 font-semibold text-slate-900">Rs {money(sel.cashOut).toFixed(0)}</div></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Net Cash</div><div className="mt-1 font-semibold text-slate-900">Rs {money(sel.netCash).toFixed(0)}</div></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Expected Closing</div><div className="mt-1 font-semibold text-slate-900">Rs {money(sel.expectedClosing).toFixed(0)}</div></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Counted Cash</div><div className="mt-1 font-semibold text-slate-900">Rs {money(sel.countedCash).toFixed(0)}</div></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Over / Short</div><div className="mt-1 font-semibold text-slate-900">Rs {money(sel.overShort).toFixed(0)}</div></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Start / End</div><div className="mt-1 font-semibold text-slate-900">{String(sel.startAt||'').replace('T',' ').slice(0,19)} → {String(sel.endAt||'').replace('T',' ').slice(0,19) || '—'}</div></div>
            </div>
            {sel?.note && <div className="mt-3 text-sm text-slate-700"><span className="text-slate-500">Note:</span> {sel.note}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
