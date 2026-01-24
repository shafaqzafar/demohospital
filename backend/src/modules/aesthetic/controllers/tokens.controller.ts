import { Request, Response } from 'express'
import { AestheticToken } from '../models/Token'
import { ProcedureSession } from '../models/ProcedureSession'
import { AestheticCounter } from '../models/Counter'
import { LabPatient } from '../../lab/models/Patient'
import { LabCounter } from '../../lab/models/Counter'
import { HospitalSettings } from '../../hospital/models/Settings'

function dateKey(dateIso?: string){
  const d = dateIso ? new Date(dateIso) : new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  return `${y}${m}${dd}`
}

async function allocNumber(dateIso?: string){
  const key = `aesthetic_tok_${dateKey(dateIso)}`
  const c = await AestheticCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  return c.seq || 1
}

function normDigits(s?: string){ return (s||'').replace(/\D+/g,'') }
function normLower(s?: string){ return (s||'').trim().toLowerCase().replace(/\s+/g,' ') }
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
    out = out.replace(/\{DEPT\}/gi, 'AEST')
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

async function ensureLabPatient(body: any){
  const name = String(body.patientName||'')
  const guardianName = String(body.guardianName||'')
  const phoneN = normDigits(body.phone)
  const cnicN = normDigits(body.cnic)
  const nameN = normLower(name)
  const fatherN = normLower(guardianName)
  const mrnRaw = String(body.mrNumber||'').trim()
  if (mrnRaw){
    const byMrn: any = await LabPatient.findOne({ mrn: mrnRaw }).lean()
    if (byMrn){
      const patch: any = {}
      if (phoneN && byMrn.phoneNormalized !== phoneN) patch.phoneNormalized = phoneN
      if (cnicN && byMrn.cnicNormalized !== cnicN) patch.cnicNormalized = cnicN
      if (Object.keys(patch).length) await LabPatient.findByIdAndUpdate(byMrn._id, { $set: patch })
      return (await LabPatient.findById(byMrn._id).lean()) as any
    }
  }
  if (cnicN){
    const pat: any = await LabPatient.findOne({ cnicNormalized: cnicN }).lean()
    if (pat){
      if (phoneN && pat.phoneNormalized !== phoneN) await LabPatient.findByIdAndUpdate(pat._id, { $set: { phoneNormalized: phoneN } })
      return await LabPatient.findById(pat._id).lean()
    }
  }
  if (nameN && fatherN){
    const rxName = new RegExp(`^${nameN.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}$`, 'i')
    const rxFath = new RegExp(`^${fatherN.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}$`, 'i')
    const matches: any[] = await LabPatient.find({ fullName: rxName, fatherName: rxFath }).lean()
    if (matches.length === 1){
      const m = matches[0]
      const patch: any = {}
      if (phoneN && m.phoneNormalized !== phoneN) patch.phoneNormalized = phoneN
      if (cnicN && m.cnicNormalized !== cnicN) patch.cnicNormalized = cnicN
      if (Object.keys(patch).length) await LabPatient.findByIdAndUpdate(m._id, { $set: patch })
      return await LabPatient.findById(m._id).lean()
    }
  }
  if (phoneN){
    const phoneMatches: any[] = await LabPatient.find({ phoneNormalized: phoneN }).lean()
    if (phoneMatches.length === 1){
      const m = phoneMatches[0]
      const nameMatches = !!nameN && normLower(m.fullName) === nameN
      const fatherMatches = !fatherN || normLower(m.fatherName as any) === fatherN
      if (nameMatches && fatherMatches) return m
    } else if (phoneMatches.length > 1){
      const exact = phoneMatches.find(pm => normLower(pm.fullName) === nameN && (!fatherN || normLower(pm.fatherName as any) === fatherN))
      if (exact) return exact
    }
  }
  const mrn = await nextMrn()
  const nowIso = new Date().toISOString()
  const created = await LabPatient.create({
    mrn,
    fullName: name || 'Unknown',
    fatherName: guardianName || undefined,
    phoneNormalized: phoneN || undefined,
    cnicNormalized: cnicN || undefined,
    gender: body.gender,
    age: body.age,
    guardianRel: body.guardianRelation,
    address: body.address,
    createdAtIso: nowIso,
  })
  return created.toObject()
}

