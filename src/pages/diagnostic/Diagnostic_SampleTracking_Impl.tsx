import { useEffect, useMemo, useState } from 'react'
import { diagnosticApi } from '../../utils/api'
import Diagnostic_TokenSlip from '../../components/diagnostic/Diagnostic_TokenSlip'
import Diagnostic_EditSampleDialog from '../../components/diagnostic/Diagnostic_EditSampleDialog'
import type { DiagnosticTokenSlipData } from '../../components/diagnostic/Diagnostic_TokenSlip'

type Order = {
  id: string
  createdAt: string
  patient: { mrn?: string; fullName: string; phone?: string; cnic?: string; guardianName?: string }
  tests: string[]
  // per-test tracking items
  items?: Array<{ testId: string; status: 'received'|'completed'|'returned'; sampleTime?: string; reportingTime?: string }>
  status: 'received'|'completed'|'returned'
  tokenNo?: string
  sampleTime?: string
  subtotal?: number
  discount?: number
  net?: number
}

type Test = { id: string; name: string; price?: number }

function formatDateTime(iso: string) {
  const d = new Date(iso); return d.toLocaleDateString() + ', ' + d.toLocaleTimeString()
}

export default function Diagnostic_SampleTracking(){
  // tests map
  const [tests, setTests] = useState<Test[]>([])
  useEffect(()=>{ (async()=>{
    try { const res = await diagnosticApi.listTests({ limit: 1000 }) as any; setTests((res?.items||res||[]).map((t:any)=>({ id: String(t._id||t.id), name: t.name, price: Number(t.price||0) })))} catch { setTests([]) }
  })() }, [])
  const testsMap = useMemo(()=> Object.fromEntries(tests.map(t=>[t.id, t.name])), [tests])
  const testsPrice = useMemo(()=> Object.fromEntries(tests.map(t=>[t.id, Number(t.price||0)])), [tests])

  // filters
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all'|'received'|'completed'|'returned'>('all')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)

  // data
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)

  useEffect(()=>{ let mounted = true; (async()=>{
    try {
      // Do not exclude orders with some returned items when viewing 'received' or 'all'
      const st = (status==='all' || status==='received') ? undefined : status
      const res = await diagnosticApi.listOrders({ q: q || undefined, from: from || undefined, to: to || undefined, status: st as any, page, limit: rows }) as any
      const items: Order[] = (res.items||[]).map((x:any)=>({ id: String(x._id), createdAt: x.createdAt || new Date().toISOString(), patient: x.patient || { fullName: '-', phone: '' }, tests: x.tests || [], items: x.items || [], status: x.status || 'received', tokenNo: x.tokenNo, sampleTime: x.sampleTime, subtotal: Number(x.subtotal||0), discount: Number(x.discount||0), net: Number(x.net||0) }))
      if (mounted){ setOrders(items); setTotal(Number(res.total||items.length||0)); setTotalPages(Number(res.totalPages||1)) }
    } catch (e){ if (mounted){ setOrders([]); setTotal(0); setTotalPages(1) } }
  })(); return ()=>{ mounted = false } }, [q, from, to, status, page, rows])

  const pageCount = Math.max(1, totalPages)
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + orders.length, total)

  // Per-test update handlers
  const setSampleTimeForItem = async (orderId: string, testId: string, t: string) => {
    try { await diagnosticApi.updateOrderItemTrack(orderId, testId, { sampleTime: t }) } catch {}
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const items = (o.items||[])
      const idx = items.findIndex(i => i.testId===testId)
      if (idx>=0){ const copy = items.slice(); copy[idx] = { ...copy[idx], sampleTime: t }; return { ...o, items: copy } }
      return { ...o, items: [ ...(o.items||[]), { testId, status: 'received', sampleTime: t } ] }
    }))
  }
  const setStatusForItem = async (orderId: string, testId: string, s: 'received'|'completed'|'returned') => {
    try { await diagnosticApi.updateOrderItemTrack(orderId, testId, { status: s }) } catch {}
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const items = (o.items||[])
      const idx = items.findIndex(i => i.testId===testId)
      if (idx>=0){ const copy = items.slice(); copy[idx] = { ...copy[idx], status: s }; return { ...o, items: copy } }
      return { ...o, items: [ ...(o.items||[]), { testId, status: s } ] }
    }))
  }
  const requestDeleteItem = async (orderId: string, testId: string) => {
    if (!confirm('Delete this test from the order?')) return
    try {
      const res = await diagnosticApi.deleteOrderItem(orderId, testId) as any
      if (res?.deletedOrder){
        setOrders(prev => prev.filter(o=>o.id!==orderId))
      } else if (res?.order){
        setOrders(prev => prev.map(o => o.id===orderId ? {
          ...o,
          tests: (res.order.tests||[]),
          items: (res.order.items||[]),
          status: res.order.status || o.status,
        } : o))
      } else {
        setOrders(prev => prev.map(o => o.id===orderId ? { ...o, tests: o.tests.filter(t=>t!==testId), items: (o.items||[]).filter(i=>i.testId!==testId) } : o))
      }
      setNotice({ text: 'Test deleted', kind: 'success' })
    }
    catch { setNotice({ text: 'Failed to delete', kind: 'error' }) }
    finally { try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }

  // Print Slip
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipData, setSlipData] = useState<DiagnosticTokenSlipData | null>(null)
  // Edit Sample Dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editOrder, setEditOrder] = useState<{ id: string; patient: any; tests: string[] } | null>(null)
  function openEdit(o: Order){ setEditOrder({ id: o.id, patient: o.patient, tests: o.tests }); setEditOpen(true) }
  function onEditSaved(updated: any){
    const id = String(updated?._id || updated?.id || (editOrder && editOrder.id))
    if (!id) { setEditOpen(false); return }
    setOrders(prev => prev.map(o => o.id===id ? { ...o, patient: updated.patient || o.patient, tests: updated.tests || o.tests, tokenNo: updated.tokenNo || o.tokenNo, createdAt: updated.createdAt || o.createdAt } : o))
    setEditOpen(false)
  }
  const printToken = (o: Order) => {
    const rows = o.tests.map(tid => ({ name: testsMap[tid] || tid, price: Number(testsPrice[tid]||0) }))
    const computedSubtotal = rows.reduce((s,r)=> s + Number(r.price||0), 0)
    const subtotal = (o.subtotal!=null && !Number.isNaN(o.subtotal)) ? Number(o.subtotal) : computedSubtotal
    const discount = (o.discount!=null && !Number.isNaN(o.discount)) ? Number(o.discount) : 0
    const payable = (o.net!=null && !Number.isNaN(o.net)) ? Number(o.net) : Math.max(0, subtotal - discount)
    const data: DiagnosticTokenSlipData = {
      tokenNo: o.tokenNo || '-',
      patientName: o.patient.fullName,
      phone: o.patient.phone || '',
      age: (o as any)?.patient?.age ? String((o as any).patient.age) : undefined,
      gender: (o as any)?.patient?.gender ? String((o as any).patient.gender) : undefined,
      mrn: o.patient.mrn || undefined,
      guardianRel: undefined,
      guardianName: o.patient.guardianName || undefined,
      cnic: (o as any)?.patient?.cnic || o.patient.cnic || undefined,
      address: (o as any)?.patient?.address || undefined,
      tests: rows,
      subtotal,
      discount,
      payable,
      createdAt: o.createdAt,
    }
    setSlipData(data); setSlipOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-2xl font-bold text-slate-900">Sample Tracking</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[260px] flex-1">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by token, patient, or test..." className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={()=>setStatus('all')} className={`rounded-md px-3 py-1.5 border ${status==='all'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>All</button>
            <button onClick={()=>setStatus('received')} className={`rounded-md px-3 py-1.5 border ${status==='received'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Received</button>
            <button onClick={()=>setStatus('completed')} className={`rounded-md px-3 py-1.5 border ${status==='completed'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Completed</button>
            <button onClick={()=>setStatus('returned')} className={`rounded-md px-3 py-1.5 border ${status==='returned'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Returned</button>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span>Rows</span>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        {notice && (
          <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Token No</th>
              <th className="px-4 py-2">Test(s)</th>
              <th className="px-4 py-2">MR No</th>
              <th className="px-4 py-2">CNIC</th>
              <th className="px-4 py-2">Father Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Sample Time</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.reduce((acc: any[], o) => {
              const token = o.tokenNo || '-'
              o.tests.forEach((tid, idx) => {
                const tname = testsMap[tid] || '—'
                const item = (o.items||[]).find(i=> i.testId===tid)
                const rowStatus = item?.status || o.status
                const sampleTime = item?.sampleTime || o.sampleTime || ''
                acc.push(
                  <tr key={`${o.id}-${tid}-${idx}`} className="border-b border-slate-100">
                    <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.fullName}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{token}</td>
                    <td className="px-4 py-2">{tname}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.mrn || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.cnic || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.guardianName || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.phone || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input type="time" value={sampleTime} onChange={e=>setSampleTimeForItem(o.id, String(tid), e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
                     </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <select value={rowStatus} onChange={e=> setStatusForItem(o.id, String(tid), e.target.value as any)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                        <option value="received">received</option>
                        <option value="completed">completed</option>
                        <option value="returned">returned</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>printToken(o)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">Print Token</button>
                        <button onClick={()=> openEdit(o)} className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700">Edit Sample</button>
                        <button onClick={()=>requestDeleteItem(o.id, String(tid))} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700">Delete Test</button>
                      </div>
                    </td>
                  </tr>
                )
              })
              return acc
            }, [] as any[])}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No samples found</div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{total === 0 ? '0' : `${start}-${end}`} of {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={curPage<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Prev</button>
          <span>{curPage} / {pageCount}</span>
          <button disabled={curPage>=pageCount} onClick={()=> setPage(p=> p+1)} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>

      {slipOpen && slipData && (
        <Diagnostic_TokenSlip open={slipOpen} onClose={()=>setSlipOpen(false)} data={slipData} />
      )}
      {editOpen && editOrder && (
        <Diagnostic_EditSampleDialog
          open={editOpen}
          onClose={()=>setEditOpen(false)}
          order={editOrder}
          onSaved={onEditSaved}
        />
      )}
    </div>
  )
}
