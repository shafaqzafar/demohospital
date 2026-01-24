import { Request, Response } from 'express'
import { LabPatient } from '../models/Patient'
import { LabCounter } from '../models/Counter'
import { HospitalSettings } from '../../hospital/models/Settings'
import { patientFindOrCreateSchema } from '../validators/patient'

function normDigits(s?: string){ return (s||'').replace(/\D+/g,'') }

export async function getByMrn(req: Request, res: Response){
  const mrn = String((req.query as any).mrn || '').trim()
  if (!mrn) return res.status(400).json({ message: 'Validation failed', issues: [{ path: ['mrn'], message: 'mrn is required' }] })
  const pat = await LabPatient.findOne({ mrn }).lean()
  if (!pat) return res.status(404).json({ error: 'Patient not found' })
  res.json({ patient: pat })
}
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

  // Fetch hospital settings for MRN format
  let fmt = ''
  let hospCode = ''
  try {
    const s: any = await HospitalSettings.findOne().lean()
    fmt = String(s?.mrFormat || '').trim()
    hospCode = String(s?.code || '').trim()
  } catch {}

  // Build MRN using format if provided; else fallback to legacy
  if (fmt) {
    const widthMatch = fmt.match(/\{SERIAL(\d+)\}/i)
    const width = widthMatch ? Math.max(1, parseInt(widthMatch[1], 10) || 6) : 6
    const serial = String(seqNum).padStart(width, '0')
    let out = fmt
    out = out.replace(/\{HOSP\}/gi, hospCode || 'HOSP')
    out = out.replace(/\{DEPT\}/gi, 'LAB')
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

export async function findOrCreate(req: Request, res: Response){
  const data = patientFindOrCreateSchema.parse(req.body)
  const cnicN = normDigits(data.cnic)
  const phoneN = normDigits(data.phone)
  const nameN = normLower(data.fullName)
  const fatherN = normLower(data.guardianName)

  if (data.selectId){
    const pat = await LabPatient.findById(data.selectId).lean()
    if (!pat) return res.status(404).json({ error: 'Patient not found' })
    return res.json({ patient: pat })
  }

  if (cnicN){
    const pat = await LabPatient.findOne({ cnicNormalized: cnicN }).lean()
    if (pat) return res.json({ patient: pat })
  }

  // Prefer exact match on name + guardian first to avoid mixing different people sharing a phone
  if (nameN && fatherN){
    const rxName = new RegExp(`^${nameN.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}$`, 'i')
    const rxFath = new RegExp(`^${fatherN.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}$`, 'i')
    const matches = await LabPatient.find({ fullName: rxName, fatherName: rxFath }).lean()
    if (matches.length === 1){
      const m = matches[0]
      const patch: any = {}
      if (phoneN && m.phoneNormalized !== phoneN) patch.phoneNormalized = phoneN
      if (cnicN && m.cnicNormalized !== cnicN) patch.cnicNormalized = cnicN
      if (Object.keys(patch).length){
        const upd = await LabPatient.findByIdAndUpdate(m._id, { $set: patch }, { new: true })
        return res.json({ patient: upd || m })
      }
      return res.json({ patient: m })
    } else if (matches.length > 1){
      const brief = matches.map(m=>({ _id: m._id, mrn: m.mrn, fullName: m.fullName, fatherName: m.fatherName, phone: m.phoneNormalized, cnic: m.cnicNormalized }))
      return res.json({ matches: brief, needSelection: true })
    }
  }

  // Fall back to phone only: reuse existing MRN ONLY if the name matches. Otherwise create a new MRN.
  if (phoneN){
    const phoneMatches = await LabPatient.find({ phoneNormalized: phoneN }).lean()
    if (phoneMatches.length === 1){
      const pm = phoneMatches[0]
      const pmName = normLower(pm.fullName)
      const pmFather = normLower(pm.fatherName as any)
      const nameMatches = !!nameN && pmName === nameN
      const fatherMatches = !fatherN || pmFather === fatherN
      if (nameMatches && fatherMatches){
        return res.json({ patient: pm })
      }
      // else: do not reuse MRN; proceed to create new
    } else if (phoneMatches.length > 1){
      // If one of the phone matches has the same name (and guardian if provided), reuse it; else create new
      const exact = phoneMatches.find(pm => normLower(pm.fullName) === nameN && (!fatherN || normLower(pm.fatherName as any) === fatherN))
      if (exact) return res.json({ patient: exact })
      // Otherwise fall through to create new MRN to avoid mixing
    }
  }

  const mrn = await nextMrn()
  const nowIso = new Date().toISOString()
  const pat = await LabPatient.create({
    mrn,
    fullName: data.fullName,
    fatherName: data.guardianName,
    phoneNormalized: phoneN || undefined,
    cnicNormalized: cnicN || undefined,
    gender: data.gender,
    age: data.age,
    guardianRel: data.guardianRel,
    address: data.address,
    createdAtIso: nowIso,
  })
  res.status(201).json({ patient: pat })
}

export async function search(req: Request, res: Response){
  const phone = normDigits(String((req.query as any).phone || ''))
  const name = normLower(String((req.query as any).name || ''))
  const limit = Math.max(1, Math.min(50, Number((req.query as any).limit || 10)))
  const filter: any = {}
  if (phone) filter.phoneNormalized = new RegExp(phone)
  if (name) filter.fullName = new RegExp(name, 'i')
  if (!phone && !name) return res.json({ patients: [] })
  const pats = await LabPatient.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
  res.json({ patients: pats })
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const body = (req.body || {}) as any
  const patch: any = {}
  if (typeof body.fullName === 'string') patch.fullName = body.fullName
  if (typeof body.fatherName === 'string') patch.fatherName = body.fatherName
  if (typeof body.gender === 'string') patch.gender = body.gender
  if (typeof body.address === 'string') patch.address = body.address
  if (typeof body.phone === 'string') patch.phoneNormalized = normDigits(body.phone)
  if (typeof body.cnic === 'string') patch.cnicNormalized = normDigits(body.cnic)
  const doc = await LabPatient.findByIdAndUpdate(id, { $set: patch }, { new: true })
  if (!doc) return res.status(404).json({ error: 'Patient not found' })
  res.json({ patient: doc })
}
