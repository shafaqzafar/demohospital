import { Request, Response } from 'express'
import { z } from 'zod'
import { AestheticFinanceJournal } from '../models/FinanceJournal'
import { createDoctorPayout, manualDoctorEarning, computeDoctorBalance, reverseJournalById } from './finance_ledger'
import { AuditLog } from '../models/AuditLog'

function getActor(req: Request){
  const u: any = (req as any).user || {}
  return { actorId: String(u.sub||''), actorUsername: String(u.username||''), actorRole: String(u.role||'') }
}

const manualDoctorEarningSchema = z.object({
  doctorId: z.string().min(1),
  amount: z.number().positive(),
  revenueAccount: z.enum(['OPD_REVENUE','PROCEDURE_REVENUE','IPD_REVENUE']).optional(),
  paidMethod: z.enum(['Cash','Bank','AR']).optional(),
  memo: z.string().optional(),
  patientName: z.string().optional(),
  mrn: z.string().optional(),
})

const doctorPayoutSchema = z.object({
  doctorId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['Cash','Bank']).default('Cash'),
  memo: z.string().optional(),
})

export async function postManualDoctorEarning(req: Request, res: Response){
  const data = manualDoctorEarningSchema.parse(req.body)
  const j = await manualDoctorEarning(data)
  try {
    const actor = getActor(req) as any
    await AuditLog.create({ actor: String(actor.actorUsername||'unknown'), action: 'aesthetic.finance.manual_doctor_earning', label: 'AESTHETIC_FINANCE_MANUAL_EARNING', path: req.path, method: req.method, at: new Date().toISOString(), detail: JSON.stringify({ doctorId: data.doctorId, amount: data.amount, journalId: String((j as any)?._id||'') }) })
  } catch {}
  res.status(201).json({ journal: j })
}

export async function reverseJournal(req: Request, res: Response){
  const id = String(req.params.id)
  const memo = String((req.body as any)?.memo || '')
  const r = await reverseJournalById(id, memo)
  if (!r) return res.status(404).json({ error: 'Journal not found' })
  try {
    const actor = getActor(req) as any
    await AuditLog.create({ actor: String(actor.actorUsername||'unknown'), action: 'aesthetic.finance.reverse_journal', label: 'AESTHETIC_FINANCE_REVERSE', path: req.path, method: req.method, at: new Date().toISOString(), detail: JSON.stringify({ journalId: id }) })
  } catch {}
  res.json({ reversed: r })
}

