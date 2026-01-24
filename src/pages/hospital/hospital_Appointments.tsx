import { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, financeApi } from '../../utils/api'

function todayIso(){ return new Date().toISOString().slice(0,10) }

function SummaryCard({ title, amount, tone }: { title: string; amount: number; tone: 'emerald'|'sky'|'violet'|'amber' }){
  const toneMap: any = {
    emerald: 'text-emerald-700 bg-emerald-50',
    sky: 'text-sky-700 bg-sky-50',
    violet: 'text-violet-700 bg-violet-50',
    amber: 'text-amber-700 bg-amber-50',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-600">{title}</div>
      <div className={`mt-1 text-xl font-semibold ${toneMap[tone]||''} inline-block rounded px-2 py-1`}>Rs {Number(amount||0).toFixed(2)}</div>
    </div>
  )
}
function toMin(hhmm: string){ const [h,m] = (hhmm||'').split(':').map(x=>parseInt(x,10)||0); return h*60+m }
function fromMin(min: number){ const h = Math.floor(min/60).toString().padStart(2,'0'); const m = (min%60).toString().padStart(2,'0'); return `${h}:${m}` }

export default function Hospital_Appointments(){
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([])
  const [doctorId, setDoctorId] = useState('')
  const [dateIso, setDateIso] = useState(todayIso())
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
  const [selectedSlotNo, setSelectedSlotNo] = useState<number | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)

  const [newPat, setNewPat] = useState({ name: '', phone: '', gender: '', age: '', notes: '' })
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [apptMap, setApptMap] = useState<Record<string, any[]>>({})
  const [tokenMap, setTokenMap] = useState<Record<string, number[]>>({})

  // Phone suggestions (incremental, like Token Generator)
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!phoneSuggestWrapRef.current) return
      if (!phoneSuggestWrapRef.current.contains(e.target as any)) setPhoneSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(()=>{ (async()=>{
    try{
      const res: any = await hospitalApi.listDoctors()
      const list = (res?.doctors||[]).map((d: any)=>({ id: String(d._id), name: d.name }))
      setDoctors(list)
    }catch{}
  })() }, [])

  useEffect(()=>{ if (doctorId && dateIso) loadSchedules() }, [doctorId, dateIso])

  // Doctor payable widgets (summary & balance)
  const [docBalance, setDocBalance] = useState<number | null>(null)
  const [docSummary, setDocSummary] = useState<{ opd: number; ipd: number; procedure: number; payouts: number; net: number }>({ opd: 0, ipd: 0, procedure: 0, payouts: 0, net: 0 })
  useEffect(()=>{
    let cancelled = false
    async function load(){
      if (!doctorId){ setDocBalance(null); setDocSummary({ opd:0, ipd:0, procedure:0, payouts:0, net:0 }); return }
      try{ const b: any = await financeApi.doctorBalance(doctorId); if(!cancelled) setDocBalance(Number(b?.payable||0)) }catch{ if(!cancelled) setDocBalance(null) }
      try{
        const e: any = await financeApi.doctorEarnings({ doctorId, from: dateIso, to: dateIso })
        const items: any[] = Array.isArray(e?.earnings) ? e.earnings : []
        let opd=0, ipd=0, procedure=0, payouts=0
        for (const r of items){
          const t = String(r.type||'').toLowerCase()
          const amt = Number(r.amount||0)
          if (t==='opd') opd += amt
          else if (t==='ipd' || t.startsWith('ipd')) ipd += amt
          else if (t.startsWith('proc')) procedure += amt
          else if (t==='payout') payouts += amt
        }
        const net = opd + ipd + procedure + payouts
        if (!cancelled) setDocSummary({ opd, ipd, procedure, payouts, net })
      } catch { if (!cancelled) setDocSummary({ opd:0, ipd:0, procedure:0, payouts:0, net:0 }) }
    }
    load()
    return ()=>{ cancelled = true }
  }, [doctorId, dateIso])

  async function loadSchedules(){
    setLoading(true)
    setSelectedScheduleId('')
    setSelectedSlotNo(null)
    try{
      const res: any = await hospitalApi.listDoctorSchedules({ doctorId, date: dateIso })
      const rows: any[] = res?.schedules || []
      setSchedules(rows)
      // For each schedule, load appointments and tokens
      const apptMapLocal: Record<string, any[]> = {}
      const tokenMapLocal: Record<string, number[]> = {}
      for (const s of rows){
        try {
          const [ap, tk]: any = await Promise.all([
            hospitalApi.listAppointments({ scheduleId: String(s._id) }),
            hospitalApi.listTokens({ scheduleId: String(s._id) }),
          ])
          apptMapLocal[String(s._id)] = (ap?.appointments || [])
          tokenMapLocal[String(s._id)] = (tk?.tokens || []).map((t: any)=> Number(t.slotNo||0)).filter(Boolean)
        } catch {}
      }
      setApptMap(apptMapLocal)
      setTokenMap(tokenMapLocal)
    }catch{ setSchedules([]) }
    setLoading(false)
  }

  const slotsBySchedule = useMemo(()=>{
    const out: Record<string, Array<{ slotNo: number; start: string; end: string; status: 'free'|'appt'|'token'; appt?: any }>> = {}
    for (const s of schedules){
      const total = Math.max(0, Math.floor((toMin(s.endTime) - toMin(s.startTime)) / Math.max(5, Number(s.slotMinutes||15))))
      const appts = (apptMap[String(s._id)] || []) as any[]
      const tkUsed = new Set<number>((tokenMap[String(s._id)]||[]))
      const arr: Array<{ slotNo: number; start: string; end: string; status: 'free'|'appt'|'token'; appt?: any }> = []
      for (let i=1;i<=total;i++){
        const startMin = toMin(s.startTime) + (i-1)*Math.max(5, Number(s.slotMinutes||15))
        const se = { start: fromMin(startMin), end: fromMin(startMin + Math.max(5, Number(s.slotMinutes||15))) }
        const ap = appts.find(a => Number(a.slotNo||0) === i && ['booked','confirmed','checked-in'].includes(String(a.status||'')))
        if (ap) arr.push({ slotNo: i, ...se, status: 'appt', appt: ap })
        else if (tkUsed.has(i)) arr.push({ slotNo: i, ...se, status: 'token' })
        else arr.push({ slotNo: i, ...se, status: 'free' })
      }
      out[String(s._id)] = arr
    }
    return out
  }, [schedules, apptMap, tokenMap])

  

  async function onMrnKeyDown(e: React.KeyboardEvent<HTMLInputElement>){
    if (e.key !== 'Enter') return
    e.preventDefault()
    const mr = String((e.currentTarget.value||'').trim())
    if (!mr) return
    try{
      const r: any = await hospitalApi.searchPatients({ mrn: mr, limit: 5 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      const p = list.find(x => String(x.mrn||'').trim().toLowerCase() === mr.toLowerCase()) || list[0]
      if (p){
        setSelectedPatient(p)
        setNewPat(v=>({ ...v, name: p.fullName||v.name, phone: p.phoneNormalized||v.phone, gender: p.gender||v.gender, age: (p.age!=null? String(p.age):v.age) }))
        setPhoneSuggestOpen(false)
      }
    } catch {}
  }

  function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>){
    const v = e.target.value
    setNewPat(prev=>({ ...prev, phone: v }))
    const digits = (v||'').replace(/\D+/g,'')
    if ((window as any)._apptPhoneSuggestDeb) clearTimeout((window as any)._apptPhoneSuggestDeb)
    if (digits.length >= 3){
      ;(window as any)._apptPhoneSuggestDeb = setTimeout(()=> runPhoneSuggestLookup(digits), 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
  }

  async function runPhoneSuggestLookup(digits: string){
    try{
      phoneSuggestQueryRef.current = digits
      const r: any = await hospitalApi.searchPatients({ phone: digits, limit: 8 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (phoneSuggestQueryRef.current !== digits) return
      setPhoneSuggestItems(list)
      setPhoneSuggestOpen(list.length > 0)
    } catch {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
  }

  function selectPhoneSuggestion(p: any){
    setSelectedPatient(p)
    setNewPat(v=>({ ...v, name: p.fullName || v.name, phone: p.phoneNormalized || v.phone, gender: p.gender || v.gender, age: (p.age!=null? String(p.age):v.age) }))
    setPhoneSuggestOpen(false)
  }

  async function book(){
    setError(null); setInfo(null)
    if (!doctorId){ setError('Select a doctor'); return }
    if (!selectedScheduleId){ setError('Select a schedule'); return }
    if (!selectedSlotNo){ setError('Select a slot'); return }
    const isExisting = !!selectedPatient
    if (!isExisting && !newPat.name){ setError('Enter patient name for new patient'); return }
    setBooking(true)
    try{
      const payload: any = {
        doctorId,
        scheduleId: selectedScheduleId,
        slotNo: selectedSlotNo,
        notes: newPat.notes || undefined,
      }
      if (isExisting){
        payload.patientId = String(selectedPatient._id)
      } else {
        payload.patientName = newPat.name
        payload.phone = newPat.phone
        payload.gender = newPat.gender || undefined
        payload.age = newPat.age || undefined
      }
      await hospitalApi.createAppointment(payload)
      setInfo('Appointment booked')
      setSelectedSlotNo(null)
      setSelectedPatient(null)
      setNewPat({ name: '', phone: '', gender: '', age: '', notes: '' })
      await loadSchedules()
    }catch(e:any){ setError(e?.message || 'Failed to book appointment') }
    setBooking(false)
  }

  async function updateStatus(id: string, status: 'booked'|'confirmed'|'checked-in'|'cancelled'|'no-show'){
    try{ await hospitalApi.updateAppointmentStatus(id, status as any); await loadSchedules() } catch(e:any){ setError(e?.message||'Failed to update status') }
  }

  async function convert(id: string){
    setError(null); setInfo(null)
    try{
      const res: any = await hospitalApi.convertAppointmentToToken(id)
      const tok = res?.token
      if (tok && tok.tokenNo){ setInfo(`Converted to Token #${tok.tokenNo}`) }
      await loadSchedules()
    }catch(e:any){ setError(e?.message||'Failed to convert to token') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold text-slate-800">Appointments</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Doctor</label>
            <select value={doctorId} onChange={e=>setDoctorId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select doctor</option>
              {doctors.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
            <input type="date" value={dateIso} onChange={e=>setDateIso(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="md:col-span-3 flex items-end justify-end text-sm text-slate-600">{loading? 'Loading schedules...' : `${schedules.length} schedule(s)`}</div>
        </div>
      </div>

      {doctorId && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard title="OPD Earnings (day)" amount={docSummary.opd} tone="emerald" />
          <SummaryCard title="IPD Earnings (day)" amount={docSummary.ipd} tone="sky" />
          <SummaryCard title="Procedure Earnings (day)" amount={docSummary.procedure} tone="violet" />
          <SummaryCard title="Paid to Doctor (day)" amount={docSummary.payouts} tone="amber" />
          <SummaryCard title="Net Due (day)" amount={docSummary.net} tone="amber" />
          {docBalance!=null && <SummaryCard title="Doctor Payable Balance" amount={docBalance} tone={docBalance>=0? 'amber':'emerald'} />}
        </div>
      )}

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">{error}</div>}
      {info && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 text-sm">{info}</div>}

      {/* Schedules and Slots */}
      <div className="grid grid-cols-1 gap-4">
        {schedules.map(s => {
          const slots = slotsBySchedule[String(s._id)] || []
          const isSel = selectedScheduleId === String(s._id)
          return (
            <div key={String(s._id)} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-sm">
                <div className="font-medium text-slate-800">{s.startTime} - {s.endTime} • Slot {s.slotMinutes} min</div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">{(apptMap[String(s._id)]||[]).length} appointment(s)</span>
                  <button onClick={()=>{ setSelectedScheduleId(String(s._id)); setSelectedSlotNo(null) }} className={`rounded-md px-2 py-1 text-xs border ${isSel? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-700 border-slate-300'}`}>{isSel? 'Selected' : 'Select'}</button>
                </div>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {slots.map(sl => {
                    const taken = sl.status !== 'free'
                    const selected = isSel && selectedSlotNo === sl.slotNo
                    const cls = selected
                      ? 'border-violet-600 bg-violet-50 text-violet-700'
                      : taken ? (sl.status==='token' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-sky-300 bg-sky-50 text-sky-700')
                              : 'border-slate-300 bg-white text-slate-800'
                    return (
                      <button key={sl.slotNo}
                        disabled={!isSel || taken}
                        onClick={()=> setSelectedSlotNo(sl.slotNo)}
                        className={`rounded-md border px-2 py-2 text-xs text-left ${cls}`}
                        title={taken ? (sl.status==='token' ? 'Taken (Token)' : 'Taken (Appointment)') : 'Available'}
                      >
                        <div className="font-medium">{sl.start} - {sl.end}</div>
                        <div className="opacity-70">Slot {sl.slotNo}</div>
                        {sl.status==='appt' && <div className="mt-1 truncate">{sl.appt?.patientName || sl.appt?.mrn || '—'} ({sl.appt?.status})</div>}
                        {sl.status==='token' && <div className="mt-1">Booked via Token</div>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
        {(!loading && schedules.length===0) && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No schedules for this doctor on selected date.</div>
        )}
      </div>

      {/* Patient Information (Token Generator-like) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Patient Information</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <div ref={phoneSuggestWrapRef} className="relative">
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                placeholder="Type phone to search"
                value={newPat.phone}
                onChange={onPhoneChange}
                onFocus={()=>{ if (phoneSuggestItems.length>0) setPhoneSuggestOpen(true) }}
                ref={phoneRef}
              />
              {phoneSuggestOpen && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {phoneSuggestItems.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No results</div>
                  ) : (
                    phoneSuggestItems.map((p:any, idx:number) => (
                      <button
                        type="button"
                        key={p._id || idx}
                        onClick={() => selectPhoneSuggestion(p)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <div className="text-sm font-medium text-slate-800">{p.fullName || 'Unnamed'} <span className="text-xs text-slate-500">{p.mrn || '-'}</span></div>
                        <div className="text-xs text-slate-600">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                        {p.address && <div className="text-xs text-slate-500 truncate">{p.address}</div>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">MR Number</label>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="Enter MR# (e.g., MR-15)" onKeyDown={onMrnKeyDown} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Patient Name</label>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="Full Name" value={newPat.name} onChange={e=>setNewPat(v=>({ ...v, name: e.target.value }))} ref={nameRef} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="e.g., 25" value={newPat.age} onChange={e=>setNewPat(v=>({ ...v, age: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
            <select className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" value={newPat.gender} onChange={e=>setNewPat(v=>({ ...v, gender: e.target.value }))}>
              <option value="">Select gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="Any notes for the doctor" value={newPat.notes} onChange={e=>setNewPat(v=>({ ...v, notes: e.target.value }))} />
          </div>
          {selectedPatient && (
            <div className="md:col-span-3 text-xs text-emerald-700">Selected existing patient: {selectedPatient.fullName || '-'} — MRN {selectedPatient.mrn || '-'} <button onClick={()=>setSelectedPatient(null)} className="ml-2 rounded border border-slate-300 px-2 py-0.5 text-[11px]">Clear</button></div>
          )}
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <button onClick={book} disabled={booking} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white">{booking? 'Booking...' : 'Book Appointment'}</button>
          </div>
        </div>
      </div>

      {/* Appointments list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
          <div className="font-medium text-slate-800">Appointments on {dateIso || '-'}{doctorId? ' — '+(doctors.find(d=>d.id===doctorId)?.name||doctorId) : ''}</div>
          <div className="text-slate-600">{Object.values(apptMap).flat().filter(a=>String(a.dateIso||'')===dateIso && (!doctorId || String(a.doctorId||'')===doctorId)).length} item(s)</div>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Patient</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.flatMap(s => (apptMap[String(s._id)]||[]).filter(a=>String(a.dateIso||'')===dateIso).map(a=>({ appt: a, sched: s }))).sort((a,b)=> Number(a.appt.slotNo||0)-Number(b.appt.slotNo||0)).map(({ appt, sched }) => (
              <tr key={String(appt._id)} className="border-b border-slate-100">
                <td className="px-3 py-2 whitespace-nowrap">{appt.slotStart || fromMin(toMin(sched.startTime)+(Number(appt.slotNo||1)-1)*Math.max(5, Number(sched.slotMinutes||15)))} - {appt.slotEnd || ''}</td>
                <td className="px-3 py-2">{appt.patientName || appt.mrn || '—'}</td>
                <td className="px-3 py-2">{appt.phoneNormalized || '-'}</td>
                <td className="px-3 py-2">{appt.status}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {!appt.tokenId && (
                      <button onClick={()=>convert(String(appt._id))} className="rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-xs text-violet-700">Convert to Token</button>
                    )}
                    {appt.status !== 'confirmed' && appt.status !== 'checked-in' && appt.status !== 'cancelled' && (
                      <button onClick={()=>updateStatus(String(appt._id), 'confirmed')} className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Confirm</button>
                    )}
                    {appt.status !== 'cancelled' && (
                      <button onClick={()=>updateStatus(String(appt._id), 'cancelled')} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">Cancel</button>
                    )}
                    {appt.status !== 'checked-in' && appt.status !== 'cancelled' && (
                      <button onClick={()=>updateStatus(String(appt._id), 'checked-in')} className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-700">Check-in</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {schedules.every(s => (apptMap[String(s._id)]||[]).filter(a=>String(a.dateIso||'')===dateIso).length===0) && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No appointments</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}
