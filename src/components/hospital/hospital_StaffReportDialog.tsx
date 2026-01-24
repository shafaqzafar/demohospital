import { useEffect, useMemo, useState } from 'react'
import { labApi } from '../../utils/api'

type Attendance = { id?: string; staffId: string; date: string; shiftId?: string; status: 'present'|'absent'|'leave'; clockIn?: string; clockOut?: string; notes?: string }

export type LabStaff = { id: string; name: string; position?: string; shiftId?: string; salary?: number }
export type Shift = { id: string; name: string; start?: string; end?: string; absentCharges?: number; lateDeduction?: number; earlyOutDeduction?: number }

type Props = {
  open: boolean
  onClose: () => void
  staffList: LabStaff[]
  initialMonth?: string
  initialStaffId?: string
}

function formatMonth(yyyyMm: string){ const [y,m] = yyyyMm.split('-').map(Number); const d = new Date(y, (m-1)||0, 1); return d.toLocaleString(undefined, { month: 'long', year: 'numeric' }) }
function toMinutes(hm?: string){ if(!hm) return 0; const [h,m] = (hm||'').split(':').map(n=>parseInt(n||'0')); return (h*60 + m) }
function fmtHours(min: number){ const h = Math.floor(min/60); const m = Math.round(min%60); return `${h}h ${m}m` }
function formatPKR(n: number){ return `${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} PKR` }

