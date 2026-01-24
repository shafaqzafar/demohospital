import { Request, Response } from 'express'
import { createOpdTokenSchema } from '../validators/token'
import { HospitalDepartment } from '../models/Department'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalToken } from '../models/Token'
import { HospitalCounter } from '../models/Counter'
import { HospitalDoctorSchedule } from '../models/DoctorSchedule'
import { HospitalAppointment } from '../models/Appointment'
import { LabPatient } from '../../lab/models/Patient'
import { CorporateCompany } from '../../corporate/models/Company'
import { LabCounter } from '../../lab/models/Counter'
import { HospitalAuditLog } from '../models/AuditLog'
import { postOpdTokenJournal, reverseJournalByRef } from './finance_ledger'
import { HospitalCashSession } from '../models/CashSession'
import { resolveOPDPrice } from '../../corporate/utils/price'
import { CorporateTransaction } from '../../corporate/models/Transaction'
import { HospitalSettings } from '../models/Settings'

function resolveOPDFee({ department, doctor, visitType }: any){
  const isFollowup = visitType === 'followup'
  if (doctor && Array.isArray(department.doctorPrices)){
    const match = department.doctorPrices.find((p: any) => String(p.doctorId) === String(doctor._id))
    if (match && match.price != null) return { fee: match.price, source: 'department-mapping' }
  }
  if (doctor){
    if (isFollowup && doctor.opdFollowupFee != null) return { fee: doctor.opdFollowupFee, source: 'followup-doctor' }
    if (doctor.opdBaseFee != null) return { fee: doctor.opdBaseFee, source: 'doctor' }
  }
  if (isFollowup && department.opdFollowupFee != null) return { fee: department.opdFollowupFee, source: 'followup-department' }
  return { fee: department.opdBaseFee, source: 'department' }
}

async function nextTokenNo(){
  const dateIso = new Date().toISOString().slice(0,10)
  const key = `opd_token_${dateIso}`
  const c = await HospitalCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seq = String(c.seq || 1).padStart(3,'0')
  return { tokenNo: seq, dateIso }
}

function toMin(hhmm: string){ const [h,m] = (hhmm||'').split(':').map(x=>parseInt(x,10)||0); return h*60+m }
function fromMin(min: number){ const h = Math.floor(min/60).toString().padStart(2,'0'); const m = (min%60).toString().padStart(2,'0'); return `${h}:${m}` }
function computeSlotIndex(startTime: string, endTime: string, slotMinutes: number, apptStart: string){
  const start = toMin(startTime), end = toMin(endTime), ap = toMin(apptStart)
  if (ap < start || ap >= end) return null
  const delta = ap - start
  if (delta % (slotMinutes||15) !== 0) return null
  return Math.floor(delta / (slotMinutes||15)) + 1
}
function computeSlotStartEnd(startTime: string, slotMinutes: number, slotNo: number){
  const start = toMin(startTime) + (slotNo-1)*(slotMinutes||15)
  return { start: fromMin(start), end: fromMin(start + (slotMinutes||15)) }
}

async function nextMrn(){
  const now = new Date()
  const year = now.getFullYear()
  const yy = String(year).slice(-2)
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yymm = yy+mm
  const key = `lab_mrn_${yymm}`
  const c = await LabCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seqNum = Number((c as any)?.seq || 1)

  let fmt = ''
  let hospCode = ''
  try {
    const s: any = await HospitalSettings.findOne().lean()
    fmt = String(s?.mrFormat || '').trim()
    hospCode = String(s?.code || '').trim()
  } catch {}

  if (fmt) {
    const widthMatch = fmt.match(/\{SERIAL(\d+)\}/i)
    const width = widthMatch ? Math.max(1, parseInt(widthMatch[1], 10) || 6) : 6
    const serial = String(seqNum).padStart(width, '0')
    let out = fmt
    out = out.replace(/\{HOSP\}/gi, hospCode || 'HOSP')
    out = out.replace(/\{DEPT\}/gi, 'OPD')
    out = out.replace(/\{YEAR\}/gi, String(year))
    out = out.replace(/\{YYYY\}/gi, String(year))
    out = out.replace(/\{YY\}/gi, yy)
    out = out.replace(/\{MONTH\}/gi, mm)
    out = out.replace(/\{MM\}/gi, mm)
    out = out.replace(/\{SERIAL\d*\}/gi, serial)
    return out
  }

  const seq = String(seqNum).padStart(6,'0')
  return `MR-${yymm}-${seq}`
}

