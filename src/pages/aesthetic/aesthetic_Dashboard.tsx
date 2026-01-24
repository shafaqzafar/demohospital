import { useEffect, useState } from 'react'
import { aestheticApi, aestheticFinanceApi as financeApi } from '../../utils/api'
import { DollarSign, ShoppingCart, Package, AlertTriangle, Ban, RefreshCw, Clock, Bell, CalendarCheck } from 'lucide-react'

export default function Pharmacy_Dashboard() {
  const [stats, setStats] = useState<{ stockSaleValue: number; lowStockCount: number; outOfStockCount: number; expiringSoonCount: number; totalInventoryOnHand: number } | null>(null)
  const [purchasesTotal, setPurchasesTotal] = useState<number>(0)
  const [expiringSoon, setExpiringSoon] = useState<Array<{ name: string; lastExpiry: string; onHand: number }>>([])
  const [lastUpdated, setLastUpdated] = useState<string>('—')
  const [tick, setTick] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState<number>(0)
  const [todayTokenCount, setTodayTokenCount] = useState<number>(0)
  const [recentTokens, setRecentTokens] = useState<Array<{ number: number; date: string; patientName?: string; payable?: number; status?: string }>>([])
  const [totalPayable, setTotalPayable] = useState<number>(0)
  const [recentPayouts, setRecentPayouts] = useState<Array<{ id: string; doctorId?: string; dateIso: string; memo?: string; amount: number }>>([])

  function fmtDate(d: Date){
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const day = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  }

  useEffect(()=>{
    let mounted = true
    async function load(){
      try {
        const inv: any = await aestheticApi.inventorySummary()
        if (mounted){
          setStats(inv?.stats || null)
        }
      } catch {}
      // Build Expiring Soon list using LAST expiry within next 30 days
      try {
        const BIG_LIMIT = 2000
        const res: any = await aestheticApi.listInventory({ page: 1, limit: BIG_LIMIT })
        const items: any[] = res?.items ?? res ?? []
        const today = new Date(); today.setHours(0,0,0,0)
        const soonDays = 30
        const list = (items||[]).filter((it:any)=>{
          const expStr = String(it.lastExpiry || '').slice(0,10)
          if (!expStr) return false
          const d = new Date(expStr + 'T00:00:00')
          if (isNaN(d.getTime())) return false
          const days = Math.floor((d.getTime() - today.getTime()) / 86400000)
          return days >= 0 && days <= soonDays
        }).map((it:any)=> ({ name: it.name || '-', lastExpiry: String(it.lastExpiry||'').slice(0,10), onHand: Number(it.onHand||0) }))
        if (mounted){ setExpiringSoon(list) }
      } catch {}
      try {
        const pur: any = await aestheticApi.purchasesSummary()
        if (mounted){
          setPurchasesTotal(Number(pur?.totalAmount || 0))
        }
      } catch {}
      try {
        const pay: any = await financeApi.payablesSummary()
        if (mounted){ setTotalPayable(Number(pay?.totalPayable || 0)) }
      } catch {}
      try {
        const rp: any = await financeApi.listRecentPayouts(5)
        if (mounted){ setRecentPayouts((rp?.payouts || []) as any[]) }
      } catch {}
      try {
        const today = new Date()
        const fromToday = fmtDate(today)
        const limit = 200
        let totalRevenue = 0
        let totalTokens = 0
        const first: any = await aestheticApi.listTokens({ from: fromToday, to: fromToday, page: 1, limit })
        totalTokens = Number(first?.total || 0)
        totalRevenue += (first?.items || []).reduce((sum: number, t: any)=> sum + Number(t?.payable || 0), 0)
        const pages = Math.max(1, Number(first?.totalPages || 1))
        for (let p=2; p<=pages; p++){
          const res: any = await aestheticApi.listTokens({ from: fromToday, to: fromToday, page: p, limit })
          totalRevenue += (res?.items || []).reduce((sum: number, t: any)=> sum + Number(t?.payable || 0), 0)
        }
        if (mounted){
          setTodayRevenue(totalRevenue)
          setTodayTokenCount(totalTokens)
        }
      } catch {}
      try {
        const res: any = await aestheticApi.listTokens({ page: 1, limit: 5 })
        if (mounted){
          setRecentTokens((res?.items||[]).map((t:any)=> ({ number: Number(t.number||0), date: String(t.date||''), patientName: t.patientName, payable: Number(t.payable||0), status: t.status })))
        }
      } catch {}
      if (mounted) setLastUpdated(new Date().toLocaleString())
    }
    load()
    return ()=>{ mounted = false }
  }, [tick])

  // No live event stream for tokens yet; refresh button reloads recent tokens

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className={`rounded-xl border bg-emerald-50 border-emerald-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Today's Total Revenue</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {todayRevenue.toFixed(2)}</div>
            </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-600" />
            <div className="text-sm font-medium text-slate-700">Recent Doctor Payouts</div>
          </div>
        </div>
        {recentPayouts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No payouts</div>
        ) : (
          <div className="space-y-2">
            {recentPayouts.map((p, idx)=> (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 truncate">{p.memo || 'Payout'}</div>
                  <div className="text-xs text-slate-600 truncate">{p.dateIso}</div>
                </div>
                <div className="shrink-0 font-semibold text-slate-900">Rs {Number(p.amount||0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><DollarSign className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-sky-50 border-sky-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Today's Tokens</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{todayTokenCount}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><CalendarCheck className="h-4 w-4" /></div>
          </div>
        </div>

        {/* Real data cards */}
        <div className={`rounded-xl border bg-sky-50 border-sky-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Total Purchases</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {purchasesTotal.toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><ShoppingCart className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-cyan-50 border-cyan-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Total Inventory</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{stats?.totalInventoryOnHand ?? 0}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><Package className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-yellow-50 border-yellow-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Low Stock Items</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{stats?.lowStockCount ?? 0}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><AlertTriangle className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-rose-50 border-rose-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Out of Stock</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{stats?.outOfStockCount ?? 0}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><Ban className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-indigo-50 border-indigo-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Total Stock Value</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {(stats?.stockSaleValue ?? 0).toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><DollarSign className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-amber-50 border-amber-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Doctor Payables</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {totalPayable.toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><DollarSign className="h-4 w-4" /></div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-slate-600" />
              <div className="text-sm font-medium text-slate-700">Recent Tokens</div>
            </div>
          </div>
          {recentTokens.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No recent tokens</div>
          ) : (
            <div className="space-y-2">
              {recentTokens.map((t, idx)=> (
                <div key={`${t.number}-${t.date}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">Token #{t.number} · {t.patientName || '-'}</div>
                    <div className="text-xs text-slate-600 truncate">{new Date(t.date).toLocaleString()} · {t.status || 'queued'}</div>
                  </div>
                  <div className="shrink-0 font-semibold text-slate-900">Rs {Number(t.payable||0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <div className="text-sm font-medium text-slate-700">Expiring Soon</div>
          </div>
          {expiringSoon.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No expiring medicines</div>
          ) : (
            <div className="space-y-2">
              {expiringSoon.map((it, idx)=> (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <div className="font-medium text-slate-800">{it.name}</div>
                  <div className="text-slate-600">{it.lastExpiry}</div>
                  <div className="text-slate-600">On hand: {it.onHand}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
        <Clock className="h-4 w-4" />
        <span>Last updated: {lastUpdated}</span>
        <button onClick={()=> setTick(t=>t+1)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
    </div>
  )
}