export default function Lab_StaffReportDialog({ open, onClose, staffList, initialMonth, initialStaffId }: Props){
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState<string>(initialMonth || new Date().toISOString().slice(0,7))
  const [selectedId, setSelectedId] = useState<string>(initialStaffId || (staffList[0]?.id ?? ''))
  const [att, setAtt] = useState<Attendance[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [settings, setSettings] = useState<any>(null)

  const filtered = useMemo(()=> staffList.filter(s => s.name.toLowerCase().includes(query.toLowerCase())), [staffList, query])
  const selected = useMemo(()=> staffList.find(s => s.id === selectedId) ?? filtered[0] ?? null, [selectedId, staffList, filtered])
  const shiftById = useMemo(()=> Object.fromEntries(shifts.map(s => [s.id, s] as const)), [shifts])
  const shiftName = (id?: string)=> id? (shiftById[id]?.name || '—') : '—'

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const [shiftRes, settingsRes] = await Promise.all([
          labApi.listShifts(),
          labApi.getSettings().catch(()=>null),
        ])
        if (!mounted) return
        setShifts((shiftRes.items||[]).map((x:any)=>({ id: x._id, name: x.name, start: x.start, end: x.end, absentCharges: x.absentCharges, lateDeduction: x.lateDeduction, earlyOutDeduction: x.earlyOutDeduction })))
        if (settingsRes) setSettings(settingsRes)
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [open])

  useEffect(()=>{ if (!open) return; if (initialStaffId && initialStaffId !== selectedId) setSelectedId(initialStaffId); if (initialMonth && initialMonth !== month) setMonth(initialMonth) }, [open, initialStaffId, initialMonth])

  useEffect(()=>{
    if (!selected) { setAtt([]); return }
    let mounted = true
    ;(async()=>{
      try {
        const from = `${month}-01`
        const dt = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
        const to = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
        const res = await labApi.listAttendance({ from, to, staffId: selected.id })
        if (!mounted) return
        setAtt((res.items||[]).map((x:any)=>({ id: x._id, staffId: x.staffId, date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes })))
      } catch { setAtt([]) }
    })()
    return ()=>{ mounted = false }
  }, [selectedId, month, open])

  const daily = useMemo(()=>{
    if (!selected) return [] as Array<{ date: string; shift?: string; status: string; clockIn?: string; clockOut?: string; minutes: number }>
    const from = `${month}-01`
    const dt = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
    const to = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
    const recs = att.filter(a=> a.staffId===selected.id && a.date && a.date >= from && a.date <= to)
    const list = recs.map(r => {
      const ci = toMinutes(r.clockIn), co = toMinutes(r.clockOut)
      const diff = (ci && co) ? (co>=ci ? (co-ci) : (24*60 - ci + co)) : 0
      const normalizedStatus = (r.status==='leave') ? 'leave' : ((r.status==='present' || r.clockIn || r.clockOut) ? 'present' : 'absent')
      return { date: r.date, shift: r.shiftId, status: normalizedStatus as 'present'|'absent'|'leave', clockIn: r.clockIn, clockOut: r.clockOut, minutes: diff }
    })
    list.sort((a,b)=> a.date<b.date? -1 : a.date>b.date? 1 : 0)
    return list
  }, [att, selectedId, month])

  const stats = useMemo(()=>{
    const presentDates = new Set(daily.filter(d=>d.status==='present').map(d=>d.date))
    const leaveDates = new Set(daily.filter(d=>d.status==='leave').map(d=>d.date))
    const totalMinutes = daily.reduce((s,d)=> s + (d.status==='present'? d.minutes : 0), 0)
    const [y,m] = month.split('-').map(n=>parseInt(n||'0'))
    const today = new Date(); const curKey = today.getFullYear()*100 + (today.getMonth()+1); const targetKey = (y||0)*100 + (m||0)
    const endOfMonth = new Date(y, m, 0).getDate()
    const workingDays = targetKey < curKey ? endOfMonth : targetKey > curKey ? 0 : today.getDate()
    let late = 0, early = 0
    for (const r of daily){
      if (r.status !== 'present') continue
      const sh = r.shift ? shiftById[r.shift] || (selected?.shiftId ? shiftById[selected.shiftId] : undefined) : (selected?.shiftId ? shiftById[selected.shiftId] : undefined)
      if (!sh) continue
      const grace = 0
      if (r.clockIn && sh.start){ if (toMinutes(r.clockIn) > toMinutes(sh.start) + grace) late++ }
      if (r.clockOut && sh.end){ if (toMinutes(r.clockOut) < toMinutes(sh.end)) early++ }
    }
    const absentDays = Math.max(0, workingDays - presentDates.size - leaveDates.size)
    return { presentDays: presentDates.size, leaveDays: leaveDates.size, absentDays, totalMinutes, late, early, workingDays }
  }, [daily, shiftById, selected?.shiftId, month])

  const basicSalary = selected?.salary || 0
  const staffShift = selected?.shiftId ? shiftById[selected.shiftId] : undefined
  const absentRate = Number(staffShift?.absentCharges ?? 0)
  const lateRate = Number(staffShift?.lateDeduction ?? 0)
  const earlyRate = Number(staffShift?.earlyOutDeduction ?? 0)
  const absentDeduction = stats.absentDays * absentRate
  const lateDeduction = stats.late * lateRate
  const earlyDeduction = stats.early * earlyRate
  const totalDeductions = absentDeduction + lateDeduction + earlyDeduction
  const netSalary = Math.max(0, basicSalary - totalDeductions)

  const exportCsv = () => {
    const rows = [['Month','Staff','Date','Status','Clock In','Clock Out','Hours']]
    for (const r of daily){
      const minutes = (r.status==='present' && r.clockIn && r.clockOut) ? Math.max(0, toMinutes(r.clockOut) - toMinutes(r.clockIn)) : 0
      rows.push([month, selected?.name||'', r.date, r.status, r.clockIn||'', r.clockOut||'', fmtHours(minutes)])
    }
    const csv = rows.map(r=> r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lab_monthly_${month}_${selected?.name||''}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  const exportPdf = () => {
    const staffName = selected?.name || ''
    const right = [
      `<div><div style='font-size:12px;color:#475569'>Month</div><div style='font-size:14px;font-weight:600;'>${formatMonth(month)}</div></div>`,
      `<div><div style='font-size:12px;color:#475569'>Staff</div><div style='font-size:14px;font-weight:600;'>${staffName}</div></div>`,
    ].join('')
    const head = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${settings?.logoDataUrl ? `<img src='${settings.logoDataUrl}' style='height:48px;object-fit:contain;'/>` : ''}
          <div>
            <div style="font-size:18px;font-weight:800;letter-spacing:.5px;">${(settings?.labName||'Lab').toUpperCase()}</div>
            ${settings?.address ? `<div style='font-size:12px;color:#475569;'>${settings.address}</div>`:''}
            ${(settings?.phone||settings?.email)? `<div style='font-size:12px;color:#475569;'>${settings?.phone? 'PHONE: '+settings.phone : ''} ${settings?.email? ' EMAIL: '+settings.email : ''}</div>`:''}
          </div>
        </div>
        <div style="display:flex;gap:16px;">${right}</div>
      </div>
      <div style="font-size:16px;font-weight:600;margin:8px 0 12px;">Staff Report</div>
    `

    const card = (label:string, val:string) => `<div style='border-radius:8px;padding:10px;text-align:center;border:1px solid #e2e8f0;'>
      <div style='font-size:18px;font-weight:700;'>${val}</div>
      <div style='font-size:12px;color:#475569;'>${label}</div>
    </div>`

    const attCards = `
      <div style='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:8px 0;'>
        ${card('Present', String(stats.presentDays))}
        ${card('Absents', String(stats.absentDays))}
        ${card('Late Arrivals', String(stats.late))}
        ${card('Working Days', String(stats.workingDays))}
      </div>
    `

    const salary = `
      <div style='border:1px solid #e2e8f0;border-radius:8px;padding:10px;font-size:13px;'>
        <div style='display:flex;justify-content:space-between;'><div>Basic Salary</div><div style='font-weight:600;'>${formatPKR(basicSalary)}</div></div>
        <div style='margin-top:6px;color:#475569;'>Deductions:</div>
        <div style='display:flex;justify-content:space-between;color:#b91c1c;'><div>Late Arrivals (${stats.late})</div><div>-${formatPKR(stats.late * (Number(staffShift?.lateDeduction||0)))}</div></div>
        <div style='display:flex;justify-content:space-between;color:#b91c1c;'><div>Absents (${stats.absentDays})</div><div>-${formatPKR(stats.absentDays * (Number(staffShift?.absentCharges||0)))}</div></div>
        <div style='display:flex;justify-content:space-between;color:#b91c1c;'><div>Early Out (${stats.early})</div><div>-${formatPKR(stats.early * (Number(staffShift?.earlyOutDeduction||0)))}</div></div>
        <div style='display:flex;justify-content:space-between;margin-top:4px;font-weight:600;'><div>Total Deductions</div><div style='color:#b91c1c;'>-${formatPKR(totalDeductions)}</div></div>
        <div style='display:flex;justify-content:space-between;margin-top:6px;font-weight:700;'><div>Net Salary</div><div style='color:#047857;'>${formatPKR(netSalary)}</div></div>
      </div>
    `

    const tableRows = daily.map(r=> `
      <tr>
        <td style='padding:6px 8px;border:1px solid #e2e8f0;'>${r.date}</td>
        <td style='padding:6px 8px;border:1px solid #e2e8f0;'>${shiftName(r.shift)}</td>
        <td style='padding:6px 8px;border:1px solid #e2e8f0;'>${r.status}</td>
        <td style='padding:6px 8px;border:1px solid #e2e8f0;'>${r.clockIn||'—'}</td>
        <td style='padding:6px 8px;border:1px solid #e2e8f0;'>${r.clockOut||'—'}</td>
        <td style='padding:6px 8px;border:1px solid #e2e8f0;'>${r.status==='present'? fmtHours(r.minutes) : '—'}</td>
      </tr>`).join('')

    const table = `
      <table style='width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;'>
        <thead>
          <tr>
            ${['Date','Shift','Status','Clock In','Clock Out','Hours'].map(h=>`<th style='text-align:left;padding:6px 8px;border:1px solid #e2e8f0;background:#f8fafc;'>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${tableRows || `<tr><td colspan='6' style='text-align:center;padding:10px;border:1px solid #e2e8f0;color:#64748b;'>No records</td></tr>`}</tbody>
      </table>
    `

    const html = `<!doctype html><html><head><meta charset='utf-8'/><title>Staff Report</title></head>
      <body style='font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a;padding:16px;'>
        ${head}
        ${attCards}
        ${salary}
        ${table}
      </body></html>`

    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    document.body.appendChild(frame)
    const doc = frame.contentWindow?.document || frame.contentDocument
    if (!doc) return
    doc.open(); doc.write(html); doc.close()
    frame.onload = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch {} setTimeout(()=>{ document.body.removeChild(frame) }, 100) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Staff Report</h3>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="btn-outline-navy">Export CSV</button>
            <button onClick={()=>exportPdf()} className="btn-outline-navy">Export PDF</button>
            <button onClick={onClose} className="btn-outline-navy">Close</button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex flex-wrap items-end gap-3">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search staff by name..." className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select value={selected?.id ?? ''} onChange={e=>setSelectedId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              {filtered.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {selected ? (
            <div className="space-y-4">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="font-medium text-slate-800">{selected.name}</div>
                <div className="text-sm text-slate-600">{selected.position || '—'}</div>
              </div>

              <div className="text-sm text-slate-700">Monthly Report - {formatMonth(month)}</div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="font-semibold text-slate-800 mb-2">Attendance</div>
                  <div className="grid grid-cols-4 gap-3">
                    <StatCard label="Present" value={stats.presentDays} color="bg-green-50 text-green-700" />
                    <StatCard label="Absents" value={stats.absentDays} color="bg-rose-50 text-rose-700" />
                    <StatCard label="Late Arrivals" value={stats.late} color="bg-amber-50 text-amber-700" />
                    <StatCard label="Working Days" value={stats.workingDays} color="bg-slate-50 text-slate-700" />
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 mb-2">Salary</div>
                  <div className="rounded-lg border border-slate-200 p-4 text-sm">
                    <div className="flex items-center justify-between"><div>Basic Salary</div><div className="font-medium">{formatPKR(basicSalary)}</div></div>
                    <div className="flex items-center justify-between mt-2"><div className="text-slate-600">Deductions:</div><div></div></div>
                    <div className="flex items-center justify-between text-rose-700"><div>Late Arrivals ({stats.late})</div><div>-{formatPKR(lateDeduction)}</div></div>
                    <div className="flex items-center justify-between text-rose-700"><div>Absents ({stats.absentDays})</div><div>-{formatPKR(absentDeduction)}</div></div>
                    <div className="flex items-center justify-between text-rose-700"><div>Early Out ({stats.early})</div><div>-{formatPKR(earlyDeduction)}</div></div>
                    <div className="mt-1 flex items-center justify-between font-medium"><div>Total Deductions</div><div className="text-rose-600">-{formatPKR(totalDeductions)}</div></div>
                    <div className="mt-3 flex items-center justify-between font-semibold"><div>Net Salary</div><div className="text-emerald-600">{formatPKR(netSalary)}</div></div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 font-semibold text-slate-800">Daily Attendance</div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Shift</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Clock In</th>
                        <th className="px-3 py-2 font-medium">Clock Out</th>
                        <th className="px-3 py-2 font-medium">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {daily.map((r,idx)=> (
                        <tr key={idx}>
                          <td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2">{shiftName(r.shift)}</td>
                          <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${r.status==='present'?'bg-emerald-100 text-emerald-700': r.status==='absent'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}`}>{r.status}</span></td>
                          <td className="px-3 py-2">{r.clockIn || '—'}</td>
                          <td className="px-3 py-2">{r.clockOut || '—'}</td>
                          <td className="px-3 py-2">{r.status==='present'? fmtHours(r.minutes) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500">No staff found.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, valueDisplay, color }: { label: string; value?: number; valueDisplay?: string; color: string }){
  return (
    <div className={`rounded-lg p-4 text-center ${color}`}>
      <div className="text-2xl font-bold">{valueDisplay ?? value ?? 0}</div>
      <div className="text-sm">{label}</div>
    </div>
  )
}
