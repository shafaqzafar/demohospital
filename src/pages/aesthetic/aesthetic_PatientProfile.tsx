import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { aestheticApi, labApi } from '../../utils/api'
import SignaturePad from '../../components/common/SignaturePad'

export default function Aesthetic_PatientProfile(){
  const { mrn = '' } = useParams()
  const [patient, setPatient] = useState<any|null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [consents, setConsents] = useState<any[]>([])

  const [addSessionOpen, setAddSessionOpen] = useState(false)
  const [catalog, setCatalog] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])

  const [sessionForm, setSessionForm] = useState({ procedureId: '', date: new Date().toISOString().slice(0,16), price: '', discount: '0', paid: '0', notes: '' })
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentForm, setConsentForm] = useState<{ templateId: string; signature?: string }>({ templateId: '' })

  const patientId = useMemo(()=> String(patient?._id||''), [patient])

  const [payOpen, setPayOpen] = useState(false)
  const [paySession, setPaySession] = useState<any|null>(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', note: '' })

  const [nextOpen, setNextOpen] = useState(false)
  const [nextSession, setNextSession] = useState<any|null>(null)
  const [nextDate, setNextDate] = useState<string>(new Date().toISOString().slice(0,10))

  useEffect(()=>{
    let cancelled = false
    async function load(){
      try {
        const p = await labApi.getPatientByMrn(String(mrn)) as any
        if (cancelled) return
        setPatient(p?.patient || p || null)
      } catch {
        setPatient(null)
      } finally { setLoading(false) }
    }
    load()
    return ()=>{ cancelled = true }
  }, [mrn])

  const refreshSessions = async ()=>{
    if (!mrn) return
    try {
      const r: any = await aestheticApi.listProcedureSessions({ patientMrn: String(mrn), page: 1, limit: 50 })
      setSessions(r.items || [])
    } catch { setSessions([]) }
  }
  const refreshConsents = async ()=>{
    if (!mrn) return
    try {
      const r: any = await aestheticApi.listConsents({ patientMrn: String(mrn), page: 1, limit: 50 })
      setConsents(r.items || [])
    } catch { setConsents([]) }
  }

  useEffect(()=>{ refreshSessions(); refreshConsents() }, [mrn])
  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      try { const r: any = await aestheticApi.listProcedureCatalog({ limit: 200 }); if (!cancelled) setCatalog(r.items || []) } catch {}
      try { const r: any = await aestheticApi.listConsentTemplates({ limit: 200 }); if (!cancelled) setTemplates(r.items || []) } catch {}
    })()
    return ()=>{ cancelled=true }
  }, [])

  const stats = useMemo(()=>{
    const totalPaid = sessions.reduce((s, x)=> s + Number(x.paid||0), 0)
    const totalBalance = sessions.reduce((s, x)=> s + Number(x.balance||0), 0)
    const lastTs = sessions.reduce((m,x)=> Math.max(m, new Date(x.date).getTime()), 0)
    const lastVisit = lastTs ? new Date(lastTs) : null
    const today = new Date(); today.setHours(0,0,0,0)
    const upcoming = sessions.map(s=> s.nextVisitDate ? new Date(s.nextVisitDate) : null)
      .filter((d): d is Date => !!d && !isNaN(d.getTime()) && d >= today)
      .sort((a,b)=> a.getTime() - b.getTime())
    const nextVisit = upcoming[0] || null
    return { totalPaid, totalBalance, lastVisit, nextVisit }
  }, [sessions])

  const addSession = async ()=>{
    if (!patient) return
    const proc = catalog.find((x:any)=> String(x._id)===String(sessionForm.procedureId))
    const created: any = await aestheticApi.createProcedureSession({
      labPatientId: patientId,
      patientMrn: String(patient.mrn||'') || undefined,
      patientName: String(patient.fullName||'') || undefined,
      phone: String(patient.phoneNormalized||'') || undefined,
      procedureId: String(sessionForm.procedureId),
      procedureName: proc?.name,
      date: new Date(sessionForm.date).toISOString(),
      price: Number(sessionForm.price||0),
      discount: Number(sessionForm.discount||0),
      paid: 0,
      notes: sessionForm.notes||'',
      status: 'planned',
    })
    if (Number(sessionForm.paid||0) > 0){
      try { await aestheticApi.addProcedureSessionPayment(String(created?._id||created?.id||''), { amount: Number(sessionForm.paid||0), note: 'Initial payment' }) } catch {}
    }
    setAddSessionOpen(false)
    setSessionForm({ procedureId: '', date: new Date().toISOString().slice(0,16), price: '', discount: '0', paid: '0', notes: '' })
    await refreshSessions()
  }

  const updateSession = async (id: string, patch: any)=>{
    await aestheticApi.updateProcedureSession(id, patch)
    await refreshSessions()
  }

  const uploadImage = (file: File): Promise<string>=> new Promise((resolve, reject)=>{
    const reader = new FileReader()
    reader.onload = ()=> resolve(String(reader.result||''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const addImages = async (s: any, kind: 'before'|'after', files: FileList|null)=>{
    if (!files || !files.length) return
    const arr = await Promise.all(Array.from(files).map(f=> uploadImage(f)))
    const patch = kind==='before' ? { beforeImages: [ ...(s.beforeImages||[]), ...arr ] } : { afterImages: [ ...(s.afterImages||[]), ...arr ] }
    await updateSession(s._id, patch)
  }

  const openConsent = ()=>{ setConsentOpen(true); setConsentForm({ templateId: templates[0]?._id || '' }) }
  const saveConsent = async ()=>{
    const t = templates.find(x=> String(x._id)===String(consentForm.templateId))
    await aestheticApi.createConsent({
      templateId: String(consentForm.templateId),
      templateName: t?.name,
      templateVersion: t?.version,
      patientMrn: String(patient?.mrn||'') || undefined,
      labPatientId: patientId || undefined,
      patientName: String(patient?.fullName||'') || undefined,
      signedAt: new Date().toISOString(),
      signatureDataUrl: consentForm.signature || undefined,
    })
    setConsentOpen(false)
    setConsentForm({ templateId: '' })
    await refreshConsents()
  }

  if (loading) return <div className="p-4">Loading...</div>
  if (!patient) return <div className="p-4 text-slate-600">No patient found for MRN: {mrn}</div>

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">{patient.fullName}</div>
          <div className="text-sm text-slate-500">MRN: {patient.mrn} • Phone: {patient.phoneNormalized || '-'} • Gender: {patient.gender || '-'} • Age: {patient.age || '-'}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={()=>setAddSessionOpen(true)}>+ Add Session</button>
          <button className="btn-outline-navy" onClick={openConsent}>+ New Consent</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">Total Paid</div>
          <div className="text-lg font-semibold">Rs {Math.round(stats.totalPaid).toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">Outstanding Balance</div>
          <div className="text-lg font-semibold">Rs {Math.round(stats.totalBalance).toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">Last Visit</div>
          <div className="text-lg font-semibold">{stats.lastVisit ? stats.lastVisit.toLocaleDateString() : '-'}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">Next Visit</div>
          <div className="text-lg font-semibold">{stats.nextVisit ? stats.nextVisit.toLocaleDateString() : '-'}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-3 py-2 font-medium">Sessions</div>
          <div className="divide-y divide-slate-200">
            {sessions.map(s => (
              <div key={s._id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.procedureName || s.procedureId} • {new Date(s.date).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Price: Rs {Number(s.price||0).toFixed(0)} • Discount: {Number(s.discount||0).toFixed(0)} • Paid: {Number(s.paid||0).toFixed(0)} • Balance: {Number(s.balance||0).toFixed(0)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-outline-navy text-xs" onClick={()=>updateSession(s._id, { status: s.status==='done' ? 'planned' : 'done' })}>{s.status==='done'?'Mark Planned':'Mark Done'}</button>
                    <button className="btn-outline-navy text-xs" onClick={()=>updateSession(s._id, { nextVisitDate: new Date(Date.now()+7*864e5).toISOString().slice(0,10) })}>Next Visit +7d</button>
                    <button className="btn-outline-navy text-xs" onClick={()=>{ setNextSession(s); setNextDate((s.nextVisitDate && String(s.nextVisitDate)) || new Date().toISOString().slice(0,10)); setNextOpen(true) }}>Schedule</button>
                    <button className="btn-outline-navy text-xs" onClick={()=>{ setPaySession(s); setPayForm({ amount: '', method: 'Cash', note: '' }); setPayOpen(true) }}>Add Payment</button>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-sm font-medium">Payments</div>
                  {(s.payments && s.payments.length>0) ? (
                    <div className="mt-1 space-y-1 text-sm">
                      {s.payments.map((p:any, idx:number)=> (
                        <div key={idx} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1">
                          <div>{new Date(p.dateIso||s.date).toLocaleString()}</div>
                          <div className="font-medium">Rs {Number(p.amount||0).toLocaleString()}</div>
                          <div className="text-xs text-slate-500">{p.method || 'Cash'}{p.note?` • ${p.note}`:''}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 mt-1">No payments yet</div>
                  )}
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium">Before</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(s.beforeImages||[]).map((src:string, idx:number)=> <img key={idx} src={src} className="h-16 w-16 object-cover rounded border" />)}
                    </div>
                    <input type="file" multiple accept="image/*" onChange={e=>addImages(s, 'before', e.target.files)} className="mt-2 text-xs" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">After</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(s.afterImages||[]).map((src:string, idx:number)=> <img key={idx} src={src} className="h-16 w-16 object-cover rounded border" />)}
                    </div>
                    <input type="file" multiple accept="image/*" onChange={e=>addImages(s, 'after', e.target.files)} className="mt-2 text-xs" />
                  </div>
                </div>
              </div>
            ))}
            {sessions.length===0 && <div className="p-6 text-center text-slate-500">No sessions</div>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-3 py-2 font-medium">Consents</div>
          <div className="divide-y divide-slate-200">
            {consents.map(c => (
              <div key={c._id} className="p-3">
                <div className="font-medium">{c.templateName || 'Consent'} • {new Date(c.signedAt).toLocaleString()}</div>
                {c.signatureDataUrl && <img src={c.signatureDataUrl} alt="signature" className="mt-1 h-16 object-contain" />}
                {c.attachments?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.attachments.map((a:string, idx:number)=> <img key={idx} src={a} className="h-16 w-16 object-cover rounded border" />)}
                  </div>
                ) : null}
              </div>
            ))}
            {consents.length===0 && <div className="p-6 text-center text-slate-500">No consents</div>}
          </div>
        </div>
      </div>

      {addSessionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4">
            <div className="text-base font-semibold mb-3">Add Session</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">Procedure</label>
                <select value={sessionForm.procedureId} onChange={e=>setSessionForm(s=>({ ...s, procedureId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {catalog.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Date & Time</label>
                <input type="datetime-local" value={sessionForm.date} onChange={e=>setSessionForm(s=>({ ...s, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Price</label>
                <input value={sessionForm.price} onChange={e=>setSessionForm(s=>({ ...s, price: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Discount</label>
                <input value={sessionForm.discount} onChange={e=>setSessionForm(s=>({ ...s, discount: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Paid</label>
                <input value={sessionForm.paid} onChange={e=>setSessionForm(s=>({ ...s, paid: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm">Notes</label>
                <textarea value={sessionForm.notes} onChange={e=>setSessionForm(s=>({ ...s, notes: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={()=>setAddSessionOpen(false)}>Cancel</button>
              <button className="rounded-md bg-fuchsia-700 px-3 py-1.5 text-sm text-white" onClick={addSession} disabled={!sessionForm.procedureId}>Save</button>
            </div>
          </div>
        </div>
      )}

      {consentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4">
            <div className="text-base font-semibold mb-3">New Consent</div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">Template</label>
                <select value={consentForm.templateId} onChange={e=>setConsentForm(s=>({ ...s, templateId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  {templates.map(t=> <option key={t._id} value={t._id}>{t.name} {t.version?`v${t.version}`:''}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Signature</label>
                <SignaturePad onChange={(d)=> setConsentForm(s=>({ ...s, signature: d || undefined }))} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={()=>setConsentOpen(false)}>Cancel</button>
              <button className="rounded-md bg-fuchsia-700 px-3 py-1.5 text-sm text-white" onClick={saveConsent} disabled={!consentForm.templateId}>Save</button>
            </div>
          </div>
        </div>
      )}

      {payOpen && paySession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <div className="text-base font-semibold mb-3">Add Payment</div>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm">Amount</label>
                <input value={payForm.amount} onChange={e=>setPayForm(s=>({ ...s, amount: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Method</label>
                <select value={payForm.method} onChange={e=>setPayForm(s=>({ ...s, method: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Bank</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Note</label>
                <input value={payForm.note} onChange={e=>setPayForm(s=>({ ...s, note: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={()=>{ setPayOpen(false); setPaySession(null) }}>Cancel</button>
              <button className="rounded-md bg-fuchsia-700 px-3 py-1.5 text-sm text-white" onClick={async()=>{ try { await aestheticApi.addProcedureSessionPayment(String(paySession._id), { amount: Number(payForm.amount||0), method: payForm.method, note: payForm.note }) } catch {}; setPayOpen(false); setPaySession(null); await refreshSessions() }} disabled={!payForm.amount}>Save</button>
            </div>
          </div>
        </div>
      )}

      {nextOpen && nextSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <div className="text-base font-semibold mb-3">Schedule Next Visit</div>
            <div>
              <label className="mb-1 block text-sm">Next Visit Date</label>
              <input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={()=>{ setNextOpen(false); setNextSession(null) }}>Cancel</button>
              <button className="rounded-md bg-fuchsia-700 px-3 py-1.5 text-sm text-white" onClick={async()=>{ try { await aestheticApi.setProcedureSessionNextVisit(String(nextSession._id), nextDate) } catch {}; setNextOpen(false); setNextSession(null); await refreshSessions() }} disabled={!nextDate}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