export async function nextNumber(req: Request, res: Response){
  const date = String((req.query as any).date || '') || new Date().toISOString().slice(0,10)
  const key = `aesthetic_tok_${dateKey(date)}`
  const c: any = await AestheticCounter.findById(key).lean()
  const next = (c?.seq || 0) + 1
  res.json({ next })
}

export async function create(req: Request, res: Response){
  const body = (req.body || {}) as any
  const nowIso = new Date().toISOString()
  const dateIso = typeof body.date === 'string' && body.date ? body.date : nowIso
  const number = await allocNumber(dateIso)
  const fee = Number(body.fee || 0)
  const discount = Number(body.discount || 0)
  let payable = body.payable != null ? Number(body.payable) : Math.max(fee - discount, 0)

  let labPatient: any | undefined
  try {
    labPatient = await ensureLabPatient(body)
  } catch {}

  // Optional: If linked to a procedure session, treat today's deposit as payable and update session ledger
  let procedureSessionId: string | undefined
  let procedurePrice: number | undefined
  let procedureDiscount: number | undefined
  let procedurePaidToday: number | undefined
  let procedurePaidToDate: number | undefined
  let procedureBalanceAfter: number | undefined

  if (body.procedureSessionId){
    const sid = String(body.procedureSessionId)
    const s: any = await ProcedureSession.findById(sid)
    if (s){
      const deposit = Math.max(0, Number(body.depositToday || body.payable || 0))
      if (deposit > 0){
        const by = String(((req as any)?.user?.username || (req as any)?.user?.name || 'admin'))
        const pay = { amount: deposit, method: String(body.method || 'Cash'), dateIso: nowIso, note: String(body.note || ''), by }
        s.payments = [ ...(s.payments || []), pay ]
        s.paid = Number(s.paid || 0) + deposit
        s.balance = Math.max(0, Number(s.price||0) - Number(s.discount||0) - Number(s.paid||0))
        await s.save()
      }
      procedureSessionId = sid
      procedurePrice = Number(s.price || 0)
      procedureDiscount = Number(s.discount || 0)
      procedurePaidToday = Math.max(0, Number(body.depositToday || 0))
      procedurePaidToDate = Number(s.paid || 0)
      procedureBalanceAfter = Number(s.balance || 0)
      payable = procedurePaidToday ?? payable
    }
  }

  const doc = await AestheticToken.create({
    number,
    date: dateIso,
    patientName: body.patientName,
    phone: body.phone,
    mrNumber: body.mrNumber || (labPatient?.mrn || undefined),
    age: body.age,
    gender: body.gender,
    address: body.address,
    guardianRelation: body.guardianRelation,
    guardianName: body.guardianName,
    cnic: body.cnic,
    doctorId: body.doctorId,
    apptDate: body.apptDate,
    fee,
    discount,
    payable,
    procedureSessionId,
    procedurePrice,
    procedureDiscount,
    procedurePaidToday,
    procedurePaidToDate,
    procedureBalanceAfter,
    status: body.status || 'queued',
    createdAtIso: nowIso,
  })
  res.status(201).json({ token: doc })
}

export async function list(req: Request, res: Response){
  const q = (req.query || {}) as any
  const from = String(q.from || '')
  const to = String(q.to || '')
  const doctorId = String(q.doctorId || '')
  const search = String(q.search || '')
  const page = Math.max(1, Number(q.page || 1))
  const limit = Math.max(1, Math.min(200, Number(q.limit || 50)))

  const filter: any = {}
  if (from || to){
    const fromIso = (from ? new Date(from+'T00:00:00.000Z') : new Date(0)).toISOString()
    const toIso = (to ? new Date(to+'T23:59:59.999Z') : new Date()).toISOString()
    filter.date = { $gte: fromIso, $lte: toIso }
  }
  if (doctorId) filter.doctorId = doctorId
  if (search){
    const rx = new RegExp(search.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'), 'i')
    const num = Number.isFinite(Number(search)) ? Number(search) : undefined
    filter.$or = [
      { patientName: rx },
      { phone: rx },
      ...(num!=null ? [{ number: num }] : []),
    ]
  }

  const total = await AestheticToken.countDocuments(filter)
  const items = await AestheticToken.find(filter).sort({ date: -1, number: -1 }).skip((page-1)*limit).limit(limit).lean()
  res.json({ items, total, totalPages: Math.max(1, Math.ceil(total/limit)) })
}
