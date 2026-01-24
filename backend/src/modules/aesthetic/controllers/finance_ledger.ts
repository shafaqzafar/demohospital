import { AestheticFinanceJournal, type JournalLine } from '../models/FinanceJournal'
import { AestheticDoctor } from '../models/Doctor'

function todayIso(){
  return new Date().toISOString().slice(0,10)
}

function round2(n: number){
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function computeDoctorBalance(doctorId: string){
  const rows: any[] = await AestheticFinanceJournal.aggregate([
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', 'lines.tags.doctorId': String(doctorId) } },
    { $group: { _id: null, credits: { $sum: { $ifNull: ['$lines.credit', 0] } }, debits: { $sum: { $ifNull: ['$lines.debit', 0] } } } },
  ])
  const credits = Number(rows?.[0]?.credits || 0)
  const debits = Number(rows?.[0]?.debits || 0)
  return round2(credits - debits)
}

export async function createDoctorPayout(doctorId: string, amount: number, method: 'Cash'|'Bank' = 'Cash', memo?: string){
  const dateIso = todayIso()
  const tags = { doctorId: String(doctorId) }
  const lines: JournalLine[] = [
    { account: 'DOCTOR_PAYABLE', debit: amount, tags },
    { account: method === 'Bank' ? 'BANK' : 'CASH', credit: amount, tags },
  ]
  return await AestheticFinanceJournal.create({ dateIso, refType: 'doctor_payout', refId: doctorId, memo: memo || 'Doctor payout', lines })
}

export async function manualDoctorEarning(data: { doctorId: string; amount: number; revenueAccount?: 'OPD_REVENUE'|'PROCEDURE_REVENUE'|'IPD_REVENUE'; paidMethod?: 'Cash'|'Bank'|'AR'; memo?: string; patientName?: string; mrn?: string }){
  const dateIso = todayIso()
  const doctorAmount = round2(Math.max(data.amount || 0, 0))
  const tagsBase: any = { doctorId: String(data.doctorId) }
  if (data.patientName) tagsBase.patientName = data.patientName
  if (data.mrn) tagsBase.mrn = data.mrn

  const lines: JournalLine[] = [
    { account: 'DOCTOR_SHARE_EXPENSE', debit: doctorAmount, tags: { ...tagsBase } },
    { account: 'DOCTOR_PAYABLE', credit: doctorAmount, tags: { ...tagsBase } },
  ]
  return await AestheticFinanceJournal.create({ dateIso, refType: 'manual_doctor_earning', refId: data.doctorId, memo: data.memo, lines })
}

export async function reverseJournalById(journalId: string, memo?: string){
  const j: any = await AestheticFinanceJournal.findById(journalId).lean()
  if (!j) return null
  const revLines: JournalLine[] = []
  for (const l of (j.lines || [])){
    revLines.push({ account: l.account, debit: l.credit || 0, credit: l.debit || 0, tags: l.tags })
  }
  const r = await AestheticFinanceJournal.create({ dateIso: todayIso(), refType: `${j.refType || 'journal'}_reversal`, refId: String(j._id), memo: memo || `Reversal for journal ${j._id}` , lines: revLines })
  return r
}

export async function reverseJournalByRef(refType: string, refId: string, memo?: string){
  const list = await AestheticFinanceJournal.find({ refType, refId }).lean()
  if (!list.length) return null
  const revLines: JournalLine[] = []
  for (const j of list){
    for (const l of (j.lines || [])){
      revLines.push({ account: l.account, debit: l.credit || 0, credit: l.debit || 0, tags: l.tags })
    }
  }
  const r = await AestheticFinanceJournal.create({ dateIso: todayIso(), refType: `${refType}_reversal`, refId, memo: memo || `Reversal for ${refType}:${refId}`, lines: revLines })
  return r
}

export async function postProcedureSessionAccrual(args: { sessionId: string; dateIso: string; doctorId?: string; patientName?: string; mrn?: string; procedureName?: string; price?: number; discount?: number; sharePercent?: number; memo?: string }){
  // Idempotent: avoid duplicate for same session unless reversed
  const existing = await AestheticFinanceJournal.findOne({ refType: 'aesthetic_procedure_session', refId: args.sessionId }).lean()
  if (existing) return existing as any
  const doc: any = args.doctorId ? await AestheticDoctor.findById(args.doctorId).lean() : null
  const percent = (args.sharePercent != null) ? args.sharePercent : ((doc as any)?.shares ?? 100)
  const net = Math.max(0, Number(args.price||0) - Number(args.discount||0))
  const share = round2(net * (Math.max(Number(percent)||0,0) / 100))
  const tags: any = { }
  if (args.doctorId) tags.doctorId = String(args.doctorId)
  if (args.patientName) tags.patientName = args.patientName
  if (args.mrn) tags.mrn = args.mrn
  if (args.sessionId) tags.sessionId = String(args.sessionId)
  if (args.procedureName) tags.procedureName = args.procedureName
  const lines: JournalLine[] = [
    { account: 'DOCTOR_SHARE_EXPENSE', debit: share, tags: { ...tags } },
    { account: 'DOCTOR_PAYABLE', credit: share, tags: { ...tags } },
  ]
  const memo = args.memo || `Procedure session${args.procedureName? `: ${args.procedureName}`: ''}`
  return await AestheticFinanceJournal.create({ dateIso: args.dateIso || todayIso(), refType: 'aesthetic_procedure_session', refId: args.sessionId, memo, lines })
}
