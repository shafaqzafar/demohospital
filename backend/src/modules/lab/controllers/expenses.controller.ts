import { Request, Response } from 'express'
import { LabExpense } from '../models/Expense'
import { expenseCreateSchema, expenseQuerySchema } from '../validators/expense'
import { LabAuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response) {
  const q = expenseQuerySchema.safeParse(req.query)
  const { from, to, minAmount, search, type, page, limit } = q.success ? q.data as any : {}
  const filter: any = {}
  if (from || to) {
    filter.date = {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  if (minAmount) filter.amount = { $gte: minAmount }
  if (type) filter.type = type
  if (search) {
    const rx = new RegExp(search, 'i')
    filter.$or = [ { note: rx }, { type: rx } ]
  }
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await LabExpense.countDocuments(filter)
  const items = await LabExpense.find(filter).sort({ date: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response) {
  const data = expenseCreateSchema.parse(req.body)
  const e = await LabExpense.create(data)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Add Expense',
      label: 'ADD_EXPENSE',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${e.type || ''} — Rs ${Number(e.amount||0).toFixed(2)}${e.note? ' — '+e.note : ''}`,
    })
  } catch {}
  res.status(201).json(e)
}

export async function remove(req: Request, res: Response) {
  const id = req.params.id
  await LabExpense.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function summary(req: Request, res: Response){
  const q = expenseQuerySchema.safeParse(req.query)
  const { from, to } = q.success ? q.data : {}
  const match: any = {}
  if (from || to){
    match.date = {}
    if (from) match.date.$gte = from
    if (to) match.date.$lte = to
  }
  const agg = await LabExpense.aggregate([
    { $match: match },
    { $group: { _id: null, totalAmount: { $sum: { $ifNull: ['$amount', 0] } }, count: { $sum: 1 } } }
  ])
  const totalAmount = agg[0]?.totalAmount || 0
  const count = agg[0]?.count || 0
  res.json({ totalAmount: Number(totalAmount.toFixed(2)), count })
}
