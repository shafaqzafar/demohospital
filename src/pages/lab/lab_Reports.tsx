import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'

export default function Lab_Reports() {
  const today = new Date()
  const lastWeek = new Date(today.getTime() - 6*24*60*60*1000)
  const iso = (d: Date)=> d.toISOString().slice(0,10)
  const [from, setFrom] = useState(iso(lastWeek))
  const [to, setTo] = useState(iso(today))
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any>({})
  const [dailyRevenue, setDailyRevenue] = useState<Array<{ date: string; value: number }>>([])
  const [comparison, setComparison] = useState<Array<{ label: string; value: number }>>([])
  const [invStats, setInvStats] = useState<any>(null)
  const [shiftDate, setShiftDate] = useState(iso(today))
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; start: string; end: string }>>([])
  const [shiftId, setShiftId] = useState('')
  const [shiftLoading, setShiftLoading] = useState(false)
  const [shiftCash, setShiftCash] = useState<{ revenue: number; inMov: number; outMov: number; expenses: number; net: number }>({ revenue: 0, inMov: 0, outMov: 0, expenses: 0, net: 0 })

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      setLoading(true)
      try{
        const [res, inv]: any = await Promise.all([
          labApi.reportsSummary({ from, to }),
          labApi.inventorySummary({ limit: 1 }),
        ])
        if (!mounted) return
        setSummary(res || {})
        setDailyRevenue(res?.dailyRevenue || [])
        setComparison(res?.comparison || [])
        setInvStats(inv?.stats || null)
      }catch(e){ console.error(e); setSummary({}); setDailyRevenue([]); setComparison([]); setInvStats(null) }
      finally { setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [tick])

  const maxRev = Math.max(...dailyRevenue.map(d => d.value), 1)
  const maxComp = Math.max(...comparison.map(d => d.value), 1)

  // Load shifts once
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const res: any = await labApi.listShifts()
        if (!mounted) return
        const arr = (res?.items || res || []).map((x:any)=> ({ id: String(x._id||x.id), name: x.name, start: x.start, end: x.end }))
        setShifts(arr)
        if (!shiftId && arr.length) setShiftId(arr[0].id)
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  function getShiftWindow(dateStr: string, sh?: { start: string; end: string }){
    try{
      if (!sh) return null
      const [y,m,d] = dateStr.split('-').map(n=>parseInt(n,10))
      const [shh,smm] = String(sh.start||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const [ehh,emm] = String(sh.end||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const start = new Date(y, m-1, d, shh||0, smm||0, 0)
      let end = new Date(y, m-1, d, ehh||0, emm||0, 0)
      if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
      return { start, end }
    } catch { return null }
  }

  async function computeShiftCash(){
    const sh = shifts.find(s=>s.id===shiftId)
    const win = getShiftWindow(shiftDate, sh)
    if (!win) return
    setShiftLoading(true)
    try{
      const [ordersRes, movRes, expRes]: any = await Promise.all([
        labApi.listOrders({ from: shiftDate, to: shiftDate, page: 1, limit: 1000 }),
        labApi.listCashMovements({ from: shiftDate, to: shiftDate, page: 1, limit: 1000 }),
        labApi.listExpenses({ from: shiftDate, to: shiftDate, page: 1, limit: 1000 })
      ])
      const ts = (d:any)=>{ const s=String(d||''); const iso = s.includes('T')? s : `${s}T00:00:00`; const t=new Date(iso).getTime(); return isFinite(t)? t:0 }
      const inRange = (t:number)=> t>=win.start.getTime() && t<win.end.getTime()
      const orders: any[] = (ordersRes?.items || [])
      const revenue = orders.filter(o=> inRange(ts(o.createdAt||o.date))).reduce((s,o)=> s + Number(o.net||0), 0)
      const movs: any[] = (movRes?.items || movRes || [])
      const inMov = movs.filter(m=> String(m.type||'')==='IN' && inRange(ts(m.date||m.dateIso||m.createdAt))).reduce((s,m)=> s + Number(m.amount||0), 0)
      const outMov = movs.filter(m=> String(m.type||'')==='OUT' && inRange(ts(m.date||m.dateIso||m.createdAt))).reduce((s,m)=> s + Number(m.amount||0), 0)
      const exps: any[] = (expRes?.items || expRes || [])
      const expenses = exps.filter(e=> inRange(ts(e.date||e.dateIso||e.createdAt))).reduce((s,e)=> s + Number(e.amount||0), 0)
      const net = Math.max(0, (revenue + inMov) - (outMov + expenses))
      setShiftCash({ revenue, inMov, outMov, expenses, net })
    } catch {
      setShiftCash({ revenue: 0, inMov: 0, outMov: 0, expenses: 0, net: 0 })
    } finally { setShiftLoading(false) }
  }

  const apply = () => setTick(t => t + 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100">Lab Summary Report</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={apply} className="btn">Apply</button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard title="Total Tests" value={loading? '…' : `${summary.totalTests||0}`} bg="bg-sky-50" border="border-sky-200" />
        <SummaryCard title="Total Purchase Amount" value={loading? '…' : `PKR ${(summary.totalPurchasesAmount||0).toLocaleString()}`} bg="bg-emerald-50" border="border-emerald-200" />
        <SummaryCard title="Total Expenses" value={loading? '…' : `PKR ${(summary.totalExpenses||0).toLocaleString()}`} bg="bg-rose-50" border="border-rose-200" />
        <SummaryCard title="Total Revenue" value={loading? '…' : `PKR ${(summary.totalRevenue||0).toLocaleString()}`} bg="bg-indigo-50" border="border-indigo-200" />
        <SummaryCard title="Pending Results" value={loading? '…' : `${summary.pendingResults||0}`} bg="bg-cyan-50" border="border-cyan-200" />
        <SummaryCard title="Stock Value" value={loading? '…' : `PKR ${(invStats?.stockSaleValue||0).toLocaleString()}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Low Stock Items" value={loading? '…' : `${invStats?.lowStockCount||0}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Expiring Soon" value={loading? '…' : `${invStats?.expiringSoonCount||0}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Out of Stock" value={loading? '…' : `${invStats?.outOfStockCount||0}`} bg="bg-rose-50" border="border-rose-200" />
      </div>

      {/* Shift-wise Cash */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-medium text-slate-800">Shift-wise Cash</div>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="text-slate-700">
            <div className="mb-1">Date</div>
            <input type="date" value={shiftDate} onChange={e=>setShiftDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-slate-700">
            <div className="mb-1">Shift</div>
            <select value={shiftId} onChange={e=>setShiftId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 min-w-[160px]">
              {shifts.map(s=> <option key={s.id} value={s.id}>{s.name} ({s.start}-{s.end})</option>)}
            </select>
          </label>
          <button onClick={computeShiftCash} disabled={!shiftId || shiftLoading} className="btn disabled:opacity-50">{shiftLoading? 'Calculating…' : 'Calculate'}</button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Revenue (Orders)</div><div className="mt-1 font-semibold text-slate-900">PKR {shiftCash.revenue.toLocaleString()}</div></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Cash In (Movements)</div><div className="mt-1 font-semibold text-slate-900">PKR {shiftCash.inMov.toLocaleString()}</div></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Cash Out (Movements)</div><div className="mt-1 font-semibold text-slate-900">PKR {shiftCash.outMov.toLocaleString()}</div></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Expenses</div><div className="mt-1 font-semibold text-slate-900">PKR {shiftCash.expenses.toLocaleString()}</div></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-slate-600">Net Cash</div><div className="mt-1 font-semibold text-slate-900">PKR {shiftCash.net.toLocaleString()}</div></div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-800">Daily Revenue</div>
          <div className="h-48 w-full rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-full items-end gap-3">
              {dailyRevenue.map(d => (
                <div key={d.date} className="flex-1 h-full flex flex-col items-center justify-end">
                  <div
                    className="mx-auto w-6 rounded-t-md bg-sky-500"
                    style={{ height: `${Math.max(8, (d.value/maxRev)*100)}%` }}
                    title={`${d.date.slice(0,10)} — PKR ${d.value.toLocaleString()}`}
                  />
                  <div className="mt-2 text-center text-xs text-slate-600">{d.date.slice(0,10)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-800">Comparison: Revenue, Expenses, Purchases</div>
          <div className="h-48 w-full rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-full items-end gap-6 justify-center">
              {comparison.map(d => (
                <div key={d.label} className="text-center h-full flex flex-col justify-end">
                  <div
                    className="mx-auto w-10 rounded-t-md bg-emerald-500"
                    style={{ height: `${Math.max(8, (d.value/maxComp)*100)}%` }}
                    title={`${d.label} — PKR ${d.value.toLocaleString()}`}
                  />
                  <div className="mt-2 text-xs text-slate-600">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, bg, border }: { title: string; value: string; bg: string; border: string }) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <div className="text-xs font-medium text-slate-600">{title}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  )
}