export async function createOpd(req: Request, res: Response){
  const data = createOpdTokenSchema.parse(req.body)
  if ((data as any).corporateId){
    const comp = await CorporateCompany.findById(String((data as any).corporateId)).lean()
    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })
    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
  }

  // Resolve patient
  let patient = null as any
  const normDigits = (s?: string) => (s||'').replace(/\D+/g,'')
  if (data.patientId){
    patient = await LabPatient.findById(data.patientId)
    if (!patient) return res.status(404).json({ error: 'Patient not found' })
    // Patch demographics if provided
    const patch: any = {}
    if (data.patientName) patch.fullName = data.patientName
    if (data.guardianName) patch.fatherName = data.guardianName
    if (data.guardianRel) patch.guardianRel = data.guardianRel
    if (data.gender) patch.gender = data.gender
    if (data.address) patch.address = data.address
    if (data.age) patch.age = data.age
    if ((data as any).phone) patch.phoneNormalized = normDigits((data as any).phone)
    if ((data as any).cnic) patch.cnicNormalized = normDigits((data as any).cnic)
    if (Object.keys(patch).length){ patient = await LabPatient.findByIdAndUpdate(data.patientId, { $set: patch }, { new: true }) }
  } else if (data.mrn){
    patient = await LabPatient.findOne({ mrn: data.mrn })
    if (!patient) return res.status(404).json({ error: 'Patient not found' })
    // Patch demographics if provided
    const patch: any = {}
    if (data.patientName) patch.fullName = data.patientName
    if (data.guardianName) patch.fatherName = data.guardianName
    if (data.guardianRel) patch.guardianRel = data.guardianRel
    if (data.gender) patch.gender = data.gender
    if (data.address) patch.address = data.address
    if (data.age) patch.age = data.age
    if ((data as any).phone) patch.phoneNormalized = normDigits((data as any).phone)
    if ((data as any).cnic) patch.cnicNormalized = normDigits((data as any).cnic)
    if (Object.keys(patch).length){ patient = await LabPatient.findByIdAndUpdate(patient._id, { $set: patch }, { new: true }) }
  } else {
    if (!data.patientName) return res.status(400).json({ error: 'patientName or patientId/mrn required' })
    const mrn = await nextMrn()
    patient = await LabPatient.create({
      mrn,
      fullName: data.patientName,
      fatherName: data.guardianName,
      guardianRel: (data as any).guardianRel,
      phoneNormalized: normDigits((data as any).phone) || undefined,
      cnicNormalized: normDigits((data as any).cnic) || undefined,
      gender: (data as any).gender,
      age: (data as any).age,
      address: (data as any).address,
      createdAtIso: new Date().toISOString(),
    })
  }

  // Department & doctor
  const department = await HospitalDepartment.findById(data.departmentId).lean()
  if (!department) return res.status(400).json({ error: 'Invalid departmentId' })
  let doctor: any = null
  if (data.doctorId){
    doctor = await HospitalDoctor.findById(data.doctorId).lean()
    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })
  }

  // Price resolution with optional override (may be overridden by schedule later)
  const baseFeeInfo = resolveOPDFee({ department, doctor, visitType: data.visitType })
  const hasOverride = (data as any).overrideFee != null
  const overrideFee = hasOverride ? Number((data as any).overrideFee) : undefined
  let feeSource = baseFeeInfo.source
  let resolvedFee = baseFeeInfo.fee

  // Create OPD Encounter
  const enc = await HospitalEncounter.create({
    patientId: patient._id,
    type: 'OPD',
    status: 'in-progress',
    departmentId: data.departmentId,
    doctorId: data.doctorId,
    corporateId: (data as any).corporateId || undefined,
    corporatePreAuthNo: (data as any).corporatePreAuthNo,
    corporateCoPayPercent: (data as any).corporateCoPayPercent,
    corporateCoverageCap: (data as any).corporateCoverageCap,
    startAt: new Date(),
    visitType: data.visitType,
    consultationFeeResolved: 0, // placeholder, set below once fee finalized
    feeSource: '',
    paymentRef: data.paymentRef,
  })

  // Determine scheduling and token numbering
  let dateIso = new Date().toISOString().slice(0,10)
  let tokenNo = ''
  let scheduleId: any = null
  let slotNo: number | undefined
  let slotStart: string | undefined
  let slotEnd: string | undefined

  if ((data as any).scheduleId){
    const sched: any = await HospitalDoctorSchedule.findById((data as any).scheduleId).lean()
    if (!sched) return res.status(400).json({ error: 'Invalid scheduleId' })
    if (data.doctorId && String(sched.doctorId) !== String(data.doctorId)) return res.status(400).json({ error: 'Schedule does not belong to selected doctor' })
    scheduleId = sched._id
    dateIso = String(sched.dateIso)
    const slotMinutes = Number(sched.slotMinutes || 15)
    const apptStart = (data as any).apptStart as string | undefined
    if (apptStart){
      const idx = computeSlotIndex(sched.startTime, sched.endTime, slotMinutes, apptStart)
      if (!idx) return res.status(400).json({ error: 'apptStart outside schedule or not aligned to slot' })
      // ensure slot free
      const clash = await HospitalToken.findOne({ scheduleId: sched._id, slotNo: idx }).lean()
      if (clash) return res.status(409).json({ error: 'Selected slot already booked' })
      const clashAppt = await HospitalAppointment.findOne({ scheduleId: sched._id, slotNo: idx, status: { $in: ['booked','confirmed','checked-in'] } }).lean()
      if (clashAppt) return res.status(409).json({ error: 'Selected slot already booked (appointment)' })
      slotNo = idx
      const se = computeSlotStartEnd(sched.startTime, slotMinutes, idx)
      slotStart = se.start
      slotEnd = se.end
    } else {
      // auto assign next free slot
      const totalSlots = Math.floor((toMin(sched.endTime) - toMin(sched.startTime)) / slotMinutes)
      const taken = await HospitalToken.find({ scheduleId: sched._id }).select('slotNo').lean()
      const appts = await HospitalAppointment.find({ scheduleId: sched._id, status: { $in: ['booked','confirmed','checked-in'] } }).select('slotNo').lean()
      const used = new Set<number>([...((taken||[]).map((t:any)=> Number(t.slotNo||0))), ...((appts||[]).map((a:any)=> Number(a.slotNo||0)))])
      let idx = 0
      for (let i=1;i<=totalSlots;i++){ if (!used.has(i)){ idx = i; break } }
      if (!idx) return res.status(409).json({ error: 'No free slot available in this schedule' })
      slotNo = idx
      const se = computeSlotStartEnd(sched.startTime, slotMinutes, idx)
      slotStart = se.start
      slotEnd = se.end
    }
    // fee from schedule if provided
    if (!hasOverride){
      if (data.visitType === 'followup' && (sched as any).followupFee != null){ resolvedFee = Number((sched as any).followupFee); feeSource = 'schedule-followup' }
      else if ((sched as any).fee != null){ resolvedFee = Number((sched as any).fee); feeSource = 'schedule' }
    }
    tokenNo = String(slotNo)
  } else {
    // No schedule provided: fallback to global sequential token
    const next = await nextTokenNo()
    tokenNo = next.tokenNo
    dateIso = next.dateIso
  }

  const finalFee = hasOverride ? Math.max(0, Number(overrideFee)) : Math.max(0, resolvedFee - (data.discount || 0))

  // Corporate pricing (does not change patient fee in this phase; only records ledger)
  let corporatePricing: { price: number; appliedRuleId?: string } | null = null
  const corporateId = (data as any).corporateId ? String((data as any).corporateId) : ''
  if (corporateId){
    try {
      const corp = await resolveOPDPrice({ companyId: corporateId, departmentId: String(data.departmentId), doctorId: data.doctorId || undefined, visitType: data.visitType as any, defaultPrice: finalFee })
      corporatePricing = { price: Number(corp.price||0), appliedRuleId: String(corp.appliedRuleId||'') }
    } catch {}
  }

  const tok = await HospitalToken.create({
    dateIso,
    tokenNo,
    patientId: patient._id,
    mrn: patient.mrn,
    patientName: patient.fullName,
    departmentId: data.departmentId,
    doctorId: data.doctorId,
    encounterId: enc._id,
    corporateId: corporateId || undefined,
    fee: finalFee,
    discount: Number(data.discount || 0),
    status: 'queued',
    scheduleId,
    slotNo,
    slotStart,
    slotEnd,
  })

  // Update encounter fee resolution now that finalFee is known
  try { await HospitalEncounter.findByIdAndUpdate(enc._id, { $set: { consultationFeeResolved: finalFee, feeSource } }) } catch {}

  // Finance: post OPD revenue and doctor share accrual
  try {
    // Determine paid method: treat corporate as AR, otherwise Cash
    const paidMethod = (data as any).corporateId ? 'AR' : 'Cash'
    // Attach sessionId if a cash drawer session is open for this user and method is Cash
    let sessionId: string | undefined = undefined
    if (paidMethod === 'Cash'){
      try{
        const userId = String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || '')
        if (userId){
          const sess: any = await HospitalCashSession.findOne({ status: 'open', userId }).sort({ createdAt: -1 }).lean()
          if (sess) sessionId = String(sess._id)
        }
      } catch {}
    }
    await postOpdTokenJournal({
      tokenId: String((tok as any)._id),
      dateIso,
      fee: finalFee,
      doctorId: data.doctorId,
      departmentId: data.departmentId,
      patientId: String((patient as any)?._id || ''),
      patientName: String((patient as any)?.fullName || ''),
      mrn: String((patient as any)?.mrn || ''),
      tokenNo,
      paidMethod: paidMethod as any,
      sessionId,
    })
  } catch (e) {
    // do not fail token creation if finance posting has an error
    console.warn('Finance posting failed for OPD token', e)
  }

  // Audit: token_generate
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'token_generate',
      label: 'TOKEN_GENERATE',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token #${tokenNo} — MRN ${patient.mrn} — Dept ${(department as any)?.name || data.departmentId} — Doctor ${doctor?.name || 'N/A'} — Fee ${finalFee}`,
    })
  } catch {}

  // Corporate: create transaction ledger line (OPD)
  if (corporateId && corporatePricing){
    try {
      const baseCorp = Number(corporatePricing.price||0)
      const encDoc: any = enc
      const coPayPct = Math.max(0, Math.min(100, Number(encDoc?.corporateCoPayPercent || (data as any)?.corporateCoPayPercent || 0)))
      const coPayAmt = Math.max(0, baseCorp * (coPayPct/100))
      let net = Math.max(0, baseCorp - coPayAmt)
      const cap = Number(encDoc?.corporateCoverageCap || (data as any)?.corporateCoverageCap || 0) || 0
      if (cap > 0){
        try {
          const existing = await CorporateTransaction.find({ encounterId: enc._id }).select('netToCorporate').lean()
          const used = (existing || []).reduce((s: number, t: any)=> s + Number(t?.netToCorporate||0), 0)
          const remaining = Math.max(0, cap - used)
          net = Math.max(0, Math.min(net, remaining))
        } catch {}
      }
      await CorporateTransaction.create({
        companyId: corporateId,
        patientMrn: String((patient as any)?.mrn || ''),
        patientName: String((patient as any)?.fullName || ''),
        serviceType: 'OPD',
        refType: 'opd_token',
        refId: String((tok as any)?._id || ''),
        encounterId: enc._id as any,
        dateIso,
        departmentId: String(data.departmentId),
        doctorId: data.doctorId ? String(data.doctorId) : undefined,
        description: 'OPD Consultation',
        qty: 1,
        unitPrice: Number(finalFee||0),
        corpUnitPrice: baseCorp,
        coPay: coPayAmt,
        netToCorporate: net,
        corpRuleId: corporatePricing.appliedRuleId || '',
        status: 'accrued',
      })
    } catch (e) {
      console.warn('Failed to create corporate transaction for OPD token', e)
    }
  }

  res.status(201).json({ token: tok, encounter: enc, pricing: { feeResolved: hasOverride ? finalFee : resolvedFee, discount: data.discount || 0, finalFee, feeSource: hasOverride ? 'override' : feeSource }, corporate: corporatePricing || undefined })
}