export async function listDoctorEarnings(req: Request, res: Response){
  const doctorId = (req.query as any)?.doctorId ? String((req.query as any).doctorId) : undefined
  const from = String((req.query as any)?.from || '')
  const to = String((req.query as any)?.to || '')
  const matchDate = (from && to) ? { dateIso: { $gte: from, $lte: to } } : {}
  const matchDoctor = doctorId ? { 'lines.tags.doctorId': String(doctorId) } : {}
  const rows = await AestheticFinanceJournal.aggregate([
    { $match: { ...matchDate } },
    { $addFields: { allLines: '$lines' } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', 'lines.credit': { $gt: 0 }, ...(doctorId? matchDoctor : {}) } },
    { $lookup: {
        from: 'aesthetic_finance_journals',
        let: { origId: '$_id' },
        pipeline: [ { $match: { $expr: { $eq: ['$refId', { $toString: '$$origId' }] } } } ],
        as: 'reversals'
      }
    },
    { $addFields: { _revCount: { $size: '$reversals' } } },
    { $match: { _revCount: { $eq: 0 } } },
    { $addFields: {
        revenueLine: {
          $arrayElemAt: [
            { $filter: { input: '$allLines', as: 'l', cond: { $in: ['$$l.account', ['OPD_REVENUE','IPD_REVENUE','PROCEDURE_REVENUE']] } } },
            0
          ]
        }
      }
    },
    { $project: { _id: 1, dateIso: 1, refType: 1, refId: 1, memo: 1, line: '$lines', revenueAccount: '$revenueLine.account' } },
    { $sort: { dateIso: -1, _id: -1 } },
    { $limit: 500 },
  ])
  const items = rows.map((r: any) => ({
    id: String(r._id),
    dateIso: r.dateIso,
    doctorId: r.line?.tags?.doctorId ? String(r.line.tags.doctorId) : undefined,
    type: r.refType === 'opd_token' ? 'OPD' : (r.revenueAccount === 'PROCEDURE_REVENUE' ? 'Procedure' : (r.revenueAccount === 'IPD_REVENUE' ? 'IPD' : 'OPD')),
    amount: Number(r.line.credit || 0),
    memo: r.memo,
  }))
  res.json({ earnings: items })
}

export async function postDoctorPayout(req: Request, res: Response){
  const data = doctorPayoutSchema.parse(req.body)
  const j = await createDoctorPayout(data.doctorId, data.amount, data.method, data.memo)
  try {
    const actor = getActor(req) as any
    await AuditLog.create({ actor: String(actor.actorUsername||'unknown'), action: 'aesthetic.finance.doctor_payout', label: 'AESTHETIC_FINANCE_PAYOUT', path: req.path, method: req.method, at: new Date().toISOString(), detail: JSON.stringify({ doctorId: data.doctorId, amount: data.amount, journalId: String((j as any)?._id||'') }) })
  } catch {}
  res.status(201).json({ journal: j })
}

export async function getDoctorBalance(req: Request, res: Response){
  const id = String(req.params.id)
  const balance = await computeDoctorBalance(id)
  res.json({ doctorId: id, payable: balance })
}

export async function listDoctorPayouts(req: Request, res: Response){
  const id = String(req.params.id)
  const limit = Math.min(parseInt(String((req.query as any)?.limit || '20')) || 20, 100)
  const rows = await AestheticFinanceJournal.find({ refType: 'doctor_payout', refId: id }).sort({ createdAt: -1 }).limit(limit).lean()
  const items = rows.map((j: any) => {
    const cash = (j.lines || [])
      .filter((l: any) => l.account === 'CASH' || l.account === 'BANK')
      .reduce((s: number, l: any) => s + (l.credit || 0), 0)
    const amount = cash || (j.lines || [])
      .filter((l: any) => l.account === 'DOCTOR_PAYABLE')
      .reduce((s: number, l: any) => s + (l.debit || 0), 0)
    return { id: String(j._id), refId: j.refId, dateIso: j.dateIso, memo: j.memo, amount }
  })
  res.json({ payouts: items })
}

export async function listRecentPayouts(req: Request, res: Response){
  const limit = Math.min(parseInt(String((req.query as any)?.limit || '20')) || 20, 100)
  const rows = await AestheticFinanceJournal.find({ refType: 'doctor_payout' }).sort({ createdAt: -1 }).limit(limit).lean()
  const items = rows.map((j: any) => {
    const cash = (j.lines || [])
      .filter((l: any) => l.account === 'CASH' || l.account === 'BANK')
      .reduce((s: number, l: any) => s + (l.credit || 0), 0)
    const amount = cash || (j.lines || [])
      .filter((l: any) => l.account === 'DOCTOR_PAYABLE')
      .reduce((s: number, l: any) => s + (l.debit || 0), 0)
    return { id: String(j._id), doctorId: j.refId, dateIso: j.dateIso, memo: j.memo, amount }
  })
  res.json({ payouts: items })
}

export async function payablesSummary(_req: Request, res: Response){
  const rows: any[] = await AestheticFinanceJournal.aggregate([
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE' } },
    { $group: { _id: null, credits: { $sum: { $ifNull: ['$lines.credit', 0] } }, debits: { $sum: { $ifNull: ['$lines.debit', 0] } } } },
  ])
  const credits = Number(rows?.[0]?.credits || 0)
  const debits = Number(rows?.[0]?.debits || 0)
  const totalPayable = Math.round((credits - debits + Number.EPSILON) * 100) / 100
  res.json({ totalPayable })
}