export async function list(req: Request, res: Response){
  const q = req.query as any
  const date = q.date ? String(q.date) : ''
  const from = q.from ? String(q.from) : ''
  const to = q.to ? String(q.to) : ''
  const status = q.status ? String(q.status) : ''
  const doctorId = q.doctorId ? String(q.doctorId) : ''
  const scheduleId = q.scheduleId ? String(q.scheduleId) : ''
  const departmentId = q.departmentId ? String(q.departmentId) : ''
  const crit: any = {}
  if (date) {
    crit.dateIso = date
  } else if (from || to) {
    crit.dateIso = {}
    if (from) crit.dateIso.$gte = from
    if (to) crit.dateIso.$lte = to
  }
  if (status) crit.status = status
  if (doctorId) crit.doctorId = doctorId
  if (departmentId) crit.departmentId = departmentId
  if (scheduleId) crit.scheduleId = scheduleId
  const rows = await HospitalToken.find(crit)
    .sort({ createdAt: 1 })
    .populate('doctorId', 'name')
    .populate('departmentId', 'name')
    .populate('patientId', 'mrn fullName fatherName gender age guardianRel phoneNormalized cnicNormalized address')
    .lean()
  res.json({ tokens: rows })
}

export async function updateStatus(req: Request, res: Response){
  const id = req.params.id
  const status = String((req.body as any).status || '')
  if (!['queued','in-progress','completed','returned','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
  const tok = await HospitalToken.findByIdAndUpdate(id, { status }, { new: true })
  if (!tok) return res.status(404).json({ error: 'Token not found' })
  // Finance: reverse accruals if token is returned or cancelled
  if (status === 'returned' || status === 'cancelled'){
    try { await reverseJournalByRef('opd_token', String(id), `Auto reversal for token ${status}`) } catch (e) { console.warn('Finance reversal failed', e) }
    // Corporate: create reversal lines for OPD corporate transactions
    try {
      const existing: any[] = await CorporateTransaction.find({ refType: 'opd_token', refId: String(id), status: { $ne: 'reversed' } }).lean()
      for (const tx of existing){
        // Mark original as reversed
        try { await CorporateTransaction.findByIdAndUpdate(String(tx._id), { $set: { status: 'reversed' } }) } catch {}
        // Create negative reversal (accrued) for next claim cycle
        try {
          await CorporateTransaction.create({
            companyId: tx.companyId,
            patientMrn: tx.patientMrn,
            patientName: tx.patientName,
            serviceType: tx.serviceType,
            refType: tx.refType,
            refId: tx.refId,
            encounterId: (tok as any)?.encounterId || undefined,
            dateIso: (tok as any)?.dateIso || new Date().toISOString().slice(0,10),
            departmentId: tx.departmentId,
            doctorId: tx.doctorId,
            description: `Reversal: ${tx.description || 'OPD Consultation'}`,
            qty: tx.qty,
            unitPrice: -Math.abs(Number(tx.unitPrice||0)),
            corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),
            coPay: -Math.abs(Number(tx.coPay||0)),
            netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),
            corpRuleId: tx.corpRuleId,
            status: 'accrued',
            reversalOf: String(tx._id),
          })
        } catch (e) { console.warn('Failed to create corporate reversal for OPD token', e) }
      }
    } catch (e) { console.warn('Corporate reversal lookup failed', e) }
  }
  // Audit: status change mapping
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    const mapping: any = {
      returned: { action: 'token_return', label: 'TOKEN_RETURN' },
      cancelled: { action: 'token_delete', label: 'TOKEN_DELETE' },
    }
    const meta = mapping[status] || { action: 'token_status_update', label: 'TOKEN_STATUS' }
    await HospitalAuditLog.create({
      actor,
      action: meta.action,
      label: meta.label,
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token #${(tok as any).tokenNo || id} — Status ${status}`,
    })
  } catch {}
  res.json({ token: tok })
}

export async function update(req: Request, res: Response){
  const id = String(req.params.id || '')
  if (!id) return res.status(400).json({ error: 'id required' })
  const body: any = req.body || {}
  const hasDiscount = Object.prototype.hasOwnProperty.call(body, 'discount')
  if (!hasDiscount) return res.status(400).json({ error: 'No fields to update' })

  const tok: any = await HospitalToken.findById(id)
  if (!tok) return res.status(404).json({ error: 'Token not found' })
  if (tok.status === 'cancelled') return res.status(400).json({ error: 'Cancelled token cannot be edited' })

  const currentFee = Number(tok.fee || 0)
  const currentDiscount = Number(tok.discount || 0)
  const baseGross = Math.max(0, currentFee + currentDiscount)
  const newDiscount = Math.max(0, Number(body.discount || 0))
  if (newDiscount > baseGross) return res.status(400).json({ error: 'Discount exceeds fee' })
  const newFee = Math.max(0, baseGross - newDiscount)

  const updated = await HospitalToken.findByIdAndUpdate(id, { $set: { discount: newDiscount, fee: newFee } }, { new: true })
  if (!updated) return res.status(404).json({ error: 'Token not found' })

  // Patch encounter fee
  try { if ((tok as any)?.encounterId) await HospitalEncounter.findByIdAndUpdate((tok as any).encounterId, { $set: { consultationFeeResolved: newFee } }) } catch {}

  // Finance: reverse and repost with new fee
  try {
    await reverseJournalByRef('opd_token', String(id), 'Repost for token edit')
    await postOpdTokenJournal({
      tokenId: String(id),
      dateIso: String((tok as any)?.dateIso || new Date().toISOString().slice(0,10)),
      fee: newFee,
      doctorId: String((tok as any)?.doctorId || '' ) || undefined,
      departmentId: String((tok as any)?.departmentId || '' ) || undefined,
      patientId: String((tok as any)?.patientId || '' ) || undefined,
      patientName: String((tok as any)?.patientName || '' ) || undefined,
      mrn: String((tok as any)?.mrn || '' ) || undefined,
      tokenNo: String((tok as any)?.tokenNo || '' ) || undefined,
    })
  } catch (e) { console.warn('Finance repost failed for token edit', e) }

  // Audit
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'token_edit',
      label: 'TOKEN_EDIT',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token #${(tok as any)?.tokenNo || id} — Discount ${currentDiscount} -> ${newDiscount}, Fee ${currentFee} -> ${newFee}`,
    })
  } catch {}

  res.json({ token: updated })
}
